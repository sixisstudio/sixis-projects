"""Gemini Synthesis Judge v0.1 — trigger predicates.

The 10 structured Tier-2 conditional triggers ratified in Layer B + the Tier-3
mandatory-attempt path. Each predicate is a pure function over substrate
context (poll row, parsed metadata, per-brain Round-1 + Round-2 responses,
related events) returning either None (no match) or a TriggerHit with a
human-readable reason.

The orchestrator runs evaluate_triggers(...) which iterates through predicates
and returns the FIRST hit. Order matters: tier_3_mandatory always wins, then
the substantive Tier-2 categories, then convergence-pattern triggers, then
the novelty + manual triggers as catch-alls.
"""

from __future__ import annotations

import json
import re
import sqlite3
from dataclasses import dataclass
from typing import Callable, Iterable, Optional


# ---------------------------------------------------------------------------
# Context bundle


@dataclass
class TriggerContext:
    """Everything a predicate needs to decide. Built once by evaluate_triggers."""
    poll_id: str
    cycle_id: str
    tier: Optional[int]
    question: str               # cross_poll question text
    convergence_text: str       # convergence event description (or "")
    r1: dict                    # {brain: {"position": str, "description": str}}
    r2: dict                    # same, for round 2
    project_id: Optional[str]   # project this poll belongs to (for novelty)
    related_event_types: set    # cycle's other event types (for novelty)
    uncertainty_flag: bool      # explicit Tommy/Claude flag in poll metadata


@dataclass
class TriggerHit:
    category: str               # canonical name (e.g. "tier_2_schema_change")
    reason: str                 # one sentence — what matched and why


# ---------------------------------------------------------------------------
# Substrate loader


def build_context(conn: sqlite3.Connection, poll_id_prefix: str) -> Optional[TriggerContext]:
    poll = conn.execute(
        "SELECT id, cycle_id, timestamp, description, metadata FROM events "
        "WHERE type='cross_poll' AND id LIKE ? ORDER BY timestamp DESC LIMIT 1",
        (poll_id_prefix + "%",),
    ).fetchone()
    if not poll:
        return None
    meta = json.loads(poll["metadata"]) if poll["metadata"] else {}
    tier = meta.get("tier")
    question = meta.get("question") or poll["description"] or ""

    conv = conn.execute(
        "SELECT description FROM events WHERE type='convergence' AND related_event_id=? "
        "ORDER BY timestamp DESC LIMIT 1",
        (poll["id"],),
    ).fetchone()
    convergence_text = conv["description"] if conv else ""

    rows = conn.execute(
        "SELECT json_extract(metadata, '$.brain') AS brain, "
        "       json_extract(metadata, '$.round') AS round, "
        "       json_extract(metadata, '$.position') AS position, "
        "       description "
        "FROM events WHERE type='brain_response_logged' AND cycle_id=?",
        (poll["cycle_id"],),
    ).fetchall()
    r1: dict = {}
    r2: dict = {}
    for r in rows:
        bucket = r2 if r["round"] == 2 else r1
        bucket[r["brain"]] = {"position": r["position"], "description": r["description"] or ""}

    cycle = conn.execute(
        "SELECT json_extract(metadata, '$.project_id') AS project_id FROM events "
        "WHERE cycle_id=? AND type='cycle_start' LIMIT 1",
        (poll["cycle_id"],),
    ).fetchone()
    project_id = cycle["project_id"] if cycle else None

    related = conn.execute(
        "SELECT DISTINCT type FROM events WHERE cycle_id=?",
        (poll["cycle_id"],),
    ).fetchall()
    related_event_types = {r["type"] for r in related}

    uncertainty_flag = bool(meta.get("uncertainty_flag") or meta.get("tommy_claude_uncertainty"))

    return TriggerContext(
        poll_id=poll["id"],
        cycle_id=poll["cycle_id"],
        tier=tier,
        question=question,
        convergence_text=convergence_text,
        r1=r1,
        r2=r2,
        project_id=project_id,
        related_event_types=related_event_types,
        uncertainty_flag=uncertainty_flag,
    )


# ---------------------------------------------------------------------------
# Helpers


def _haystack(ctx: TriggerContext) -> str:
    """Aggregate searchable text — question + convergence + per-brain responses."""
    parts = [ctx.question, ctx.convergence_text]
    for bucket in (ctx.r1, ctx.r2):
        for r in bucket.values():
            parts.append(r.get("description", ""))
    return "\n".join(parts).lower()


def _matches_any(text: str, patterns: Iterable[str]) -> Optional[str]:
    for p in patterns:
        if re.search(p, text):
            return p
    return None


# ---------------------------------------------------------------------------
# Predicates


def predicate_tier_3_mandatory(ctx: TriggerContext) -> Optional[TriggerHit]:
    if ctx.tier == 3:
        return TriggerHit("tier_3_mandatory",
                          "Poll is Tier-3 — mandatory-attempt per FORCED_RULE_GJ_03.")
    return None


def predicate_tier_2_protocol_change(ctx: TriggerContext) -> Optional[TriggerHit]:
    if ctx.tier != 2:
        return None
    text = _haystack(ctx)
    patterns = [
        r"\bamendment\b", r"\bforced[_ ]rule\b", r"\bkernel principle\b",
        r"\bm[-_ ]imperative\b", r"\b[km]\d+\b",
        r"\brule[ -]change\b", r"\brule[ -]modif",
        r"\bprotocol[ -]change\b", r"\bprotocol[ -]amendment\b",
        r"\buniversal shell\b",
    ]
    hit = _matches_any(text, patterns)
    if hit:
        return TriggerHit("tier_2_protocol_change",
                          f"Poll touches protocol/rule/amendment surface (matched /{hit}/).")
    return None


def predicate_tier_2_schema_change(ctx: TriggerContext) -> Optional[TriggerHit]:
    if ctx.tier != 2:
        return None
    text = _haystack(ctx)
    patterns = [
        r"\bschema\b", r"\bmigration\b", r"\bcanonical substrate\b",
        r"\bevents table\b", r"\bdata lineage\b",
        r"\bcheck constraint\b", r"\balter table\b", r"\bddl\b",
        r"\bnew event type\b", r"\bnew column\b",
    ]
    hit = _matches_any(text, patterns)
    if hit:
        return TriggerHit("tier_2_schema_change",
                          f"Poll touches schema / canonical substrate / data lineage (matched /{hit}/).")
    return None


def predicate_tier_2_auth_change(ctx: TriggerContext) -> Optional[TriggerHit]:
    if ctx.tier != 2:
        return None
    text = _haystack(ctx)
    patterns = [
        r"\brls\b", r"\brow[- ]level security\b",
        r"\bpermission\b", r"\bauth\b", r"\bauthn\b", r"\bauthz\b",
        r"\bsovereign delegation\b", r"\bcapability token\b",
        r"\brole grant\b", r"\baccess control\b",
    ]
    hit = _matches_any(text, patterns)
    if hit:
        return TriggerHit("tier_2_auth_change",
                          f"Poll touches auth/permission/sovereignty/delegation (matched /{hit}/).")
    return None


def predicate_tier_2_migration_cutover(ctx: TriggerContext) -> Optional[TriggerHit]:
    if ctx.tier != 2:
        return None
    text = _haystack(ctx)
    patterns = [
        r"\bcutover\b", r"\bshadow mode\b",
        r"\bcanonical source\b", r"\bprimary store\b",
        r"\breplay\b.*\bsubstrate\b", r"\bdual[- ]write\b",
    ]
    hit = _matches_any(text, patterns)
    if hit:
        return TriggerHit("tier_2_migration_cutover",
                          f"Poll touches migration/cutover/canonical-source declaration (matched /{hit}/).")
    return None


def predicate_tier_2_unanimous_single_round(ctx: TriggerContext) -> Optional[TriggerHit]:
    """All R1 positions = ratify AND no R2 disagreement surfaced (or R2 is empty)."""
    if ctx.tier != 2:
        return None
    if not ctx.r1:
        return None
    if not all(r.get("position") == "ratify" for r in ctx.r1.values()):
        return None
    if len(ctx.r1) < 2:
        return None  # need at least 2 brains for "unanimous" to be meaningful
    # If R2 exists and shows REFINE/CONTINUE_DISAGREE, this isn't single-round
    for r in ctx.r2.values():
        desc_low = r.get("description", "").lower()
        if "continue_disagree" in desc_low or "refine" in desc_low.split("\n", 3)[:2][0:1]:
            return None
    return TriggerHit("tier_2_unanimous_single_round",
                      f"All R1 positions ratify across {len(ctx.r1)} brains; no R2 refinement surfaced.")


def predicate_tier_2_post_disagreement_collapse(ctx: TriggerContext) -> Optional[TriggerHit]:
    """R1 had non-ratify positions but R2 converged on ratify."""
    if ctx.tier != 2:
        return None
    if not ctx.r1 or not ctx.r2:
        return None
    r1_non_ratify = [b for b, r in ctx.r1.items() if r.get("position") != "ratify"]
    r2_all_ratify = all(r.get("position") == "ratify" for r in ctx.r2.values())
    if r1_non_ratify and r2_all_ratify and len(ctx.r2) >= 2:
        return TriggerHit("tier_2_post_disagreement_collapse",
                          f"R1 had non-ratify positions ({', '.join(r1_non_ratify)}); R2 collapsed to unanimous ratify.")
    return None


def predicate_tier_2_brain_discomfort(ctx: TriggerContext) -> Optional[TriggerHit]:
    """A brain explicitly flagged unease in R2 but ratified anyway."""
    if ctx.tier != 2:
        return None
    if not ctx.r2:
        return None
    discomfort_patterns = [
        r"\bstill unsettled\b", r"\bunresolved tension\b",
        r"\bnot fully satisfied\b", r"\blive risk\b",
        r"\bworth flagging\b", r"\bhonest concession\b",
        r"\bperformative dimension\b", r"\bfragile\b.*\bconcession\b",
    ]
    for brain, r in ctx.r2.items():
        if r.get("position") != "ratify":
            continue
        text = (r.get("description") or "").lower()
        hit = _matches_any(text, discomfort_patterns)
        if hit:
            return TriggerHit("tier_2_brain_discomfort",
                              f"Brain {brain} ratified but flagged discomfort (matched /{hit}/).")
    return None


def predicate_tier_2_new_automation_authority(ctx: TriggerContext) -> Optional[TriggerHit]:
    if ctx.tier != 2:
        return None
    text = _haystack(ctx)
    patterns = [
        r"\bauto[- ]relay\b", r"\bautonomous agent\b",
        r"\bscheduled task\b", r"\bremote agent\b",
        r"\bnew mcp\b", r"\bnew automation\b",
        r"\bnew orchestration flow\b", r"\borchestrator drives\b",
        r"\bbrowser control\b",
    ]
    hit = _matches_any(text, patterns)
    if hit:
        return TriggerHit("tier_2_new_automation_authority",
                          f"Poll introduces new automation authority / orchestration flow (matched /{hit}/).")
    return None


def predicate_tier_2_novelty(ctx: TriggerContext) -> Optional[TriggerHit]:
    """Heuristic: cycle has no preceding cross_poll events and the project has < 3 prior cross-polls.
    Captures first-instance design patterns. Imperfect but honest for v0.1."""
    if ctx.tier != 2:
        return None
    poll_count = 1  # at minimum the current poll
    # 'cross_poll' is in related_event_types if any have happened in this cycle
    if "cross_poll" in ctx.related_event_types:
        # this cycle has cross-polls — count them via the substrate? we already have 1.
        # We can't precisely count here without a query, but absence of any prior
        # convergence in the cycle is a reasonable novelty hint.
        if "convergence" not in ctx.related_event_types:
            return TriggerHit("tier_2_novelty",
                              "First cross-poll convergence in this cycle (no prior convergence events) — novelty signal.")
    return None


def predicate_tier_2_manual_uncertainty(ctx: TriggerContext) -> Optional[TriggerHit]:
    if ctx.tier != 2:
        return None
    if ctx.uncertainty_flag:
        return TriggerHit("tier_2_manual_uncertainty",
                          "Tommy or Claude explicitly flagged uncertainty on this poll.")
    return None


# Order matters: most specific / highest-priority first.
# Substantive subject-matter triggers run before convergence-pattern triggers
# because substance is what shapes the prompt. Among convergence-pattern
# triggers, brain_discomfort is the loudest direct signal (a brain literally
# said "I'm uneasy"), then post_disagreement_collapse (suspicious quick
# agreement), then unanimous_single_round (too easy).
PREDICATES: list[Callable[[TriggerContext], Optional[TriggerHit]]] = [
    predicate_tier_3_mandatory,
    predicate_tier_2_protocol_change,
    predicate_tier_2_schema_change,
    predicate_tier_2_auth_change,
    predicate_tier_2_migration_cutover,
    predicate_tier_2_new_automation_authority,
    predicate_tier_2_brain_discomfort,
    predicate_tier_2_post_disagreement_collapse,
    predicate_tier_2_unanimous_single_round,
    predicate_tier_2_manual_uncertainty,
    predicate_tier_2_novelty,
]


def evaluate_triggers(ctx: TriggerContext) -> Optional[TriggerHit]:
    """Return the first matching trigger or None. Tier-1 always returns None."""
    if ctx.tier == 1:
        return None
    for pred in PREDICATES:
        hit = pred(ctx)
        if hit:
            return hit
    return None
