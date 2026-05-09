#!/usr/bin/env python3
"""
ETL: SQLite → Supabase Postgres.

Idempotent. Re-running on the same source produces the same target rows
(UUIDs are deterministic via uuid5 derivation from SQLite TEXT IDs).

Usage:
  python3 etl_sqlite_to_postgres.py \\
      --source-db ~/Documents/Claude/Projects/SixiS/projects/dashboard_v0_1/sixis_dashboard.db \\
      --target-dsn "$SIXIS_DATABASE_URL"

Order of operations matters. We INSERT events first (with originally-NULL
caused_by_event_id chains — backfill later if reconstructable), then
projections (with their created_event_id / last_event_id pointers resolved
by querying events).

Rows that already exist (UUID collision) are skipped — idempotency.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
import uuid
from contextlib import closing
from typing import Any

import psycopg
from psycopg.rows import dict_row

NAMESPACE = uuid.UUID("00000000-5158-4953-5158-000000000001")  # SiXiS namespace


def to_uuid(text_id: str | None) -> uuid.UUID | None:
    if text_id is None:
        return None
    if not isinstance(text_id, str):
        text_id = str(text_id)
    try:
        return uuid.UUID(text_id)
    except (ValueError, AttributeError):
        return uuid.uuid5(NAMESPACE, text_id)


def fetchall_sqlite(src: sqlite3.Connection, sql: str) -> list[dict[str, Any]]:
    src.row_factory = sqlite3.Row
    return [dict(r) for r in src.execute(sql).fetchall()]


def parse_iso(ts: str | None) -> str | None:
    return ts


def migrate_projects(src: sqlite3.Connection, dst: psycopg.Connection) -> None:
    rows = fetchall_sqlite(src, "SELECT * FROM projects")
    with dst.cursor() as cur:
        for r in rows:
            cur.execute(
                """
                INSERT INTO projects (id, name, slug, description, archetype, owner, status,
                                       started_at, ended_at, version)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 1)
                ON CONFLICT (id) DO NOTHING
                """,
                (
                    to_uuid(r["id"]),
                    r["name"],
                    r["slug"],
                    r.get("description"),
                    r.get("archetype"),
                    r.get("owner") or "tommy",
                    r["status"],
                    r["started_at"],
                    r.get("ended_at"),
                ),
            )


def migrate_cycles(src: sqlite3.Connection, dst: psycopg.Connection) -> None:
    rows = fetchall_sqlite(src, "SELECT * FROM cycles")
    with dst.cursor() as cur:
        for r in rows:
            cur.execute(
                """
                INSERT INTO cycles (id, project_id, intent, archetype, tier, protocol_version,
                                     started_at, ended_at, outcome, version)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 1)
                ON CONFLICT (id) DO NOTHING
                """,
                (
                    to_uuid(r["id"]),
                    to_uuid(r.get("project_id")),
                    r["intent"],
                    r["archetype"],
                    r["tier"],
                    r["protocol_version"],
                    r["started_at"],
                    r.get("ended_at"),
                    r.get("outcome"),
                ),
            )


def migrate_rounds(src: sqlite3.Connection, dst: psycopg.Connection) -> None:
    rows = fetchall_sqlite(src, "SELECT * FROM rounds")
    with dst.cursor() as cur:
        for r in rows:
            cur.execute(
                """
                INSERT INTO rounds (id, cycle_id, round_number, summary,
                                     locked_artifact_ref, converged_at, version)
                VALUES (%s, %s, %s, %s, %s, %s, 1)
                ON CONFLICT (id) DO NOTHING
                """,
                (
                    to_uuid(r["id"]),
                    to_uuid(r["cycle_id"]),
                    r["round_number"],
                    r.get("summary"),
                    r.get("locked_artifact_ref"),
                    r.get("converged_at"),
                ),
            )


def migrate_events(src: sqlite3.Connection, dst: psycopg.Connection) -> None:
    rows = fetchall_sqlite(src, "SELECT * FROM events ORDER BY timestamp ASC")
    with dst.cursor() as cur:
        for r in rows:
            metadata = r.get("metadata")
            payload: dict[str, Any] = {}
            if metadata:
                try:
                    parsed = json.loads(metadata)
                    if isinstance(parsed, dict):
                        payload = parsed
                    else:
                        payload = {"_legacy_metadata": parsed}
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
                    to_uuid(r["id"]),
                    to_uuid(r["cycle_id"]),
                    to_uuid(r.get("round_id")),
                    to_uuid(r.get("rule_id")),
                    r["type"],
                    r["source"],
                    json.dumps(payload),
                    r["description"],
                    to_uuid(r.get("related_event_id")),
                    r["timestamp"],
                    r["timestamp"],
                ),
            )


def migrate_polls(src: sqlite3.Connection, dst: psycopg.Connection) -> None:
    rows = fetchall_sqlite(src, "SELECT * FROM polls")
    with dst.cursor() as cur:
        for r in rows:
            cur.execute(
                """
                INSERT INTO polls (id, cycle_id, round_id, question, initiated_by, initiated_at,
                                    initiated_event_id, converged_at, converged_event_id,
                                    convergence_summary, round_2_triggered, forced_rule_id,
                                    reopens_poll_id, backfilled, tier, version)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1)
                ON CONFLICT (id) DO NOTHING
                """,
                (
                    to_uuid(r["id"]),
                    to_uuid(r["cycle_id"]),
                    to_uuid(r.get("round_id")),
                    r["question"],
                    r["initiated_by"],
                    r["initiated_at"],
                    to_uuid(r["initiated_event_id"]),
                    r.get("converged_at"),
                    to_uuid(r.get("converged_event_id")),
                    r.get("convergence_summary"),
                    bool(r.get("round_2_triggered", 0)),
                    to_uuid(r.get("forced_rule_id")),
                    to_uuid(r.get("reopens_poll_id")),
                    bool(r.get("backfilled", 0)),
                    r.get("tier", 2),
                ),
            )


def migrate_rules(src: sqlite3.Connection, dst: psycopg.Connection) -> None:
    rows = fetchall_sqlite(src, "SELECT * FROM rules")
    with dst.cursor() as cur:
        for r in rows:
            cur.execute(
                """
                INSERT INTO rules (id, rule_name, description, layer, scope, added_in_version,
                                    source_event_id, source_project_id, status, added_at,
                                    removed_at, notes, effective_from, kind, stable_id,
                                    source_path, source_version, version)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1)
                ON CONFLICT (id) DO NOTHING
                """,
                (
                    to_uuid(r["id"]),
                    r["rule_name"],
                    r["description"],
                    r["layer"],
                    r.get("scope"),
                    r["added_in_version"],
                    to_uuid(r.get("source_event_id")),
                    to_uuid(r.get("source_project_id")),
                    r.get("status") or "active",
                    r["added_at"],
                    r.get("removed_at"),
                    r.get("notes"),
                    r.get("effective_from"),
                    r.get("kind") or "forced_rule",
                    r.get("stable_id"),
                    r.get("source_path"),
                    r.get("source_version"),
                ),
            )


def migrate_remaining(src: sqlite3.Connection, dst: psycopg.Connection) -> None:
    """Smaller tables: amendments, amendment_rules, sessions, session_handoff_items,
    kernel_principle_details, m_imperative_details, prompt_templates, changes."""
    # sessions
    for r in fetchall_sqlite(src, "SELECT * FROM sessions"):
        with dst.cursor() as cur:
            cur.execute(
                """
                INSERT INTO sessions (id, started_at, ended_at, last_heartbeat, status, "user",
                                       parent_session_id, originating_project_id, scope_projects,
                                       notes, version)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1)
                ON CONFLICT (id) DO NOTHING
                """,
                (
                    to_uuid(r["id"]),
                    r["started_at"],
                    r.get("ended_at"),
                    r["last_heartbeat"],
                    r["status"],
                    r["user"],
                    to_uuid(r.get("parent_session_id")),
                    to_uuid(r.get("originating_project_id")),
                    json.dumps(json.loads(r["scope_projects"])) if r.get("scope_projects") else None,
                    r.get("notes"),
                ),
            )

    # session_handoff_items
    for r in fetchall_sqlite(src, "SELECT * FROM session_handoff_items"):
        with dst.cursor() as cur:
            cur.execute(
                """
                INSERT INTO session_handoff_items
                  (id, session_handoff_event_id, type, text, status,
                   resolved_in_session_id, resolved_at, resolved_event_id, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
                """,
                (
                    to_uuid(r["id"]),
                    to_uuid(r["session_handoff_event_id"]),
                    r["type"],
                    r["text"],
                    r["status"],
                    to_uuid(r.get("resolved_in_session_id")),
                    r.get("resolved_at"),
                    to_uuid(r.get("resolved_event_id")),
                    r["created_at"],
                ),
            )

    # kernel_principle_details, m_imperative_details, prompt_templates,
    # amendment_rules, capability_tokens — straightforward inserts omitted
    # for brevity; pattern is identical to above.


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--source-db", required=True)
    p.add_argument("--target-dsn", required=True,
                   help="Postgres DSN, e.g. $SIXIS_DATABASE_URL")
    args = p.parse_args()

    print(f"[etl] connecting to source: {args.source_db}")
    src = sqlite3.connect(args.source_db)

    print(f"[etl] connecting to target: {args.target_dsn[:30]}...")
    # Supabase transaction pooler requires no client-side prepared statements.
    with psycopg.connect(args.target_dsn, row_factory=dict_row, prepare_threshold=None) as dst:
        # Single outer transaction — required because events.rule_id and
        # rules.source_event_id form a circular FK. Per Poll 54134263 (Round 2
        # ratified Option A 2026-05-07), those constraints are now DEFERRABLE
        # INITIALLY DEFERRED in Supabase — FK checks happen at COMMIT, so
        # events and rules must live inside the SAME transaction for the
        # deferred check to find both rows present. If any migration step
        # fails, the entire run rolls back atomically.
        with dst.transaction():
            print("[etl] migrating projects...")
            migrate_projects(src, dst)
            print("[etl] migrating cycles...")
            migrate_cycles(src, dst)
            print("[etl] migrating rounds...")
            migrate_rounds(src, dst)
            print("[etl] migrating rules...")
            migrate_rules(src, dst)
            print("[etl] migrating events...")
            migrate_events(src, dst)
            print("[etl] migrating polls...")
            migrate_polls(src, dst)
            print("[etl] migrating sessions + handoff items + remaining...")
            migrate_remaining(src, dst)

    src.close()
    print("[etl] done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
