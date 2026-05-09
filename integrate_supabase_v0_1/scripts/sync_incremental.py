#!/usr/bin/env python3
"""
Incremental SQLite → Postgres mirror for the 14-day shadow window.

Runs after each legacy sixis.py invocation (and optionally as a launchd cron
fallback). Mirrors any new events + updated projection rows to Postgres.
Idempotent — safe to re-run.

Strategy:
  - events: insert any rows missing in Postgres, ordered by timestamp.
    The append-only invariant means events never UPDATE; new rows just
    accumulate. We compare on id.
  - projection tables (projects, cycles, rounds, polls, rules, amendments,
    sessions, session_handoff_items): UPSERT every row (ON CONFLICT (id)
    DO UPDATE). Cheap because total rows are O(thousands).

Usage:
  python3 sync_incremental.py
  python3 sync_incremental.py --silent              # suppress progress
  python3 sync_incremental.py --since 2026-05-07T18:00:00Z
                                                    # only events newer than this

Env:
  SIXIS_DATABASE_URL  — Postgres DSN
  SIXIS_SQLITE_PATH   — SQLite path (default: dashboard_v0_1/sixis_dashboard.db)
  SIXIS_DUAL_WRITE    — set to "1" to enable; if unset, exits silently with 0
                         (so this can be safely called unconditionally from
                         sixis.py's main without affecting users not on shadow)
"""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
import uuid
from contextlib import closing
from datetime import datetime
from pathlib import Path
from typing import Any

import psycopg
from psycopg.rows import dict_row

NAMESPACE = uuid.UUID("00000000-5158-4953-5158-000000000001")

DEFAULT_SQLITE = os.path.expanduser(
    "~/Documents/Claude/Projects/SixiS/projects/dashboard_v0_1/sixis_dashboard.db"
)


def _to_uuid(v: Any) -> uuid.UUID | None:
    if v is None:
        return None
    if isinstance(v, uuid.UUID):
        return v
    s = str(v)
    try:
        return uuid.UUID(s)
    except ValueError:
        return uuid.uuid5(NAMESPACE, s)


def _load_dotenv() -> None:
    env_path = Path(__file__).parent.parent / ".env"
    if not env_path.exists():
        return
    for raw in env_path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())


def sync_events(src: sqlite3.Connection, dst: psycopg.Connection,
                since: datetime | None = None) -> int:
    """Insert any events present in SQLite but missing in Postgres."""
    where = ""
    params: tuple = ()
    if since is not None:
        where = "WHERE timestamp >= ?"
        params = (since.isoformat(),)

    src.row_factory = sqlite3.Row
    rows = list(src.execute(f"SELECT * FROM events {where} ORDER BY timestamp", params))

    inserted = 0
    with dst.transaction():
        with dst.cursor() as cur:
            cur.execute("SET CONSTRAINTS ALL DEFERRED")
            for r in rows:
                metadata = r["metadata"]
                payload: dict[str, Any] = {}
                if metadata:
                    try:
                        parsed = json.loads(metadata)
                        payload = parsed if isinstance(parsed, dict) else {"_legacy_metadata": parsed}
                    except (json.JSONDecodeError, TypeError):
                        payload = {"_raw_metadata": metadata}

                cur.execute(
                    """
                    INSERT INTO events (id, cycle_id, round_id, project_id, rule_id,
                                         type, source, payload, description,
                                         caused_by_event_id, occurred_at, recorded_at)
                    VALUES (%s, %s, %s, NULL, %s,
                            %s, %s, %s, %s,
                            %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    (
                        _to_uuid(r["id"]),
                        _to_uuid(r["cycle_id"]),
                        _to_uuid(r["round_id"]),
                        _to_uuid(r["rule_id"]),
                        r["type"], r["source"],
                        json.dumps(payload),
                        r["description"],
                        _to_uuid(r["related_event_id"]),
                        r["timestamp"], r["timestamp"],
                    ),
                )
                inserted += cur.rowcount or 0
    return inserted


def _quote(col: str) -> str:
    """Quote any Postgres-reserved column names (e.g., user)."""
    reserved = {"user", "session", "type", "default", "order", "group"}
    return f'"{col}"' if col.lower() in reserved else col


def upsert_table(src: sqlite3.Connection, dst: psycopg.Connection,
                 table: str, columns: list[str], pg_types: dict[str, str] | None = None,
                 pk: str = "id") -> tuple[int, int]:
    """UPSERT every row from SQLite into Postgres for one projection table.
    Each table runs in its own transaction so a failure on one doesn't cascade.
    Returns (inserted, updated)."""
    src.row_factory = sqlite3.Row
    rows = list(src.execute(f"SELECT {', '.join(_quote(c) for c in columns)} FROM {table}"))
    if not rows:
        return (0, 0)

    inserted = updated = 0
    with dst.transaction():
        with dst.cursor() as cur:
            for r in rows:
                values: list[Any] = []
                for col in columns:
                    v = r[col]
                    if pg_types and pg_types.get(col) == "uuid":
                        v = _to_uuid(v)
                    elif pg_types and pg_types.get(col) == "bool" and v is not None:
                        v = bool(int(v))
                    elif pg_types and pg_types.get(col) == "json" and v is not None:
                        try:
                            json.loads(v)
                        except (json.JSONDecodeError, TypeError):
                            v = json.dumps(v) if not isinstance(v, str) else v
                    values.append(v)

                non_pk_cols = [c for c in columns if c != pk]
                col_list = ", ".join(_quote(c) for c in columns)
                placeholders = ", ".join(["%s"] * len(columns))
                update_clause = ", ".join(
                    f"{_quote(c)} = excluded.{_quote(c)}" for c in non_pk_cols
                )

                sql = (
                    f"INSERT INTO {table} ({col_list}) "
                    f"VALUES ({placeholders}) "
                    f"ON CONFLICT ({pk}) DO UPDATE SET {update_clause} "
                    f"RETURNING (xmax = 0) AS was_inserted"
                )
                cur.execute(sql, values)
                row = cur.fetchone()
                if row and row.get("was_inserted"):
                    inserted += 1
                else:
                    updated += 1
    return (inserted, updated)


# Per-table column maps. Each entry: (table, columns_to_sync, type_overrides).
PROJECTION_SPECS = [
    ("projects",
     ["id", "name", "slug", "description", "archetype", "owner", "status", "started_at", "ended_at"],
     {"id": "uuid"}),
    ("cycles",
     ["id", "project_id", "intent", "archetype", "tier", "protocol_version",
      "started_at", "ended_at", "outcome"],
     {"id": "uuid", "project_id": "uuid"}),
    ("rounds",
     ["id", "cycle_id", "round_number", "summary", "locked_artifact_ref", "converged_at"],
     {"id": "uuid", "cycle_id": "uuid"}),
    ("polls",
     ["id", "cycle_id", "round_id", "question", "initiated_by", "initiated_at",
      "initiated_event_id", "converged_at", "converged_event_id", "convergence_summary",
      "round_2_triggered", "forced_rule_id", "reopens_poll_id", "backfilled", "tier"],
     {"id": "uuid", "cycle_id": "uuid", "round_id": "uuid",
      "initiated_event_id": "uuid", "converged_event_id": "uuid",
      "forced_rule_id": "uuid", "reopens_poll_id": "uuid",
      "round_2_triggered": "bool", "backfilled": "bool"}),
    ("rules",
     ["id", "rule_name", "description", "layer", "scope", "added_in_version",
      "source_event_id", "source_project_id", "status", "added_at", "removed_at",
      "notes", "effective_from", "kind", "stable_id", "source_path", "source_version"],
     {"id": "uuid", "source_event_id": "uuid", "source_project_id": "uuid"}),
    ("amendments",
     ["id", "proposal_summary", "rationale", "proposed_at", "proposed_by",
      "ratified_at", "ratified_by", "status", "target_version", "target_layer",
      "target_project_id", "source_event_id"],
     {"id": "uuid", "target_project_id": "uuid", "source_event_id": "uuid"}),
    ("sessions",
     ["id", "started_at", "ended_at", "last_heartbeat", "status", "user",
      "parent_session_id", "originating_project_id", "scope_projects", "notes"],
     {"id": "uuid", "parent_session_id": "uuid", "originating_project_id": "uuid",
      "scope_projects": "json"}),
    ("session_handoff_items",
     ["id", "session_handoff_event_id", "type", "text", "status",
      "resolved_in_session_id", "resolved_at", "resolved_event_id", "created_at"],
     {"id": "uuid", "session_handoff_event_id": "uuid",
      "resolved_in_session_id": "uuid", "resolved_event_id": "uuid"}),
]


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--silent", action="store_true")
    p.add_argument("--since", default=None)
    args = p.parse_args()

    _load_dotenv()

    if os.environ.get("SIXIS_DUAL_WRITE", "1") == "0":
        return 0  # explicit opt-out (post poll ababdc1d 2026-05-08: default ON)

    sqlite_path = os.environ.get("SIXIS_SQLITE_PATH", DEFAULT_SQLITE)
    dsn = os.environ.get("SIXIS_DATABASE_URL")
    if not dsn:
        if not args.silent:
            print("[sync] SIXIS_DATABASE_URL not set; skipping", file=sys.stderr)
        return 0

    since = datetime.fromisoformat(args.since.replace("Z", "+00:00")) if args.since else None

    try:
        # Supabase transaction pooler doesn't preserve prepared statements
        # between requests. Disable client-side preparation to avoid the
        # "prepared statement already exists" error.
        with closing(sqlite3.connect(sqlite_path)) as src, \
             psycopg.connect(dsn, row_factory=dict_row, prepare_threshold=None) as dst:
            # Single outer transaction (per poll 54134263 Round 2 ratified Option A)
            # so events.rule_id <-> rules.source_event_id deferred FKs are validated
            # together at COMMIT — both rows present.
            # Projections (cycles, rounds, projects, rules) MUST be upserted BEFORE
            # events so events' FKs to those tables resolve.
            with dst.transaction():
                for table, columns, types in PROJECTION_SPECS:
                    try:
                        ins, upd = upsert_table(src, dst, table, columns, types)
                        if not args.silent and (ins or upd):
                            print(f"[sync] {table}: +{ins} upserted, {upd} updated")
                    except Exception as exc:
                        if not args.silent:
                            print(f"[sync] {table}: error — {exc}", file=sys.stderr)
                inserted = sync_events(src, dst, since)
                if not args.silent and inserted:
                    print(f"[sync] events: +{inserted}")
        return 0
    except Exception as exc:
        # Best-effort. Failures don't block the user's CLI invocation.
        Path("/tmp/sixis_sync_errors.log").open("a").write(
            f"{datetime.now().isoformat()} {exc.__class__.__name__}: {exc}\n"
        )
        if not args.silent:
            print(f"[sync] error: {exc}", file=sys.stderr)
        return 0  # don't fail caller


if __name__ == "__main__":
    sys.exit(main())
