#!/usr/bin/env python3
"""Reverse incremental sync: pull events + projection rows from canonical
Supabase into local SQLite for tables that aren't fully covered by the
forward sync (sync_incremental.py).

Why: prod writes from wizard_backend land directly in Supabase but never
flow back to SQLite. Without this script, the SQLite-fed dashboard
snapshot (data.json on dashboard.sixis.ai) misses prod-only events.

Per poll ababdc1d Round 2 synthesis (2026-05-08): SQLite is local cache,
Supabase is canonical. Bidirectional sync keeps them in agreement.

Usage:
  python3 pull_supabase_to_sqlite.py
  python3 pull_supabase_to_sqlite.py --silent
  python3 pull_supabase_to_sqlite.py --tables events,polls   # limit scope

Idempotent. Re-running on parity is a no-op.
"""

from __future__ import annotations

import argparse
import os
import sqlite3
import sys
import uuid
from contextlib import closing
from pathlib import Path

import psycopg

NAMESPACE = uuid.UUID("00000000-5158-4953-5158-000000000001")

DEFAULT_SQLITE = os.path.expanduser(
    "~/Documents/Claude/Projects/SixiS/projects/dashboard_v0_1/sixis_dashboard.db"
)


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


def _pg_id_for(sid: str) -> str:
    """Compute the Supabase UUID that corresponds to a SQLite text id.
    Mirrors the deterministic uuid5 derivation in etl_sqlite_to_postgres.py."""
    try:
        uuid.UUID(sid)
        return sid
    except Exception:
        return str(uuid.uuid5(NAMESPACE, sid))


def pull_events(src: sqlite3.Connection, dst: psycopg.Connection, silent: bool) -> int:
    """Insert into SQLite any Supabase events whose UUIDs aren't already in
    SQLite (mapped through uuid5). Uses Supabase column names mapped back to
    SQLite column names: occurred_at→timestamp, payload→metadata,
    caused_by_event_id→related_event_id."""
    sqlite_pg_ids = {_pg_id_for(r[0]) for r in src.execute("SELECT id FROM events").fetchall()}
    inserted = 0
    with dst.cursor() as cur:
        cur.execute("""
            SELECT id::text, cycle_id::text, round_id::text, rule_id::text,
                   type::text, source::text, occurred_at::text, description,
                   caused_by_event_id::text, payload::text
            FROM events ORDER BY occurred_at
        """)
        for r in cur.fetchall():
            if r[0] in sqlite_pg_ids:
                continue
            try:
                src.execute(
                    "INSERT INTO events (id, cycle_id, round_id, rule_id, type, "
                    "source, timestamp, description, related_event_id, metadata) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    r,
                )
                inserted += 1
            except sqlite3.IntegrityError as exc:
                if not silent:
                    print(f"  skip event {r[0][:8]}: {exc}", file=sys.stderr)
    return inserted


def pull_polls(src: sqlite3.Connection, dst: psycopg.Connection, silent: bool) -> int:
    sqlite_pg_ids = {_pg_id_for(r[0]) for r in src.execute("SELECT id FROM polls").fetchall()}
    inserted = 0
    with dst.cursor() as cur:
        cur.execute("""
            SELECT id::text, cycle_id::text, round_id::text, question, initiated_by,
                   initiated_at::text, initiated_event_id::text, converged_at::text,
                   converged_event_id::text, convergence_summary, round_2_triggered,
                   forced_rule_id::text, reopens_poll_id::text, backfilled, tier
            FROM polls
        """)
        for r in cur.fetchall():
            if r[0] in sqlite_pg_ids:
                continue
            try:
                src.execute(
                    "INSERT INTO polls (id, cycle_id, round_id, question, initiated_by, "
                    "initiated_at, initiated_event_id, converged_at, converged_event_id, "
                    "convergence_summary, round_2_triggered, forced_rule_id, "
                    "reopens_poll_id, backfilled, tier) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    r,
                )
                inserted += 1
            except sqlite3.IntegrityError as exc:
                if not silent:
                    print(f"  skip poll {r[0][:8]}: {exc}", file=sys.stderr)
    return inserted


PULLERS = {
    "events": pull_events,
    "polls": pull_polls,
}


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--silent", action="store_true")
    p.add_argument("--tables", default="events,polls",
                   help="Comma-separated list of tables to pull (default: events,polls)")
    args = p.parse_args()

    _load_dotenv()

    sqlite_path = os.environ.get("SIXIS_SQLITE_PATH", DEFAULT_SQLITE)
    dsn = os.environ.get("SIXIS_DATABASE_URL")
    if not dsn:
        if not args.silent:
            print("[pull] SIXIS_DATABASE_URL not set; skipping", file=sys.stderr)
        return 0

    requested = [t.strip() for t in args.tables.split(",") if t.strip()]
    unknown = [t for t in requested if t not in PULLERS]
    if unknown:
        sys.exit(f"[pull] unknown table(s): {unknown}. Supported: {list(PULLERS)}")

    try:
        with closing(sqlite3.connect(sqlite_path)) as src, \
             psycopg.connect(dsn, prepare_threshold=None) as dst:
            for t in requested:
                n = PULLERS[t](src, dst, args.silent)
                if not args.silent and n:
                    print(f"[pull] {t}: +{n} pulled from Supabase into SQLite")
            src.commit()
        return 0
    except Exception as exc:
        if not args.silent:
            print(f"[pull] error: {exc}", file=sys.stderr)
        return 0  # don't fail caller


if __name__ == "__main__":
    sys.exit(main())
