"""
SQLite backend — wraps the existing sixis_dashboard.db behavior under the
unified Backend interface. During shadow mode this is the read source.
After cutover, retained only for the 7-day cold-backup window.

The existing sixis.py CLI writes are mutation-shaped: INSERT INTO polls,
UPDATE rules, etc. This backend's `emit` reverses that flow — events come
first, projection writes are derived from reducer output.
"""
from __future__ import annotations

import json
import sqlite3
from typing import Any
from uuid import UUID

from . import Backend, Event, HistoryAppend, ProjectionMutation


class SQLiteBackend(Backend):
    def __init__(self, path: str):
        self.path = path
        self.conn = sqlite3.connect(path, isolation_level=None)  # autocommit; explicit BEGIN
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")

    def emit(self, event: Event,
             mutations: list[ProjectionMutation],
             history: list[HistoryAppend] | None = None) -> UUID:
        cur = self.conn.cursor()
        cur.execute("BEGIN")
        try:
            # SQLite events table uses TEXT IDs and 'metadata' JSON column
            # rather than payload jsonb. Map at this boundary.
            cur.execute(
                """
                INSERT INTO events (id, cycle_id, round_id, rule_id, type, source,
                                     timestamp, description, related_event_id, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(event.id),
                    str(event.cycle_id) if event.cycle_id else None,
                    str(event.round_id) if event.round_id else None,
                    str(event.rule_id) if event.rule_id else None,
                    event.type,
                    event.source,
                    event.occurred_at.isoformat(),
                    event.description,
                    str(event.caused_by_event_id) if event.caused_by_event_id else None,
                    json.dumps(event.payload) if event.payload else None,
                ),
            )

            for m in mutations:
                self._apply_mutation(cur, m, event.id)

            for h in history or []:
                self._apply_history(cur, h, event.id)

            cur.execute("COMMIT")
        except Exception:
            cur.execute("ROLLBACK")
            raise
        finally:
            cur.close()
        return event.id

    def _apply_mutation(self, cur: sqlite3.Cursor, m: ProjectionMutation, event_id: UUID) -> None:
        """UPDATE-first, INSERT-if-absent. Partial mutations (e.g. convergence
        only writes converged_*) won't carry the NOT NULL columns required on
        INSERT — but they only run on existing rows, so UPDATE is enough."""
        cleaned = {
            k: (str(v) if isinstance(v, UUID) else v)
            for k, v in m.fields.items()
        }
        # last_event_id may not exist on legacy SQLite projection tables;
        # we'll silently retry without it on the INSERT path if needed.
        cleaned["last_event_id"] = str(event_id)

        # Try UPDATE first.
        set_clause = ", ".join(f"{k} = ?" for k in cleaned)
        update_sql = f"UPDATE {m.table} SET {set_clause} WHERE id = ?"
        update_values = list(cleaned.values()) + [str(m.row_id)]
        try:
            cur.execute(update_sql, update_values)
        except sqlite3.OperationalError as e:
            if "last_event_id" in str(e):
                cleaned.pop("last_event_id", None)
                set_clause = ", ".join(f"{k} = ?" for k in cleaned)
                update_sql = f"UPDATE {m.table} SET {set_clause} WHERE id = ?"
                update_values = list(cleaned.values()) + [str(m.row_id)]
                cur.execute(update_sql, update_values)
            else:
                raise

        if cur.rowcount > 0:
            return

        # Row doesn't exist — INSERT.
        columns = list(cleaned.keys()) + ["id"]
        values = list(cleaned.values()) + [str(m.row_id)]
        col_list = ", ".join(columns)
        placeholders = ", ".join(["?"] * len(columns))
        insert_sql = f"INSERT INTO {m.table} ({col_list}) VALUES ({placeholders})"
        try:
            cur.execute(insert_sql, values)
        except sqlite3.OperationalError as e:
            if "last_event_id" in str(e):
                cleaned.pop("last_event_id", None)
                columns = list(cleaned.keys()) + ["id"]
                values = list(cleaned.values()) + [str(m.row_id)]
                col_list = ", ".join(columns)
                placeholders = ", ".join(["?"] * len(columns))
                insert_sql = f"INSERT INTO {m.table} ({col_list}) VALUES ({placeholders})"
                cur.execute(insert_sql, values)
            else:
                raise

    def _apply_history(self, cur: sqlite3.Cursor, h: HistoryAppend, event_id: UUID) -> None:
        # SQLite-side history tables aren't in the existing schema. During
        # shadow mode the history snapshots are written to Postgres only;
        # SQLite history is an explicit non-goal. No-op here.
        return

    def query(self, sql: str, params: tuple = ()) -> list[dict[str, Any]]:
        cur = self.conn.execute(sql, params)
        return [dict(r) for r in cur.fetchall()]

    def close(self) -> None:
        self.conn.close()
