#!/usr/bin/env python3
"""
sixis_dual — dual-write CLI for the 14-day shadow window.

Wraps the legacy sixis.py verbs that have reducers in sixis/reducers/core.py
and routes their writes through DualWriteBackend(SQLiteBackend, SupabaseBackend).
Reads stay SQLite during shadow.

Verbs covered (incremental — expand as more reducers land):
  cross-poll         → emits cross_poll event, writes polls projection + history
  converge           → emits convergence event, updates polls + history
  event-log          → emits an arbitrary event type with no projection mutation
                       (the most common write path in the existing sixis.py)
  session-start      → emits session_started, writes sessions projection
  session-end        → emits session_handoff, closes sessions row

Verbs NOT yet covered fall back to the legacy sixis.py (use the original CLI
for those during shadow). After all verbs are migrated, this file replaces
sixis.py outright.

Environment:
  SIXIS_DATABASE_URL  — Supabase DSN
  SIXIS_SQLITE_PATH   — path to sixis_dashboard.db (defaults documented)

Usage:
  python3 sixis_dual.py cross-poll --cycle <id> --question "..." --tier 2
  python3 sixis_dual.py converge --poll <id> --summary "..."
  python3 sixis_dual.py event-log --cycle <id> --type adoption --source claude --desc "..."
  python3 sixis_dual.py session-start --project <slug>
  python3 sixis_dual.py session-end --summary "..."
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID, uuid4

# Make sixis package importable regardless of cwd.
_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(_HERE))

from sixis.backends import Backend, Event  # noqa: E402
from sixis.backends.dual_write import DualWriteBackend  # noqa: E402
from sixis.backends.sqlite import SQLiteBackend  # noqa: E402
from sixis.backends.supabase import SupabaseBackend  # noqa: E402
from sixis.reducers import dispatch  # noqa: E402

DEFAULT_SQLITE = os.path.expanduser(
    "~/Documents/Claude/Projects/SixiS/projects/dashboard_v0_1/sixis_dashboard.db"
)


def _load_dotenv() -> None:
    """Tiny .env loader — avoids the python-dotenv dependency."""
    env_path = Path(__file__).parent.parent / ".env"
    if not env_path.exists():
        return
    for raw in env_path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())


def _backend() -> Backend:
    """Construct DualWriteBackend(sqlite, supabase) from env."""
    _load_dotenv()
    sqlite_path = os.environ.get("SIXIS_SQLITE_PATH", DEFAULT_SQLITE)
    dsn = os.environ["SIXIS_DATABASE_URL"]
    return DualWriteBackend(
        primary=SQLiteBackend(sqlite_path),
        secondary=SupabaseBackend(dsn),
    )


def _read_current_state(backend: Backend, table: str, row_id: UUID) -> dict[str, dict]:
    """Reducers receive a dict like {table: {row_id_str: row_state}}. We pull
    the single row the reducer cares about so the determinism contract holds."""
    rows = backend.query(f"SELECT * FROM {table} WHERE id = ?", (str(row_id),))
    if not rows:
        return {table: {}}
    return {table: {str(row_id): rows[0]}}


def _resolve_uuid(text: str) -> UUID:
    return UUID(text)


# Verbs ---------------------------------------------------------------------

def cmd_cross_poll(args: argparse.Namespace) -> int:
    backend = _backend()
    poll_id = uuid4()
    cycle_id = _resolve_uuid(args.cycle)
    event = Event(
        type="cross_poll",
        source=args.source,
        description=f"cross-poll opened: {args.question[:80]}",
        cycle_id=cycle_id,
        round_id=_resolve_uuid(args.round) if args.round else None,
        payload={
            "poll_id": str(poll_id),
            "question": args.question,
            "tier": args.tier,
            "brains": args.brains.split(","),
        },
        occurred_at=datetime.now(timezone.utc),
    )
    mutations, history = dispatch(event, {"polls": {}})
    eid = backend.emit(event, mutations, history)
    backend.close()
    print(f"cross-poll opened: poll_id={poll_id}, event_id={eid}")
    return 0


def cmd_converge(args: argparse.Namespace) -> int:
    backend = _backend()
    poll_id = _resolve_uuid(args.poll)
    state = _read_current_state(backend, "polls", poll_id)
    if not state["polls"].get(str(poll_id)):
        print(f"error: poll {poll_id} not found in projection", file=sys.stderr)
        backend.close()
        return 1
    cycle_id = state["polls"][str(poll_id)].get("cycle_id")
    event = Event(
        type="convergence",
        source=args.source,
        description=f"convergence: {args.summary[:80]}",
        cycle_id=cycle_id if isinstance(cycle_id, UUID) else (UUID(cycle_id) if cycle_id else None),
        payload={
            "poll_id": str(poll_id),
            "summary": args.summary,
        },
        occurred_at=datetime.now(timezone.utc),
    )
    mutations, history = dispatch(event, state)
    eid = backend.emit(event, mutations, history)
    backend.close()
    print(f"convergence logged: event_id={eid}")
    return 0


def cmd_event_log(args: argparse.Namespace) -> int:
    backend = _backend()
    payload = json.loads(args.payload) if args.payload else {}
    event = Event(
        type=args.type,
        source=args.source,
        description=args.desc,
        cycle_id=_resolve_uuid(args.cycle) if args.cycle else None,
        round_id=_resolve_uuid(args.round) if args.round else None,
        payload=payload,
        occurred_at=datetime.now(timezone.utc),
    )
    # event-log doesn't mutate projections — pure log.
    mutations, history = dispatch(event, {})
    eid = backend.emit(event, mutations, history)
    backend.close()
    print(f"event logged: {eid}")
    return 0


def cmd_session_start(args: argparse.Namespace) -> int:
    backend = _backend()
    session_id = uuid4()
    event = Event(
        type="session_started",
        source="tommy",
        description=f"session started for project {args.project}",
        payload={"session_id": str(session_id), "user": "tommy", "project": args.project},
        occurred_at=datetime.now(timezone.utc),
    )
    mutations, history = dispatch(event, {})
    eid = backend.emit(event, mutations, history)
    backend.close()
    print(f"session started: session_id={session_id}, event_id={eid}")
    return 0


def cmd_session_end(args: argparse.Namespace) -> int:
    backend = _backend()
    rows = backend.query(
        "SELECT id FROM sessions WHERE ended_at IS NULL AND user = ? LIMIT 1",
        ("tommy",),
    )
    if not rows:
        print("error: no active session to end", file=sys.stderr)
        backend.close()
        return 1
    session_id = rows[0]["id"]
    if not isinstance(session_id, UUID):
        session_id = UUID(session_id)
    event = Event(
        type="session_handoff",
        source="tommy",
        description=f"session handoff: {args.summary[:80]}",
        payload={"session_id": str(session_id), "summary": args.summary},
        occurred_at=datetime.now(timezone.utc),
    )
    mutations, history = dispatch(event, {})
    eid = backend.emit(event, mutations, history)
    backend.close()
    print(f"session ended: event_id={eid}")
    return 0


# Argparse -----------------------------------------------------------------

def main() -> int:
    p = argparse.ArgumentParser(prog="sixis_dual",
                                 description="Dual-write SiXiS CLI for the 14-day shadow window.")
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("cross-poll", help="Open a cross-poll")
    s.add_argument("--cycle", required=True)
    s.add_argument("--round")
    s.add_argument("--question", required=True)
    s.add_argument("--tier", type=int, default=2)
    s.add_argument("--brains", default="claude,gpt,deepseek")
    s.add_argument("--source", default="claude")
    s.set_defaults(func=cmd_cross_poll)

    s = sub.add_parser("converge", help="Resolve a cross-poll")
    s.add_argument("--poll", required=True)
    s.add_argument("--summary", required=True)
    s.add_argument("--source", default="claude")
    s.set_defaults(func=cmd_converge)

    s = sub.add_parser("event-log", help="Log an arbitrary event")
    s.add_argument("--cycle")
    s.add_argument("--round")
    s.add_argument("--type", required=True)
    s.add_argument("--source", required=True)
    s.add_argument("--desc", required=True)
    s.add_argument("--payload", help="JSON object for event.payload")
    s.set_defaults(func=cmd_event_log)

    s = sub.add_parser("session-start", help="Open a chat session")
    s.add_argument("--project", required=True)
    s.set_defaults(func=cmd_session_start)

    s = sub.add_parser("session-end", help="Close the active chat session")
    s.add_argument("--summary", required=True)
    s.set_defaults(func=cmd_session_end)

    args = p.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
