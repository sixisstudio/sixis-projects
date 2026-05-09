# LAYER_B — Logging Discipline Remediation v0.1

**Layer A:** SiXiS Protocol v1.0 at `~/Documents/Claude/Projects/SixiS/SiXiS_Protocol_v1.0md.md`
**Layer B status:** RATIFIED 2026-05-08 by Judge+council loop per FORCED_RULE_LDR_02 (Judge re-adjudication null verdict on poll ab2fbb04 / convergence 21c49317).
**Sovereign:** Tommy
**Brains polled:** Claude (Orchestrator), GPT (Architect/Strategist), DeepSeek (Reviewer/Cross-checker), Gemini Judge (K3-auditor + K2-relief-adjudicator)
**Cycle Zero ratification path:** Judge comprehensive review (a44b7c62) → council vote R1+R2 (poll ecbf9d80, convergence 182b92e4) → Judge audit flagged (d3e4e763) → council remediation R1+R2 (poll ab2fbb04, convergence 21c49317) → Judge re-adjudication NULL (dee6bae1) → ratified.

---

## CONTEXT

This project houses the council-protocol hardening that grew out of the Gemini Synthesis Judge surfacing a procedural bypass on 2026-05-08 (judge_flag 883969d9). Distinct from:

- **Gemini Synthesis Judge v0.1** — owns Judge mechanics (K3-auditor + K2-relief-adjudicator role, GJ_01..09 rules)
- **First-Class Project Attribution on Events v0.1** — owns the events.project_id schema work + 5-phase ship

This project owns: orchestrator-discipline rules, council voting protocol, Judge-in-the-loop ratification flow, and the routing rules that govern how Tommy's K2 sovereign attention is consumed vs. preserved.

---

## RATIFIED RULES (final forms, post-remediation)

### FORCED_RULE_LDR_01 — Orchestrator default-action discipline

The orchestrator's default action on any Tier-1/2 procedural decision is **TO PROCEED** via the appropriate routing (Tier-1 = decide-and-execute, Tier-2 = Judge → council per GJ_09 v2). Stopping, freezing, or surfacing-to-Tommy is a routing failure unless one of these conditions is met:

1. The decision is genuinely Tier-3 (irreversible kernel-level)
2. The Judge or council has identified a Tier-3 component during routing
3. A red-line is hit (data destruction, money movement, account creation, prohibited actions)
4. Explicit ambiguity that no current rule addresses (genuinely-novel context)
5. **A Tier-2 `judge_flag` from FORCED_RULE_GJ_07 has fired and remediation is in progress** — pause scope is limited to the **affected remediation chain only**; unaffected workstreams continue in parallel (per Q-Rem-A scoped-halt convergence). **Resumption of the affected chain is gated on BOTH (a) council deliberation completing AND (b) the 2/3-majority vote concluding** (per Tommy clarification 2026-05-08, ratifying Reading A). Deliberation alone is not sufficient; the vote is the gate. This applies whether the GJ_07 cycle is EXPEDITED (1-round expedited vote) or STANDARD (full 2-round vote).

Specifically prohibited "courtesy" patterns that constitute routing failures:
- "Want me to draft X for review, or send directly?"
- "Want me to drive next step or pause?"
- "Should I do A or B?" on procedural matters
- Phrasings ending in implicit ask-for-permission like "ready when you are"

Each occurrence is logged as `friction` with category `orchestrator_freeze_routing_failure` for Pattern Recognition surfacing.

### FORCED_RULE_LDR_02 — Sovereign Ratification Flow with Judge Pre-Audit Gate

> **[AMENDED 2026-05-09 by Tommy K2-stamp on polls 592decc3 + ecb8bc8f.](../../../dashboard_v0_1/sixis_dashboard.db)** Original v0.1 form of this rule (which delegated routine Tier-3 ratifications to the Judge+council loop without Tommy K2-stamp) was found to contradict K2 inalienability under the "no inference from absence of objection" clause. Wholesale replacement below; substrate is canonical (see `rules` table for FORCED_RULE_LDR_02 description).

For Tier-3 decisions:

1. Council deliberates (R1 + R2 per amendment 926869fb).
2. Council convergence → **Judge audits the convergence FIRST**.
3. **If Judge returns null verdict (no flags):** the Judge **recommends ratification to Tommy**. Tommy must provide an explicit K2-stamp; absence of objection or non-response is **NOT** ratification (per K2 inalienability). The Judge+council loop does **not** possess ratification authority.
4. **If Judge flags:** council remediates the flagged items (sub-deliberation, R1+R2). Affected remediation chain pauses under FORCED_RULE_GJ_07; unaffected work continues.
5. **After remediation:** back to Judge for re-adjudication.
6. **If Judge confirms remediation clean:** Judge recommends ratification; Tommy K2-stamps.
7. **If Judge still flags OR council can't reach 2/3 convergence on remediation:** escalate to Tommy for K2 sovereign ratification with full audit context.
8. **Graceful-retry limit:** maximum 3 cycles of (council remediation → Judge re-adjudication). After 3 cycles without convergence, mandatory escalation to Tommy regardless of Judge verdict.

For Tier-2 decisions: Tommy K2-stamps **unless** a bounded standing approval exists for that specific procedural class. Standing approvals must be **explicit (named class), bounded (specific scope), revocable, and logged**. Tommy may explicitly K2-stamp scoped delegation rules naming Tier-2 procedural classes (e.g., dashboard publish, routine schema migration).

For Tier-1 decisions: orchestrator proceeds per LDR_01 unless a specific FORCED_RULE requires Judge routing or escalation.

K2 is **inalienable at Tier-3**. Every Tier-3 ratification requires Tommy's explicit K2-stamp. Subordination clause: any language elsewhere in the protocol corpus implying autonomous Judge or council ratification authority is subordinate to this rule and must be corrected when discovered.

### Layer B threshold enforcement (Option D — BINDING/ADVISORY grammar + threshold_check events)

All Layer B threshold rules MUST explicitly declare their type as either:

- **BINDING** — orchestrator MUST honor the threshold; crossing it without firing the mandated downstream action (e.g., follow-on poll) is a substrate violation.
- **ADVISORY** — threshold serves as a notification signal; orchestrator may proceed past it but should log notice.

For every BINDING threshold, the orchestrator MUST log a `threshold_check` event before any bulk operation that crosses the limit. The event records: threshold name, observed value vs. limit, the action taken (poll fired / threshold-honored / overridden with reason).

Combines auditability (every binding-threshold crossing has a paired event) with operational flexibility (advisory thresholds remain advisory).

### Path 2 cadence separation (separation of concerns)

Work-level remediation (e.g., backfill cleanups) is structurally separate from protocol-level refinement (e.g., rule hardening). They flow as distinct council polls even when they originate from the same Judge flag. Prevents incident-response urgency from distorting protocol-architecture decisions.

### Volume management on substrate-attribution events (hybrid heuristic-first + manual-residual)

When the substrate has bulk events lacking attribution (e.g., the 316 ambiguous_null events from `events-project-attribution` Phase B): execute a heuristic re-classification pass FIRST using timestamp + draft-lineage signal (even where draft_promoted_to_project events are absent). Manual review is reserved for residual high-interest events the heuristic cannot resolve. Confidence-scored provenance class for heuristic-derived attributions.

### FORCED_RULE_substrate_import_completion — Cycle close gates on layer_b-to-substrate import

A cycle that ratified one or more rules in a project's `layer_b/LAYER_B_*.md` file cannot close with `outcome='shipped'` until those rules exist as `rules` table rows whose `stable_id` matches the layer_b heading. The `cycle-end` command runs the precondition: parse the project's layer_b for `### FORCED_RULE_*` headings, query the rules table for matching stable_ids, refuse to close on missing imports.

**Why:** Layer_b markdown is canonical for human review, but the dashboard, drift detector, and linkifier all read the substrate. A rule that exists only in markdown is invisible to every automated check. Today's session surfaced 11 GJ_/LDR_ rules that had been invisible across multiple sessions before the reconciliation pass caught them.

**How to apply:** `cmd_cycle_end` calls a precondition checker before the UPDATE. The checker compares `### FORCED_RULE_*` heading set against `rules.stable_id` set; reports any layer_b headings that lack a matching substrate row. Refuses to close until clean.

**Tier:** 2. Reversible. Sovereign override `--skip-import-check` available; logs `sovereign_attribution_override` event so the gap is visible in audit. Ratified by Gemini Judge direct-decision in adjudicator mode 2026-05-08 (judge_attempted event evt_judge_attempted_three_rules).

### FORCED_RULE_event_type_canonical — Catch-all event type with metadata flag is a violation when distinct type accumulates

Using a catch-all event type (`schema_migration` or any other) with a metadata flag to denote a semantically distinct event is a substrate violation when the distinct type pattern is referenced more than twice in code or surfaced in any UI/query path. The fix is always a CHECK-enum migration, never another metadata flag.

**Why:** Metadata-flag workarounds masquerade as the real type. Once the pattern accumulates 3+ uses, type semantics rot — `WHERE type='X'` returns a heterogeneous mix that no consumer can reason about. Today this happened with `heuristic_pass_completed`, `detector_retired`, and `threshold_check`, all of which were undetectable via type filters until Migration 024.

**How to apply:** Detector (warn primitive — Judge-amended from publish-gate-block per Q4 ruling, to permit intentional temporary schema drift during prototyping) scans the codebase for `INSERT INTO events ... type='schema_migration'` (or other catch-all) with metadata flags that look like type-substitutions (`X_completed` naming, names not in established schema-migration metadata fields like `migration` or `phase`). On match exceeding 2 uses, surfaces a recommendation to ship a CHECK-enum migration.

**Tier:** 2. Mechanical safety standard — NO sovereign override (Judge ruling on Q3). Ratified by Gemini Judge direct-decision 2026-05-08.

### FORCED_RULE_render_consistency — Authored text must pass through linkifyDescription, not bare escape()

Every dashboard render path that displays user-authored description / intent / question / convergence-summary text MUST pass that text through `linkifyDescription`, not bare `escape()`. Bare-escape rendering of authored text is a substrate violation; publish-gate blocks if the scan finds any.

**Why:** `linkifyDescription` is the contract for "make protocol references navigable." Bypassing silently breaks the link-and-tooltip affordance for the user, who has no automated signal that a render path was forgotten. Today's gap (cycle intents in `cyclesBody` and `q1Body` panels) was visible only because the user noticed manually.

**How to apply:** Static scanner in publish path greps `ui/index.html` (and any future UI files) for `${escape(...)}` interpolations whose source is a description / intent / question / summary field. Allowlist non-authored cases (timestamps, slugs, statuses, type tags, archetype). On match, publish-gate emits a violation pointing at file:line.

**Tier:** 2. Mechanical safety standard — NO sovereign override (Judge ruling on Q3). Publish-gate (block) primitive (Judge ruling on Q4: statically verifiable). Ratified by Gemini Judge direct-decision 2026-05-08.

---

## OPEN FOLLOW-ON

- **Severity-tiered remediation (EXPEDITED/STANDARD):** ratified at 2/3 majority in remediation Q-Rem-B with GPT R2 dissenting toward phased deferral. The form is ratified upfront but is candidate for Tier-2 re-poll if measured throughput degradation appears (council-override-on-misclassification serves as the in-band feedback path).
- **Structured-presumptive trigger taxonomy (VIOLATION_ONLY / STRUCTURAL_AMBIGUITY / STRUCTURAL_GAP / STRUCTURAL_UNINTENDED):** ratified for FORCED_RULE_GJ_08. The Judge applies the categorical taxonomy AT FLAG TIME; refinement-candidate logging fires presumptively on STRUCTURAL_*. Council can reclassify during normal deliberation flow. The "reasoning that implies" hardening clause from the prior R2 is dropped in favor of explicit Judge categorization.
- **Universal Shell promotion:** LDR_01 + LDR_02 + GJ_07 + GJ_08 (refined) + GJ_09 v1 + GJ_09 v2 are all candidates for Universal Shell promotion in the next meta-cycle. They generalize beyond Logging Discipline to any K3-auditor + council deliberation framework.

---

*End of LAYER_B for Logging Discipline Remediation v0.1. Binding on all Cycle 1+ work after the Judge+council loop ratification recorded above. Any further change requires `[AMENDMENT]` per Universal Shell Section 4.8.*
