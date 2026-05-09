"""
Core reducers — one function per event type that affects a projection table.
Pure functions of (event, current_state). No side effects.

Coverage of the 50+ event types is incremental. Verbs migrate from sixis.py
in this order (matching the Layer B refactor plan):
  1. cross_poll, convergence, round_2_cross_check          — poll lifecycle
  2. cycle_started (synthesized), cycle_ended              — cycle lifecycle
  3. project_create, draft_promoted_to_project             — project lifecycle
  4. rule_added, rule_modified, rule_removed               — rules
  5. amendment_proposed, amendment_ratified                — amendments
  6. session_started, session_handoff, item_resolved       — sessions
  7. ... remaining

Event types that are pure logging (no projection write) need no reducer —
dispatch returns ([], []) for unregistered types.
"""
from __future__ import annotations

from typing import Any
from uuid import UUID, uuid5, NAMESPACE_DNS

from ..backends import Event, HistoryAppend, ProjectionMutation
from . import reducer


# Helpers ---------------------------------------------------------------------

def _poll_id_from_event(event: Event) -> UUID:
    """Cross-poll events carry the new poll_id in payload['poll_id']."""
    pid = event.payload.get("poll_id")
    if pid is None:
        raise ValueError(f"cross_poll event {event.id} missing payload.poll_id")
    return UUID(pid) if isinstance(pid, str) else pid


def _amendment_id_from_event(event: Event) -> UUID:
    aid = event.payload.get("amendment_id")
    if aid is None:
        raise ValueError(f"amendment event {event.id} missing payload.amendment_id")
    return UUID(aid) if isinstance(aid, str) else aid


# Poll lifecycle --------------------------------------------------------------

@reducer("cross_poll")
def reduce_cross_poll(
    event: Event, current: dict[str, Any]
) -> tuple[list[ProjectionMutation], list[HistoryAppend]]:
    poll_id = _poll_id_from_event(event)
    fields = {
        "cycle_id": event.cycle_id,
        "round_id": event.round_id,
        "question": event.payload["question"],
        "initiated_by": event.source,
        "initiated_at": event.occurred_at,
        "initiated_event_id": event.id,
        "tier": event.payload.get("tier", 2),
        "round_2_triggered": False,
        "backfilled": event.payload.get("backfilled", False),
    }
    history = [HistoryAppend(table="polls_history", fields={
        "poll_id": poll_id,
        "version": 1,
        **fields,
        "round_2_triggered": False,
        "backfilled": fields["backfilled"],
        "recorded_event_id": event.id,
    })]
    return [ProjectionMutation(table="polls", row_id=poll_id, fields=fields)], history


def _bool(v: Any, default: bool = False) -> bool:
    """Coerce SQLite ints (0/1) and Postgres bools to a real bool. Reducers
    must produce values that satisfy both backends."""
    if v is None:
        return default
    if isinstance(v, bool):
        return v
    return bool(int(v))


@reducer("convergence")
def reduce_convergence(
    event: Event, current: dict[str, Any]
) -> tuple[list[ProjectionMutation], list[HistoryAppend]]:
    poll_id = _poll_id_from_event(event)
    existing = current.get("polls", {}).get(str(poll_id), {})
    fields = {
        "converged_at": event.occurred_at,
        "converged_event_id": event.id,
        "convergence_summary": event.payload.get("summary", ""),
    }
    new_version = existing.get("version", 1) + 1
    history = [HistoryAppend(table="polls_history", fields={
        "poll_id": poll_id,
        "version": new_version,
        "question": existing.get("question", ""),
        "initiated_by": existing.get("initiated_by", event.source),
        "initiated_at": existing.get("initiated_at", event.occurred_at),
        "initiated_event_id": existing.get("initiated_event_id", event.id),
        "converged_at": event.occurred_at,
        "converged_event_id": event.id,
        "convergence_summary": fields["convergence_summary"],
        "round_2_triggered": _bool(existing.get("round_2_triggered"), False),
        "forced_rule_id": existing.get("forced_rule_id"),
        "reopens_poll_id": existing.get("reopens_poll_id"),
        "backfilled": _bool(existing.get("backfilled"), False),
        "tier": int(existing.get("tier", 2)),
        "recorded_event_id": event.id,
    })]
    return [ProjectionMutation(table="polls", row_id=poll_id, fields=fields)], history


@reducer("round_2_cross_check")
def reduce_round_2(
    event: Event, current: dict[str, Any]
) -> tuple[list[ProjectionMutation], list[HistoryAppend]]:
    poll_id = _poll_id_from_event(event)
    return [ProjectionMutation(
        table="polls",
        row_id=poll_id,
        fields={"round_2_triggered": True},
    )], []


# Rule lifecycle --------------------------------------------------------------

@reducer("rule_added")
def reduce_rule_added(
    event: Event, current: dict[str, Any]
) -> tuple[list[ProjectionMutation], list[HistoryAppend]]:
    rule_id = UUID(event.payload["rule_id"]) if isinstance(event.payload["rule_id"], str) else event.payload["rule_id"]
    p = event.payload
    fields = {
        "rule_name": p["rule_name"],
        "description": p["description"],
        "layer": p["layer"],
        "scope": p.get("scope"),
        "added_in_version": p["added_in_version"],
        "source_event_id": event.id,
        "source_project_id": event.project_id,
        "status": "active",
        "added_at": event.occurred_at,
        "kind": p.get("kind", "forced_rule"),
        "stable_id": p.get("stable_id"),
        "source_path": p.get("source_path"),
        "source_version": p.get("source_version"),
    }
    history = [HistoryAppend(table="rules_history", fields={
        "rule_id": rule_id,
        "version": 1,
        **fields,
        "recorded_event_id": event.id,
    })]
    return [ProjectionMutation(table="rules", row_id=rule_id, fields=fields)], history


@reducer("rule_modified")
def reduce_rule_modified(
    event: Event, current: dict[str, Any]
) -> tuple[list[ProjectionMutation], list[HistoryAppend]]:
    rule_id = UUID(event.payload["rule_id"]) if isinstance(event.payload["rule_id"], str) else event.payload["rule_id"]
    fields = {k: v for k, v in event.payload.items() if k != "rule_id"}
    fields.setdefault("status", "modified")
    return [ProjectionMutation(table="rules", row_id=rule_id, fields=fields)], []


@reducer("rule_removed")
def reduce_rule_removed(
    event: Event, current: dict[str, Any]
) -> tuple[list[ProjectionMutation], list[HistoryAppend]]:
    rule_id = UUID(event.payload["rule_id"]) if isinstance(event.payload["rule_id"], str) else event.payload["rule_id"]
    return [ProjectionMutation(
        table="rules",
        row_id=rule_id,
        fields={"status": "removed", "removed_at": event.occurred_at},
    )], []


# Amendment lifecycle ---------------------------------------------------------

@reducer("amendment_proposed")
def reduce_amendment_proposed(
    event: Event, current: dict[str, Any]
) -> tuple[list[ProjectionMutation], list[HistoryAppend]]:
    aid = _amendment_id_from_event(event)
    p = event.payload
    fields = {
        "proposal_summary": p["summary"],
        "rationale": p.get("rationale"),
        "proposed_at": event.occurred_at,
        "proposed_by": event.source,
        "status": "proposed",
        "target_version": p.get("target_version"),
        "target_layer": p.get("target_layer", "project"),
        "target_project_id": event.project_id,
        "source_event_id": event.id,
    }
    return [ProjectionMutation(table="amendments", row_id=aid, fields=fields)], []


@reducer("amendment_ratified")
def reduce_amendment_ratified(
    event: Event, current: dict[str, Any]
) -> tuple[list[ProjectionMutation], list[HistoryAppend]]:
    aid = _amendment_id_from_event(event)
    return [ProjectionMutation(
        table="amendments",
        row_id=aid,
        fields={
            "ratified_at": event.occurred_at,
            "ratified_by": event.payload.get("ratified_by", event.source),
            "status": "ratified",
        },
    )], []


# Cycle / project lifecycle ---------------------------------------------------

@reducer("project_create")
def reduce_project_create(
    event: Event, current: dict[str, Any]
) -> tuple[list[ProjectionMutation], list[HistoryAppend]]:
    p = event.payload
    pid = UUID(p["project_id"]) if isinstance(p.get("project_id"), str) else (p.get("project_id") or event.project_id)
    if pid is None:
        # synthesize from slug for legacy backfilled rows
        pid = uuid5(NAMESPACE_DNS, f"project_{p['slug']}")
    fields = {
        "name": p["name"],
        "slug": p["slug"],
        "description": p.get("description"),
        "archetype": p.get("archetype"),
        "owner": p.get("owner", "tommy"),
        "status": p.get("status", "active"),
        "started_at": event.occurred_at,
    }
    return [ProjectionMutation(table="projects", row_id=pid, fields=fields)], []


# Session lifecycle -----------------------------------------------------------

@reducer("session_started")
def reduce_session_started(
    event: Event, current: dict[str, Any]
) -> tuple[list[ProjectionMutation], list[HistoryAppend]]:
    p = event.payload
    sid = UUID(p["session_id"]) if isinstance(p.get("session_id"), str) else event.id
    fields = {
        "started_at": event.occurred_at,
        "last_heartbeat": event.occurred_at,
        "status": "active",
        "user": p.get("user", "tommy"),
        "originating_project_id": event.project_id,
    }
    return [ProjectionMutation(table="sessions", row_id=sid, fields=fields)], []


@reducer("session_handoff")
def reduce_session_handoff(
    event: Event, current: dict[str, Any]
) -> tuple[list[ProjectionMutation], list[HistoryAppend]]:
    p = event.payload
    sid = UUID(p["session_id"]) if isinstance(p.get("session_id"), str) else None
    muts: list[ProjectionMutation] = []
    if sid:
        muts.append(ProjectionMutation(
            table="sessions",
            row_id=sid,
            fields={"ended_at": event.occurred_at, "status": "closed", "notes": p.get("summary")},
        ))
    return muts, []


# Add reducers for the remaining 30+ event types as their CLI verbs migrate.
# Each unmapped type is currently a pure-log no-op, which is correct behavior
# during the gradual refactor.
