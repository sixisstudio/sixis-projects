#!/usr/bin/env python3
"""
Drift comparison job — full-system replay.

Replays every event through the reducer registry to build expected projection
state in memory, then diffs against actual rows in the projection tables.
Anything that diverges gets a drift_reports row.

Strategy:
  1. Load all events ordered by occurred_at.
  2. For each event, dispatch through sixis.reducers and apply the resulting
     mutations to in-memory state dicts (one per projection table).
  3. For each table, compare in-memory state to actual rows.
  4. Write drift_reports for each divergence.

Usage:
  python3 drift_check.py --target-dsn "$SIXIS_DATABASE_URL"
  python3 drift_check.py --target-dsn "$SIXIS_DATABASE_URL" --tables polls,rules

Exit codes:
  0 — no unresolved drift
  1 — drift found (count printed; rows in drift_reports)
  2 — execution error
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections import defaultdict
from typing import Any

import psycopg
from psycopg.rows import dict_row

# Make the sixis package importable regardless of cwd.
_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(_HERE))

from sixis.backends import Event  # noqa: E402
from sixis.reducers import dispatch, registered_types  # noqa: E402

# Tables we replay. amendments + sessions + handoff items added once their
# reducers cover the full state — for now we replay the entities whose reducers
# exist in sixis/reducers/core.py.
REPLAYABLE_TABLES = ["polls", "rules", "amendments", "projects", "sessions"]


def _row_to_event(row: dict[str, Any]) -> Event:
    return Event(
        id=row["id"],
        type=str(row["type"]),
        source=str(row["source"]),
        description=row["description"] or "",
        cycle_id=row.get("cycle_id"),
        round_id=row.get("round_id"),
        project_id=row.get("project_id"),
        rule_id=row.get("rule_id"),
        actor_id=row.get("actor_id"),
        capability_id=row.get("capability_id"),
        payload=row.get("payload") or {},
        caused_by_event_id=row.get("caused_by_event_id"),
        occurred_at=row["occurred_at"],
    )


def replay(conn: psycopg.Connection,
           tables: list[str]) -> dict[str, dict[str, dict[str, Any]]]:
    """Returns {table: {row_id_str: row_state_dict}} — the expected state
    derived from replaying all events through the reducer registry."""
    state: dict[str, dict[str, dict[str, Any]]] = defaultdict(dict)

    with conn.cursor() as cur:
        cur.execute(
            "SELECT * FROM events ORDER BY occurred_at ASC, id ASC"
        )
        events = list(cur.fetchall())

    print(f"[drift] replaying {len(events)} events through {len(registered_types())} reducers")

    skipped = 0
    for row in events:
        event = _row_to_event(row)
        if event.type not in registered_types():
            continue  # unmapped types are pure-log no-ops by design
        try:
            mutations, _history = dispatch(event, state)
        except (ValueError, KeyError):
            # Legacy events (pre-migration) often lack the payload fields the
            # reducer expects (e.g. payload.poll_id was implicit via the
            # polls.initiated_event_id back-pointer in the SQLite era). Skip
            # them — counts already verified during ETL. New events emitted
            # post-cutover via sixis.py will have full payloads.
            skipped += 1
            continue
        for m in mutations:
            if m.table not in tables:
                continue
            current = state[m.table].get(str(m.row_id), {})
            new = dict(current)
            for k, v in m.fields.items():
                new[k] = v
            new["last_event_id"] = event.id
            new["version"] = current.get("version", 0) + (1 if m.bumps_version else 0)
            state[m.table][str(m.row_id)] = new

    if skipped:
        print(f"[drift] skipped {skipped} legacy events whose payload doesn't fit current reducers (expected during ETL backfill phase)")
    return state


# Fields the reducers don't touch (DB-managed) and that we can't reproduce
# exactly from event replay. Excluded from diff so we don't churn drift rows
# on metadata that's expected to differ.
NON_REPLAYABLE_FIELDS = {
    "id",
    "created_event_id",
    # version: synthetic counter; we tracked our own above. The DB-side counter
    # is only-incremented when a real mutation runs, which lines up with our
    # bumps_version flag — keep in the diff.
}


def diff_rows(expected: dict[str, Any], actual: dict[str, Any]) -> dict[str, Any] | None:
    keys = (set(expected.keys()) | set(actual.keys())) - NON_REPLAYABLE_FIELDS
    differences = {}
    for k in keys:
        e = expected.get(k)
        a = actual.get(k)
        if _normalise(e) != _normalise(a):
            differences[k] = {"expected": _json_safe(e), "actual": _json_safe(a)}
    return differences or None


def _normalise(v: Any) -> Any:
    """Cross-type comparison: strings vs UUIDs, naive vs aware timestamps, etc."""
    if v is None:
        return None
    s = str(v)
    return s


def _json_safe(v: Any) -> Any:
    if v is None:
        return None
    return str(v)


def check_table(conn: psycopg.Connection, table: str,
                expected_state: dict[str, dict[str, Any]],
                suppression: dict[tuple[str, str], str | None] | None = None) -> int:
    """Returns the number of new drift rows written for this table.
    Rows in the suppression set are skipped if their diff is unchanged."""
    suppression = suppression or {}
    written = 0
    with conn.cursor() as cur:
        cur.execute(f"SELECT * FROM {table}")
        actual_rows = {str(r["id"]): r for r in cur.fetchall()}

    for row_id, expected in expected_state.items():
        actual = actual_rows.get(row_id)
        if actual is None:
            if (table, row_id) in suppression:
                continue
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO drift_reports (table_name, row_id, severity, expected, actual, diff, notes)
                       VALUES (%s, %s, 'critical', %s, NULL, NULL, %s)""",
                    (table, row_id, json.dumps(expected, default=_json_safe),
                     "expected row exists from event replay but projection has no such row"),
                )
            written += 1
            continue
        d = diff_rows(expected, dict(actual))
        if d is None:
            continue
        diff_text = json.dumps(d, sort_keys=True)
        baseline_diff = suppression.get((table, row_id))
        if baseline_diff is not None and _normalised_diff(baseline_diff) == _normalised_diff(diff_text):
            continue  # known baseline drift, unchanged
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO drift_reports (table_name, row_id, severity, expected, actual, diff)
                   VALUES (%s, %s, 'warning', %s, %s, %s)""",
                (table, row_id,
                 json.dumps(expected, default=_json_safe),
                 json.dumps(dict(actual), default=_json_safe),
                 diff_text),
            )
        written += 1

    # Rows in projection but not in expected — legacy/backfilled.
    for row_id, actual in actual_rows.items():
        if row_id not in expected_state:
            if (table, row_id) in suppression:
                continue
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO drift_reports (table_name, row_id, severity, expected, actual, diff, notes)
                       VALUES (%s, %s, 'info', NULL, %s, NULL, %s)""",
                    (table, row_id, json.dumps(dict(actual), default=_json_safe),
                     "row exists in projection but no event replay produced it (legacy/backfilled)"),
                )
            written += 1

    return written


def _normalised_diff(diff_text: str | None) -> str:
    """JSON-normalise so key order doesn't cause false-positive 'changed'."""
    if not diff_text:
        return ""
    try:
        return json.dumps(json.loads(diff_text), sort_keys=True)
    except (json.JSONDecodeError, TypeError):
        return diff_text


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--target-dsn", required=True)
    p.add_argument("--tables", default=",".join(REPLAYABLE_TABLES))
    args = p.parse_args()

    tables = [t.strip() for t in args.tables.split(",") if t.strip()]

    # Supabase transaction pooler requires no client-side prepared statements.
    with psycopg.connect(args.target_dsn, row_factory=dict_row, prepare_threshold=None) as conn:
        # Resolve only this script's own prior unresolved rows. Human/operator
        # resolutions (resolved_by NOT LIKE 'drift_check_run_%') persist —
        # those are accepted baselines and shouldn't be re-emitted.
        with conn.cursor() as cur:
            cur.execute(
                """UPDATE drift_reports SET resolved_at = NOW(),
                   resolved_by = 'drift_check_run_' || to_char(NOW(), 'YYYYMMDDHH24MISS')
                   WHERE resolved_at IS NULL"""
            )
        conn.commit()

        # Build a suppression set: (table_name, row_id) pairs that an operator
        # has marked as accepted baseline. We skip writing new drift rows for
        # these UNLESS the diff has changed since the baseline was accepted.
        with conn.cursor() as cur:
            cur.execute(
                """SELECT DISTINCT table_name, row_id, diff::text AS diff_text
                   FROM drift_reports
                   WHERE resolved_by NOT LIKE 'drift_check_run_%'
                     AND resolved_by IS NOT NULL"""
            )
            suppression = {(r["table_name"], str(r["row_id"])): r["diff_text"]
                            for r in cur.fetchall()}

        expected = replay(conn, tables)

        total = 0
        for t in tables:
            written = check_table(conn, t, expected.get(t, {}), suppression)
            print(f"[drift] {t}: {written} drift rows written (expected={len(expected.get(t, {}))}, actual_table_size=?)")
            total += written
        conn.commit()

        with conn.cursor() as cur:
            cur.execute(
                "SELECT severity, COUNT(*) AS n FROM drift_reports WHERE resolved_at IS NULL GROUP BY severity"
            )
            unresolved = {row["severity"]: row["n"] for row in cur.fetchall()}

    print(f"[drift] total drift rows this run: {total}")
    print(f"[drift] unresolved drift rows by severity: {unresolved}")

    critical = unresolved.get("critical", 0)
    warning = unresolved.get("warning", 0)
    return 0 if (critical + warning) == 0 else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        import traceback
        traceback.print_exc()
        print(f"[drift] error: {exc}", file=sys.stderr)
        sys.exit(2)
