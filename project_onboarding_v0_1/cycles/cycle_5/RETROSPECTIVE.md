# Cycle 5 Retrospective — project-onboarding-v0-1 Phase 1

**Cycle 5 type:** META, REVIEW
**Status:** Shipped 2026-05-06
**Retrospective input:** session-level substrate data from project-onboarding-v0-1 Cycle Zero through Cycle 4 (5 cycles shipped, 9 friction events, 13 amendment_proposed events, 1 breakdown event). The Layer B's original Cycle-5 framing assumed retrospective input would come from "≥1 real new project flowing through end-to-end" via wizard usage; sovereign overrode that gate at session end with directive "keep going" — meaningful retrospective material existed in the development substrate itself, not just user-facing wizard runs.

---

## What shipped (Phase 1, Cycles 1–4)

End-to-end project-onboarding wizard at http://localhost:8787:

- **Cycle 1:** schema migration 010 (9 wizard-lifecycle event types + WAL journaling), `/new-project` route on the existing local `sixis dashboard` HTTP server, brain-dump form, click-to-copy launch with discovery_drill v1 template lazy-seeded from substrate, `ui_launch_event` firing on Copy, sidebar entry **+ Start New Project**.
- **Cycle 2:** schema migration 011 (`discovery_synthesis_logged`), 5 new CLI commands (`prompt-template-add`, `log-discovery-answer`, `log-discovery-synthesis`, `log-discovery-complete`, `report-breakdown`), drafts panel + `/drafts` route, resume view + `/draft/<id>` route with full state machine, discovery prompt template v2 with embedded CLI command templates and ID metadata, `classify` CLI for friction-amendment workflow, handler reads template content from substrate (not hardcoded constant).
- **Cycle 3:** schema migration 012 (`brain_response_logged`), three new prompt templates (`council_prompt_generator`, `council_round_2_generator`, `layer_b`), `log-brain-response` + `verify-amendment-ordering` CLI commands, `apply_ratified_amendment` Python helper, full council-ratification UI flow on `/draft/<id>` (council prompt generation → Round 1 collection → Round 2 cross-check → RATIFY/REFUSE keyword-gated convergence declaration → Layer B file written to `~/Documents/Claude/Projects/SixiS/projects/<slug>/layer_b/`).
- **Cycle 4:** schema migration 013 (`amendment_applied_to_rules`), pending-amendments widget + sidebar pill, `/amendments` list page + `/amendment/<id>` detail page, POST `/api/ratify-amendment` (gated by ≥2 distinct brains with `position='ratify'` per amendment 83614b20), POST `/api/override-amendment` requiring explicit reason, floating `⚠ Report friction` button on every wizard surface + POST `/api/report-friction`, ASCII-safe error responses.

**Cycle Zero deliberation:** 6 cross-polls executed (1 design + 1 superseded + 1 sharpened design + 1 synthesis-validation + 1 corrections-validation + 1 council ratification with mandatory 2-round). 6 breakdowns observed at orchestrator-to-sovereign interface, all caught by sovereign in real time — each one generated either a candidate Universal Shell amendment, a project-specific FORCED_RULE_PO, or both.

---

## Patterns observed

### Pattern 1 — Orchestrator forward-velocity bias at sovereignty-gate transitions (8 instances)

Across this session, the orchestrator was caught 8 times for variants of the same family: routing decisions to sovereign when the bypass rule, council ratification, or polling-first discipline indicated otherwise; menu-asking when convergence was already obvious; pausing for status reports at deliverable boundaries within ratified scope. The breakdowns clustered tightly and Tommy caught every one. Two of them were repeats logged as `friction` events with explicit "REPEAT of breakdown <id>" framing — pattern persists even after immediate prior corrections.

The **Breakdown-Detection Mechanism** candidate amendment (07342af4) was *designed in this very session* to address exactly this pattern (HALF B Orchestrator Self-Audit at sovereignty-gate transitions). The amendment has been ratified into the candidate Universal Shell queue but is not yet promoted into the operational protocol — meaning the orchestrator continued making the same family of breakdowns AFTER designing the rule that would prevent them, demonstrating the rule's necessity but also flagging that candidate-queue-status is not enforcement.

### Pattern 2 — Council 2-round mandatory ratification converged cleanly (4 of 4)

Per amendment 926869fb, all four ratification flows ran the mandatory 2-round procedure. In every case, both brains DEFENDED RATIFY in Round 2 after seeing the other's Round 1 — no `[ADOPTING_FROM]` needed, no third positions, no K3 counters strong enough to refuse. The Round 2 cross-check pattern reliably surfaces the cross-reinforcement that strengthens shared confidence rather than producing new disagreement.

Material disagreements that did emerge were resolved in Round 2 of design polls (FORCED_RULE_03 trigger), not ratification rounds. Two cases: the Cycle-3 Q2 storage-form crossing (each brain pivoted toward the other's Round-1 position; resolved via synthesis), and the Cycle-4 Q1 inline-vs-multi-step ratification UX (GPT introduced a Round-2 third position incorporating both Round-1 concerns; Deepseek had adopted GPT's Round-1 without seeing the Round-2 third — synthesis adopted the third position).

### Pattern 3 — Bypass rule materially accelerated shipping (Cycles 2–4)

After Tommy surfaced the **Reversibility-Based Bypass** candidate amendment mid-session (event f6519fa2), Cycles 2-4 shipped without sovereign-verification gates on every reversible deliverable. Schema migrations, CLI command additions, UI changes, route additions all proceeded under bypass classification. Sovereign retained override authority via explicit override events; no rollback was needed in any cycle.

The rule's cost-dimension refinement (added in ratification per both brains' convergent Round-1 caveat — "low-cost operationally reversible" with explicit criteria a-e + sovereign_gate_bypass event + protocol_version_ref) did not slow Cycles 2-4 because none of those deliverables triggered the high-cost-reversible category. The rule's discrimination logic stayed dormant, which is the desired behavior for v0.1 scope.

### Pattern 4 — Synthesis-ratification gate fired naturally without procedural overhead

The **Synthesis-Ratification Gate** candidate amendment (48c9dda2) was operationalized in this session by routing every binding synthesis through a council ratification cross-poll under 2-round mandatory. Pattern: orchestrator synthesizes from convergence → council ratifies the synthesis → only then is artifact binding. This added 2 cross-polls per cycle (design ratification + corrections-validation when needed) but caught real synthesis-side errors in 2 of 4 cycles (Cycle Zero Layer B over-formalization in the very first ratification; Cycle 1 schema design's wizard_step_completed scope; Cycle 3 storage-form positions-crossed-over; Cycle 4 inline-vs-panel synthesis adopted GPT's Round-2 third position over Deepseek's adopted-from-GPT-Round-1).

The gate works. It's worth Universal-Shell promotion in a future meta-cycle.

### Pattern 5 — Per-brain pair prompt pattern is non-negotiable

Mid-session orchestrator proposed switching to single-broadcast prompts as a token-efficiency win without auditing why per-brain-pair was the standing pattern. Tommy reverted with the operational evidence: Deepseek confuses itself as GPT under broadcast prompts. The breakdown was logged, recommendation reverted. Token cost is the price of role-correctness.

This pattern *should* be folded into the Breakdown-Detection self-audit when that amendment promotes — orchestrator-side proposals to change established patterns must explicitly query "what failure mode does the current pattern prevent that my change would re-introduce."

### Pattern 6 — `json_extract` over `LIKE` in metadata queries

Bug surfaced in Cycle 3 implementation: SQLite `json_object()` produces JSON without space after colons; Python `json.dumps` produces JSON WITH space. `LIKE '%"draft_id": "..."%'` patterns matched Python-generated metadata but not SQL-direct seeded data. Fix was to switch to `json_extract(metadata, '$.draft_id') = ?` for all metadata lookups in the dashboard handler. Production wizard flow was unaffected (consistent Python generation throughout) but the brittleness on whitespace is a real K7 concern when external tools (CLI scripts, test seeds, future contributors) write events.

---

## New candidate Universal Shell amendments surfaced from retrospective

The following pattern observations warrant amendment-proposed events (to be logged separately for individual ratification flows):

1. **Candidate-queue-status is not enforcement.** The Breakdown-Detection Mechanism (07342af4) was ratified into the candidate queue but the orchestrator kept making the same breakdowns it was designed to prevent. Pattern argues for a separate Universal Shell mechanism: candidate amendments that observably prevent ongoing breakdowns get an accelerated promotion path to actual protocol promotion, not the standard meta-cycle queue.

2. **Per-brain pair pattern as universal council-poll standard.** Implicit standing pattern that the orchestrator can erode. Worth explicit Universal-Shell codification + acceptance criteria for any proposed alternative.

3. **`json_extract` over `LIKE` for substrate metadata queries.** Project-level coding convention worth promoting to Universal Shell schema-discipline section. K7 brittleness otherwise.

These will be logged as separate `amendment_proposed` events (not in this retrospective document — per the synthesis-ratification gate, each amendment proposal goes through its own ratification cycle).

---

## Project-onboarding-v0-1 Layer B amendments warranted

1. **Cycle 5 input source clarification.** Original Layer B framing assumed Cycle 5 retrospective input would come from "≥1 real new project flowing through end-to-end" via wizard usage. Real-session data (this development cycle itself) is also legitimate retrospective input. Layer B should clarify both sources are valid, with the development-substrate path serving as the bootstrap pattern when no user-facing usage exists yet.

2. **Phase 2 entry condition.** Layer B says phase 2 is browser-control. Cycle 5 is the natural transition gate to phase 2 scoping. Worth amending Layer B to explicitly state: phase 2 scoping cycle opens when Cycle 5 closes with retrospective shipped.

These will be logged as `amendment_proposed` events targeting the project's Layer B (not the Universal Shell).

---

## Phase 2 strategy feed (per Layer B Cycle-5 deliverable)

Phase 2 is **Claude-driven browser-control to remove copy/paste** per ratified Layer B. Phase 2 scoping cycle should address:

- **Auth boundary** — already queued as amendment 9a1b1b17 (FORCED_RULE_PO_04 phase-2 attribution requirement). Phase 2 work cannot begin until `X-Sixis-Agent` header (or equivalent) is designed, ratified, and implemented. This is a hard prerequisite.
- **Browser-control technology choice** — Chrome MCP / DOM-aware extension (lighter, already-installed per Tommy's setup) vs `chrome-cli` for tab control vs computer-use pixel-level. Worth a design cross-poll.
- **Replacement of paste-prompts with browser-driven paste** — the per-brain pair pattern still applies (avoid single-broadcast role-confusion). Browser-control must navigate to GPT and Deepseek tabs separately, paste each prompt, capture each response.
- **Substrate write attribution** — phase-2 brain_response_logged events need `source='claude_code_browser_control'` (or new source value) so the substrate distinguishes agent-driven from human-driven responses. Schema migration if new source value needed.
- **Failure modes specific to phase 2** — browser tab navigation timing, response stream incompleteness, MCP/extension session expiration. Need explicit error-handling design.

Phase 2 is a Tier-3 escalation per Layer B (auto-escalates when "Phase 2 (browser-control) work begins"). Tommy must explicitly ratify phase-2 entry.

---

## Phase 1 status: COMPLETE

5 cycles shipped (Cycle Zero + Cycles 1-4) plus this Cycle 5 retrospective. Wizard end-to-end functional. 13 amendment_proposed events queued (8 candidate Universal Shell amendments + 5 project-level / cross-project / smoke-test). 9 friction events captured (8 real breakdowns + 1 smoke test). Substrate fully reconstructable per K7.

Phase 2 scoping awaits sovereign Tier-3 ratification per Layer B escalation triggers.

*End of Cycle 5 Retrospective. Generated 2026-05-06.*
