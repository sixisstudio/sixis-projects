"""
Dual-write backend used during the 14-day shadow mode.

Writes go to BOTH the primary (SQLite, canonical during shadow) and the
secondary (Supabase Postgres, validated against SQLite by drift_check.py).

Reads return primary results — secondary is write-shadow only.

Failure semantics during shadow:
  - Primary write fails → raise. Whole emit failed.
  - Primary write succeeds, secondary fails → log error to a sidecar file
    (not the substrate, to avoid recursion), return success based on primary.
    drift_check.py will surface the divergence on next run.

This asymmetry is intentional. Shadow is a validation tool; we do not let
Postgres-side failures block Tommy's working flow during the validation
period. Day-of-cutover behavior is different — that's a single backend.
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import UUID

from . import Backend, Event, HistoryAppend, ProjectionMutation

SHADOW_ERROR_LOG = Path("~/Documents/Claude/Projects/SixiS/projects/integrate_supabase_v0_1/.shadow_errors.log").expanduser()


class DualWriteBackend(Backend):
    def __init__(self, primary: Backend, secondary: Backend):
        self.primary = primary
        self.secondary = secondary

    def emit(self, event: Event,
             mutations: list[ProjectionMutation],
             history: list[HistoryAppend] | None = None) -> UUID:
        primary_id = self.primary.emit(event, mutations, history)

        try:
            self.secondary.emit(event, mutations, history)
        except Exception as exc:
            self._log_shadow_error(event, exc)

        return primary_id

    def query(self, sql: str, params: tuple = ()) -> list[dict[str, Any]]:
        # Reads always from primary (SQLite) during shadow.
        return self.primary.query(sql, params)

    def close(self) -> None:
        try:
            self.primary.close()
        finally:
            self.secondary.close()

    def _log_shadow_error(self, event: Event, exc: Exception) -> None:
        SHADOW_ERROR_LOG.parent.mkdir(parents=True, exist_ok=True)
        with SHADOW_ERROR_LOG.open("a") as f:
            f.write(
                f"{datetime.now(timezone.utc).isoformat()} "
                f"event_id={event.id} type={event.type} "
                f"error={exc.__class__.__name__}: {exc}\n"
            )
