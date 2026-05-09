"""
Backend abstraction for SiXiS substrate.

Two implementations:
  - SQLiteBackend: current behavior, retained during shadow mode and as
    cold-backup fallback during the post-cutover window.
  - SupabaseBackend: Postgres via psycopg, target of the migration.

A third (DualWriteBackend) wraps both during the 14-day shadow window.

Read path stays SQLite during shadow mode. Write path forks. After cutover,
SupabaseBackend becomes the only backend.

Determinism contract for reducers (verified by scripts/two_writer_test.py):
  reduce(event, current_projection_state) → list[ProjectionMutation]
  must be a pure function of its inputs. No wall-clock reads, no environment
  reads, no network. The current_projection_state argument is the only
  database-dependent input and is provided by the backend.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Protocol
from uuid import UUID, uuid4


@dataclass
class Event:
    """In-flight event before insert. Backend assigns id on emit."""
    type: str
    source: str
    description: str
    cycle_id: UUID | None = None
    round_id: UUID | None = None
    project_id: UUID | None = None
    rule_id: UUID | None = None
    actor_id: UUID | None = None
    capability_id: UUID | None = None
    payload: dict[str, Any] = field(default_factory=dict)
    caused_by_event_id: UUID | None = None
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    id: UUID = field(default_factory=uuid4)


@dataclass(frozen=True)
class ProjectionMutation:
    """A reducer's instruction to the backend: write these fields to this row.

    Backends apply this as INSERT ... ON CONFLICT (id) DO UPDATE SET ...
    Reducers never decide to skip — they describe the projection state
    that should hold after this event has been applied.
    """
    table: str
    row_id: UUID
    fields: dict[str, Any]
    bumps_version: bool = True


@dataclass(frozen=True)
class HistoryAppend:
    """Optional companion to ProjectionMutation: write a snapshot row to a
    history table (polls_history, rules_history). Used for entities where
    point-in-time replay matters more than raw event-stream replay."""
    table: str  # 'polls_history' or 'rules_history'
    fields: dict[str, Any]


class Backend(Protocol):
    """All persistence flows through this interface post-refactor."""

    def emit(self, event: Event,
             mutations: list[ProjectionMutation],
             history: list[HistoryAppend] | None = None) -> UUID:
        """Atomically: insert event, apply mutations, append history.

        Returns the event id. Single transaction at the database level.
        Reducers compute mutations; the caller passes both in.
        """
        ...

    def query(self, sql: str, params: tuple = ()) -> list[dict[str, Any]]:
        """Read-only query. Used by CLI verbs that haven't been migrated yet
        and by drift_check.py."""
        ...

    def close(self) -> None: ...


def from_env(env_var: str = "SIXIS_BACKEND") -> Backend:
    """Pick a backend based on env var.

    SIXIS_BACKEND=sqlite           → SQLiteBackend(path from SIXIS_SQLITE_PATH)
    SIXIS_BACKEND=supabase         → SupabaseBackend(dsn from SIXIS_DATABASE_URL)
    SIXIS_BACKEND=dual             → DualWriteBackend(sqlite, supabase)
    SIXIS_BACKEND not set          → defaults to sqlite for backward compat
    """
    choice = os.environ.get(env_var, "sqlite").lower()
    if choice == "supabase":
        from .supabase import SupabaseBackend
        return SupabaseBackend(os.environ["SIXIS_DATABASE_URL"])
    if choice == "dual":
        from .dual_write import DualWriteBackend
        from .sqlite import SQLiteBackend
        from .supabase import SupabaseBackend
        return DualWriteBackend(
            primary=SQLiteBackend(os.environ.get(
                "SIXIS_SQLITE_PATH",
                os.path.expanduser("~/Documents/Claude/Projects/SixiS/projects/dashboard_v0_1/sixis_dashboard.db"))),
            secondary=SupabaseBackend(os.environ["SIXIS_DATABASE_URL"]),
        )
    from .sqlite import SQLiteBackend
    return SQLiteBackend(os.environ.get(
        "SIXIS_SQLITE_PATH",
        os.path.expanduser("~/Documents/Claude/Projects/SixiS/projects/dashboard_v0_1/sixis_dashboard.db")))
