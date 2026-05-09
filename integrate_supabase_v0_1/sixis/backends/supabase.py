"""
Supabase Postgres backend. Post-cutover this is the only backend.

Connection pattern matches TowMarX (transaction pooler at aws-1-...). Service
role key is used; RLS is bypassed by Supabase default for service_role.
"""
from __future__ import annotations

import json
from typing import Any
from uuid import UUID

import psycopg
from psycopg.rows import dict_row

from . import Backend, Event, HistoryAppend, ProjectionMutation


class SupabaseBackend(Backend):
    def __init__(self, dsn: str):
        self.dsn = dsn
        # prepare_threshold=None disables client-side prepared statements,
        # which is required when connecting through Supabase's transaction
        # pooler (each query may land on a different backend connection).
        self.conn = psycopg.connect(dsn, row_factory=dict_row, autocommit=False,
                                     prepare_threshold=None)

    def emit(self, event: Event,
             mutations: list[ProjectionMutation],
             history: list[HistoryAppend] | None = None) -> UUID:
        with self.conn.transaction():
            with self.conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO events (id, cycle_id, round_id, project_id, rule_id,
                                         type, source, actor_id, capability_id,
                                         payload, description, caused_by_event_id, occurred_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        event.id, event.cycle_id, event.round_id, event.project_id, event.rule_id,
                        event.type, event.source, event.actor_id, event.capability_id,
                        json.dumps(event.payload), event.description,
                        event.caused_by_event_id, event.occurred_at,
                    ),
                )

                for m in mutations:
                    self._apply_mutation(cur, m, event.id)

                for h in history or []:
                    self._apply_history(cur, h)

        return event.id

    def _apply_mutation(self, cur: psycopg.Cursor, m: ProjectionMutation, event_id: UUID) -> None:
        """UPDATE-first, INSERT-if-absent. Partial mutations (e.g. convergence
        only writes converged_*) don't need to carry the other NOT NULL columns
        because they only run on existing rows."""
        fields = dict(m.fields)
        fields["last_event_id"] = event_id

        # Try UPDATE first.
        set_clause = ", ".join(f"{k} = %s" for k in fields)
        if m.bumps_version:
            set_clause += f", version = {m.table}.version + 1"
        update_sql = f"UPDATE {m.table} SET {set_clause} WHERE id = %s"
        update_values = [_encode_value(fields[k]) for k in fields] + [m.row_id]
        cur.execute(update_sql, update_values)

        if cur.rowcount > 0:
            return

        # Row doesn't exist — INSERT.
        columns = list(fields.keys()) + ["id", "created_event_id"]
        values = [_encode_value(fields[k]) for k in fields] + [m.row_id, event_id]
        col_list = ", ".join(columns)
        placeholders = ", ".join(["%s"] * len(columns))
        insert_sql = f"INSERT INTO {m.table} ({col_list}) VALUES ({placeholders})"
        cur.execute(insert_sql, values)

    def _apply_history(self, cur: psycopg.Cursor, h: HistoryAppend) -> None:
        fields = dict(h.fields)
        columns = list(fields.keys())
        values = [_encode_value(fields[k]) for k in columns]
        col_list = ", ".join(columns)
        placeholders = ", ".join(["%s"] * len(columns))
        sql = f"INSERT INTO {h.table} ({col_list}) VALUES ({placeholders})"
        cur.execute(sql, values)

    def query(self, sql: str, params: tuple = ()) -> list[dict[str, Any]]:
        with self.conn.cursor() as cur:
            cur.execute(sql, params)
            return list(cur.fetchall())

    def close(self) -> None:
        self.conn.close()


def _encode_value(v: Any) -> Any:
    """psycopg handles UUID, datetime, etc. natively. JSONB needs json.dumps()
    only when passing as a plain str argument; if we pass a dict, psycopg
    serializes it automatically when the target column is jsonb. To stay
    explicit, normalize here."""
    if isinstance(v, dict) or isinstance(v, list):
        return json.dumps(v)
    return v
