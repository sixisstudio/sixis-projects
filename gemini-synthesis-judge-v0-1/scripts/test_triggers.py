"""Smoke test for trigger predicates — exercises each of the 11 predicates
(1 Tier-3 + 10 Tier-2 categories) on synthetic substrate states.

Each test builds a TriggerContext directly (no DB) and asserts the expected
predicate fires. This avoids polluting the real substrate with synthetic polls
while still verifying the predicate logic end-to-end.

Run: python3 scripts/test_triggers.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from triggers import (  # type: ignore
    TriggerContext,
    evaluate_triggers,
    predicate_tier_3_mandatory,
    predicate_tier_2_protocol_change,
    predicate_tier_2_schema_change,
    predicate_tier_2_auth_change,
    predicate_tier_2_migration_cutover,
    predicate_tier_2_unanimous_single_round,
    predicate_tier_2_post_disagreement_collapse,
    predicate_tier_2_brain_discomfort,
    predicate_tier_2_new_automation_authority,
    predicate_tier_2_novelty,
    predicate_tier_2_manual_uncertainty,
)


def ctx(tier=2, question="", convergence_text="", r1=None, r2=None,
        related=None, uncertainty=False) -> TriggerContext:
    return TriggerContext(
        poll_id="poll_synthetic",
        cycle_id="cycle_synthetic",
        tier=tier,
        question=question,
        convergence_text=convergence_text,
        r1=r1 or {},
        r2=r2 or {},
        project_id="p_test",
        related_event_types=set(related or []),
        uncertainty_flag=uncertainty,
    )


def expect_fire(c, expected_category):
    hit = evaluate_triggers(c)
    assert hit is not None, f"expected fire on {expected_category}, got skip"
    assert hit.category == expected_category, (
        f"expected category {expected_category!r}, got {hit.category!r} ({hit.reason})"
    )
    return hit


def expect_skip(c):
    hit = evaluate_triggers(c)
    assert hit is None, f"expected skip, got fire: {hit.category} — {hit.reason}"


# ---------------------------------------------------------------------------
# Cases


def test_tier_3_mandatory():
    c = ctx(tier=3, question="Should we delete the substrate?")
    expect_fire(c, "tier_3_mandatory")


def test_tier_1_always_skip():
    c = ctx(tier=1, question="Add migration column for schema change with amendment.")  # would otherwise match
    expect_skip(c)


def test_tier_2_protocol_change():
    c = ctx(tier=2, question="Proposed amendment to FORCED_RULE_PO_03 — adjust K3 enforcement.")
    expect_fire(c, "tier_2_protocol_change")


def test_tier_2_schema_change():
    c = ctx(tier=2, question="Migration 019 adds a new event type and ALTER TABLE on events.")
    expect_fire(c, "tier_2_schema_change")


def test_tier_2_auth_change():
    c = ctx(tier=2, question="Enable RLS on projections and revoke service-role write.")
    expect_fire(c, "tier_2_auth_change")


def test_tier_2_migration_cutover():
    c = ctx(tier=2, question="Cutover plan: 14-day shadow mode followed by canonical-source switch.")
    expect_fire(c, "tier_2_migration_cutover")


def test_tier_2_new_automation_authority():
    c = ctx(tier=2, question="Add auto-relay default ON for cross-poll. Orchestrator drives all brains.")
    expect_fire(c, "tier_2_new_automation_authority")


def test_tier_2_unanimous_single_round():
    r1 = {
        "gpt": {"position": "ratify", "description": "RATIFY"},
        "deepseek": {"position": "ratify", "description": "RATIFY"},
        "claude": {"position": "ratify", "description": "RATIFY"},
    }
    c = ctx(tier=2, question="Where to render attention queue badge.", r1=r1, r2={})
    expect_fire(c, "tier_2_unanimous_single_round")


def test_tier_2_post_disagreement_collapse():
    r1 = {
        "gpt": {"position": "refine", "description": "REFINE not ratify"},
        "deepseek": {"position": "ratify", "description": "RATIFY"},
        "claude": {"position": "ratify", "description": "RATIFY"},
    }
    r2 = {
        "gpt": {"position": "ratify", "description": "RATIFY after refinement"},
        "deepseek": {"position": "ratify", "description": "RATIFY"},
        "claude": {"position": "ratify", "description": "RATIFY"},
    }
    c = ctx(tier=2, question="Pick test framework.", r1=r1, r2=r2)
    expect_fire(c, "tier_2_post_disagreement_collapse")


def test_tier_2_brain_discomfort():
    r1 = {
        "gpt": {"position": "ratify", "description": "RATIFY"},
        "deepseek": {"position": "ratify", "description": "RATIFY"},
    }
    r2 = {
        "gpt": {"position": "ratify",
                 "description": "RATIFY but flagging an unresolved tension I'm not fully satisfied with — performative dimension here. Live risk."},
        "deepseek": {"position": "ratify", "description": "RATIFY"},
    }
    c = ctx(tier=2, question="Rollout plan.", r1=r1, r2=r2)
    expect_fire(c, "tier_2_brain_discomfort")


def test_tier_2_novelty():
    # cycle has cross_poll but NO convergence yet (first poll in the cycle)
    c = ctx(tier=2, question="Pick the icon for the new badge.",
            related=["cross_poll", "round_2_cross_check"])
    expect_fire(c, "tier_2_novelty")


def test_tier_2_manual_uncertainty():
    # benign question with uncertainty flag set in metadata
    c = ctx(tier=2, question="Pick the icon for the new badge.",
            related=["cross_poll", "convergence"], uncertainty=True)
    expect_fire(c, "tier_2_manual_uncertainty")


def test_tier_2_routine_skips():
    # Tier-2 with no matching trigger — routine design poll should skip.
    c = ctx(tier=2, question="Where should the dropdown go on the dashboard nav?",
            r1={"gpt": {"position": "ratify", "description": "RATIFY top-right"}},
            r2={"gpt": {"position": "ratify", "description": "RATIFY top-right"}},
            related=["cross_poll", "convergence"])
    expect_skip(c)


def main():
    cases = [
        ("Tier-3 mandatory", test_tier_3_mandatory),
        ("Tier-1 always skip", test_tier_1_always_skip),
        ("Tier-2 protocol change", test_tier_2_protocol_change),
        ("Tier-2 schema change", test_tier_2_schema_change),
        ("Tier-2 auth change", test_tier_2_auth_change),
        ("Tier-2 migration/cutover", test_tier_2_migration_cutover),
        ("Tier-2 new automation", test_tier_2_new_automation_authority),
        ("Tier-2 unanimous single-round", test_tier_2_unanimous_single_round),
        ("Tier-2 post-disagreement-collapse", test_tier_2_post_disagreement_collapse),
        ("Tier-2 brain discomfort", test_tier_2_brain_discomfort),
        ("Tier-2 novelty", test_tier_2_novelty),
        ("Tier-2 manual uncertainty", test_tier_2_manual_uncertainty),
        ("Tier-2 routine (skip)", test_tier_2_routine_skips),
    ]
    failures = 0
    for name, fn in cases:
        try:
            fn()
            print(f"  ok  {name}")
        except AssertionError as e:
            failures += 1
            print(f"  FAIL  {name}: {e}")
    print(f"\n{len(cases) - failures}/{len(cases)} passed")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
