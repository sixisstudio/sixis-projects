# LAYER_B — First-Class Project Attribution on Events v0.1

**Layer A:** SiXiS Protocol v1.0 at `~/Documents/Claude/Projects/SixiS/SiXiS_Protocol_v1.0md.md`
**Layer B status:** RATIFIED 2026-05-08 by council Tier-3 convergence on polls `ddcda982` (R1) + `7c678bf7` (R2) plus Tommy K2 sovereign ratification (event `f7448f69`).
**Sovereign:** Tommy
**Brains polled:** Claude (Orchestrator), GPT (Architect/Strategist), Deepseek (Reviewer/Cross-checker)

---

## CONTEXT

**Frozen intent (Z1):** Add `events.project_id` as a first-class column to eliminate the wizard-anchor cycle drift at its root. `cycle_id` stops being the proxy for project attribution; events explicitly carry their project via a deterministic, auditable column. Migration 020 + write-path updates across `sixis.py` CLI + wizard backend + read-path simplification + decommission of the patch-style `verify-attribution-drift` detector.

**Why now:** Earlier today shipped a detector + publish gate (`verify-attribution-drift`) that catches drift retroactively. Tommy asked whether the issue is fixed forward — honest answer was no, only detected. Root cause: `events.cycle_id` does two jobs (group events under a unit of work AND determine project attribution via the cycle.project_id join). Drafts conflict with the second job — design events happen before any project-owned cycle exists, so they get shoved into the wizard's anchor cycle (Initiate Project Cycle 1, `37245c60`) as a placeholder, and never rebind after promotion. As long as substrate uses `cycle_id` to derive project attribution, this drift is structurally inevitable.

---

## CLASSIFICATION

| Field | Value |
|---|---|
| `PROJECT_TYPE` | Schema migration with write-path + read-path rewrite |
| `TIER` | **3** — data protocol change to how project attribution is defined; rollback story exists (drop column + revert reads) but the change redefines the canonical attribution path |
| `K3 amendment` | None — K3 governs adversarial governance structure, not event-record schema |
| `ARCHETYPE` | Substrate canonical migration (with shadow path + bake) |
| `SCOPE` | events table + sixis.py CLI write paths + wizard backend write paths + dashboard read paths + detector decommission. Excludes: cycles table changes, projects table changes, polls table (derives from events). |

**Auto-escalation triggers:**
- Manual review population exceeds working threshold (~200 events) → re-poll Q3 backfill strategy.
- Phase D bake surfaces non-trivial drift events that the new architecture should have prevented → escalate to Tier-3 amendment cycle.

---

## RATIFIED DESIGN (do not relitigate without [AMENDMENT])

### Q1 — Schema shape

`ALTER TABLE events ADD COLUMN project_id TEXT REFERENCES projects(id)`. NULL allowed initially. Possible NOT NULL hardening in a future migration if `ambiguous_null` + `system_null` populations prove always-bug.

### Q2 — Tier classification

Tier-3 data protocol change. K2 sovereign ratification by Tommy is the gate before Phase A ships (event `f7448f69`, ratified 2026-05-08). No K3 amendment — K3 governs adversarial governance, not data schema.

### Q3 — Backfill strategy

Full historical backfill with **6-class provenance taxonomy** stored in `events.metadata.backfill_source`:

| Class | When it applies | NULL? |
|---|---|---|
| `write_time` | New events going forward — write path captured `project_id` at insertion | No |
| `derived_from_cycle` | Bulk historical backfill via `cycle.project_id` join | No |
| `wizard_anchor_drift_repaired` | Historical event reassigned from wizard anchor cycle (37245c60) to its actual project, using `draft_promoted_to_project` + `project_create` lineage | No |
| `manual_reviewed` | Human inspected an ambiguous case and made a best judgment with rationale logged in `metadata.review_rationale` | No |
| `ambiguous_null` | Insufficient or conflicting evidence for any project attribution | Yes |
| `system_null` | Genuinely projectless events (orchestrator health, pre-project system events) | Yes |

**Pre-ship scoping (mandatory before Phase B executes):** Count events that fall outside the deterministic classes (`derived_from_cycle` / `wizard_anchor_drift_repaired`). If the count of `manual_reviewed` candidates exceeds ~200, fire a follow-on Tier-2 design poll on volume management before bulk human review.

### Q4 — Phasing (5 phases)

| Phase | Deliverable | Verification gate |
|---|---|---|
| A | Migration 020: schema column + indexes | Schema applied, no existing query broken, audit-anchor event logged |
| B | Bulk historical backfill with provenance class per row | `manual_reviewed` count under threshold; project_id NULL only on `ambiguous_null` + `system_null` rows |
| C | Write-path updates — `sixis.py` CLI + wizard backend + orchestrator helpers populate `project_id` at insertion. `verify-attribution-drift` watches new events for correct population. | 14-day bake with zero unexpected NULLs on new events |
| D | Read-path switch — dashboard queries change to `WHERE events.project_id = X`. Pattern Recognition + Active Attention Engine predicates simplified. | Project counts match pre-switch values within ±2 events; wizard-born events resolve via explicit project_id, not cycle anchor |
| E | `verify-attribution-drift` decommission | 14-day clean post-Phase-D + zero new NULLs + count parity + wizard-born resolution |

### Q5 — Detector retirement

`verify-attribution-drift` is kept active through Phase D as a tripwire. Retirement criteria (all required, post-Phase-D):
- 14 days clean (no drift events fired)
- Zero new events with unexpected `project_id IS NULL`
- Dashboard project counts match expected project views (within ±2 events for backfill ambiguity)
- Wizard-born project events resolve through explicit `project_id`, not cycle anchor

If any criterion fails during bake → investigate, fix root cause, reset bake clock.

---

## CYCLE STRUCTURE

| Cycle | Name | Deliverable |
|---|---|---|
| 0 | Layer B ratification (this cycle, `a560115b`) | Council R1+R2 convergence + Tommy K2 ratification ✓ |
| 1 | Phase A — Schema migration | Migration 020 + audit-anchor event |
| 2 | Phase B — Historical backfill | Pre-ship scoping → bulk backfill → manual review pass |
| 3 | Phase C — Write-path population | sixis.py + wizard backend + orchestrator helpers |
| 4 | Phase D — Read-path switch | Dashboard + Pattern Recognition + AAE predicates |
| 5 | Phase E — Detector retirement | After clean bake |

---

## FORCED RULES (project-specific)

**FORCED_RULE_EPA_01 — `project_id` is set at write time post-Phase-C.**
After Phase C ships, every new event MUST have `project_id` populated unless explicitly classified `system_null` (with `metadata.backfill_source = "system_null"` and a documented reason). Write paths that fail to populate `project_id` are a Phase-C bug, not an acceptable runtime state.

**FORCED_RULE_EPA_02 — Provenance class is part of the audit claim.**
`project_id` alone is not the whole audit claim. `metadata.backfill_source` MUST be present for every backfilled event and SHOULD be present for new events (set to `write_time`). Readers MUST treat the value as derivation-dependent: `derived_from_cycle` is auditable but transitively trusts the cycle→project assignment; `wizard_anchor_drift_repaired` is auditable through the draft→project lineage; `manual_reviewed` is auditable through the reviewer + rationale fields.

**FORCED_RULE_EPA_03 — Substrate immutability is preserved.**
Backfill MUST NOT modify pre-existing event values other than adding `project_id` and the corresponding metadata fields. The original `cycle_id` is unchanged on every backfilled row so the cycle→project join path remains available for independent verification. UPDATE statements during backfill are scoped to the new fields only.

**FORCED_RULE_EPA_04 — Detector retirement requires explicit criteria fulfillment.**
`verify-attribution-drift` cannot be removed by judgment call. The retirement criteria (Q5 above) MUST all be satisfied AND that satisfaction MUST be logged as a `change_published` event referencing this Layer B before the detector is decommissioned. Premature decommission is a Phase-E bug.

---

## DEFERRED TO PHASE 2 / FUTURE PROJECTS

- **Confidence-of-derivation gap** (DeepSeek R2 flag): `derived_from_cycle` records the method but not the trustworthiness of the join's input. If a cycle was incorrectly assigned to a project, the derived value propagates that error. Future refinement candidate: paired cycle-attribution audit pass, OR a `confidence_score` field on backfill metadata.
- **NOT NULL hardening:** If post-bake review shows `ambiguous_null` + `system_null` populations are always-bug rather than legitimate, schedule a follow-on migration to enforce NOT NULL with a sentinel.
- **Wizard backend write-path update:** Phase C touches the Railway-hosted wizard backend. May require a separate Railway deploy + bake.

---

*End of LAYER_B for First-Class Project Attribution on Events v0.1. Binding on all Cycle 1+ work. Any change requires `[AMENDMENT]` per Universal Shell Section 4.8.*
