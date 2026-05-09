# LAYER_B — Project Onboarding Flow v0.1 (Phase 1 of 3)

**Layer A:** SiXiS Protocol v1.0 at `~/Documents/Claude/Projects/SixiS/SiXiS_Protocol_v1.0md.md`
**Layer B status:** RATIFIED 2026-05-05 by council Tier-2 convergence on poll 36c9dcf8 across the mandatory 2-round procedure (Round 1: both brains independent RATIFY; Round 2: both DEFEND RATIFY after seeing each other; no [ADOPTING_FROM], no third positions, no K3 counters). Binding for all Cycle 1+ work.
**Cycle Zero completed:** 2026-05-05
**Sovereign:** Tommy
**Brains polled (Cycle Zero):** Claude (Orchestrator), GPT (Architect/Strategist), Deepseek (Reviewer/Cross-checker)
**Cycle Zero deliberation arc:** Round 1 cross-poll (Q1–Q4 + K3 converged, Q5 disagreement); Round 2 cross-check opened on Q5 then superseded mid-flight by an intent shift surfaced through a Tommy-led conversational discovery drill; fresh Round-3 cross-poll on the sharpened intent (full convergence, no Round-2 trigger); Round-4 synthesis-validation cross-poll on the Layer B draft (conditional validation, both brains independently flagged that the orchestrator over-added in synthesis — corrections folded); Round-5 corrections-validation cross-poll (GPT validated YES with two soft caveats, Deepseek raised one new K3 push on prompt-versioning + a schema-correctness challenge — Claude adopted prompt-versioning via [ADOPTING_FROM] and defended schema-correctness empirically); Round-6 council ratification cross-poll under the new Tier-2-by-council and 2-round-mandatory ratification procedure.
**Failure log for this Cycle Zero:** Six breakdowns observed, all at the orchestrator-to-sovereign interface. (1) Orchestrator went straight to council on the project's own design without first running the discovery drill the project itself mandates — self-referential breakdown. (2) Orchestrator framed the discovery drill as a batch dump of six questions instead of a conversational one-at-a-time drill — generated FORCED_RULE_PO_01. (3) Orchestrator dumped a synthesis table + schema list inline in user-facing output instead of conversational synthesis — FORCED_RULE_10 violation, mirror of breakdown #1 from the dashboard project's own Cycle Zero. (4) Orchestrator handed Tommy a three-option menu of next-moves instead of arriving with a converged recommendation — FORCED_RULE_11 violation, mirror of breakdown #2 from the dashboard project's own Cycle Zero. (5) Orchestrator went straight from drafting Layer B to asking for sovereign ratification, skipping council validation of the synthesis itself — generated the Synthesis-Ratification Gate amendment 48c9dda2. (6) Orchestrator routed Tier-2 ratification to Tommy when ratification of a Tier-2 artifact is a council act per K2 sovereignty discipline — generated amendments 83614b20 (Tier-2 ratification by council convergence) and 926869fb (council ratification mandatorily 2-round).

---

## CONTEXT (frozen intent + merged gap list)

**Frozen intent:**
> "Make starting a new SiXiS project a guided flow on the dashboard so every project follows a repeatable path: brain dump → conversational discovery drill in Claude Code → council cross-poll → ratification → substrate writes new project + Cycle Zero + Layer B. Phase 1 is paste-based; phases 2 and 3 progressively remove the user from the copy/paste loop."

**Why this project exists:** Phase 1 of a 3-phase arc toward agent-driven project initiation. Phase 2 = Claude drives browser-control (or lighter DOM-aware path) to fill GPT/Deepseek tabs and read responses. Phase 3 = full API integration. End-state: user role reduced to Tier-3 ratification, QA discovery answers, and output review. Eventual user base could include the public (marketable product) and/or Tommy + a future team. Phase 1 stays Tommy-local; chassis must not preclude either path.

**Self-referential validation:** Cycle Zero of the project that exists to make project starts non-amnesiac and systematic produced five breakdowns, all at the orchestrator-to-sovereign interface, three of them direct mirrors of breakdowns from the dashboard project's own Cycle Zero. As with the dashboard project, this is the strongest possible argument for the project's necessity, and it generates real seed data for v0.1's first ingestion.

**Resolved gaps (from council convergence on poll 69965acc, validated by poll b82e9fff with corrections):**
- UI runtime / hosting → Extend the existing local `sixis dashboard` HTTP server with a dynamic `/new-project` route that reads/writes local SQLite. Same-origin for phase 2 browser-control.
- Claude Code launch mechanism → Click-to-copy block as the v0.1 launch implementation, with optional "Download prompt.md" adjacent. No URL schemes (brittle).
- Discovery drill shape → Conversational, one question at a time, adaptive. Internal checklist is scaffolding for Claude, NOT an interrogation script. See FORCED_RULE_PO_01.
- Amendment fold-back → Dashboard surface lists open `amendment_proposed` events; ratification button writes `amendment_ratified` (event type already in existing schema); optional post-ratification CLI sync. No auto-cross-poll in v0.1.
- Drafts / resume / abandon → Multiple resumable drafts; no auto-expire; abandoned hides not deletes; cross-restart resume produces an explicit `resumed_from_draft` event linking to the original `draft_saved`.
- Storage → Stays on local SQLite. Database backend is the 3rd project. Implementation may use a side-car `draft_checkpoints` table OR substrate events alone — both honor the convergence; the choice is a Cycle-1 implementation call.
- Auth → Localhost-trusted in v0.1. Phase 2 browser-control needs an attribution mechanism (`X-Sixis-Agent` header or equivalent) designed and ratified before phase 2 begins, so the substrate can attribute every wizard-step event to its actual initiator. Tracked as `amendment_proposed` event 9a1b1b17.
- User base → Tommy-local for v0.1. Multi-user / public-facing is downstream.

**Open gaps deferred:** Browser-control (phase 2), API integration (phase 3), database backend (3rd project), multi-user/auth (gated by amendment 9a1b1b17), auto-cross-poll on amendment accumulation, compressed inline bootstrap payload (amendment 05aa8bda), amendment-system review friction between propose and ratify (GPT-flagged in poll b82e9fff — addressed in Cycle 4), richer per-project visualizations. (Note: discovery-drill prompt-template versioning was originally deferred here but moved INTO v0.1 per FORCED_RULE_PO_11 after Deepseek's K3 in poll b7f9421a — see that rule for the [ADOPTING_FROM] reasoning.)

---

## CLASSIFICATION

| Field | Value |
|---|---|
| `PROJECT_TYPE` | SaaS Build (UI feature on existing dashboard, CLI integration, self-referential) |
| `TIER` | 2 — with auto-escalation to 3 on conditions below |
| `ARCHETYPE` | SaaS Build, Compressed Hybrid (strategy embedded in first build iteration) |
| `SCOPE` | Phase 1 only: paste-based UI flow on the existing local-dashboard + local-SQLite + CLI architecture. NOT browser-control. NOT API integration. NOT database-backed. Substrate writes happen via existing CLI commands (or thin wrappers around them) plus the new event types. |

**Tier-3 auto-escalation triggers:**
1. Phase 2 (browser-control) or phase 3 (API integration) work begins — those phases need their own scoping cycles
2. Multi-user or any auth model is added to v0.1
3. The amendment-fold-back surface gains automated promotion (auto-cross-poll, automatic rule updates without sovereign ratification)

---

## ROLES

| Brain | Role | Responsibilities |
|---|---|---|
| Claude | Orchestrator + Product Architect | UI flow design, prompt-template authorship, Cycle coordination, Round-2 cross-check enforcement, friction logging, Layer B drafting |
| GPT | System Designer + Strategist | Architectural seam decisions (adapters vs. forks), K6 long-term lens, MANDATORY COUNTER-ARGUMENT discipline, build-thin guardrail enforcement |
| Deepseek | Reviewer + Implementation Check | Hidden-obligation audits, K7 audit-chain integrity, schema-drift detection on the new event types |
| Tommy | Sole Executor + Sovereign | Tier-3 ratification authority ONLY (per amendment 83614b20). Tier-1 and Tier-2 artifacts are ratified by council convergence under the 2-round-mandatory procedure (amendment 926869fb). Tommy retains: red-line risk acceptance, scope-boundary changes, irreversible Tier-3 escalations, cross-check gatekeeper role, sole-writer convention until phase 2 introduces agent-attributed writes. |

---

## CYCLE STRUCTURE

| Cycle | Name | Task Types Allowed | Deliverable |
|---|---|---|---|
| 1 | Schema & UI Scaffold Lock | STRATEGY, DRAFT | Final list of new `events.type` values shipped as a schema migration; the `/new-project` route mounted on the existing local dashboard server with a static brain-dump form; the click-to-copy launch implementation working end-to-end with a hardcoded prompt; implementation choice on draft-state storage (events-only vs side-car `draft_checkpoints` table) ratified; prompt-template versioning schema element ratified per FORCED_RULE_PO_11 (form: hash field on `discovery_prompt_generated` event payload OR side-car `prompt_templates` table with version pointers — Cycle 1 picks one) |
| 2 | Discovery Drill Prompt + Wizard State + Prompt Versioning Implementation | DRAFT, EXECUTION | Prompt template handed to Claude Code that enforces conversational drill; multiple-resumable-draft persistence; `draft_saved`, `wizard_step_completed`, `discovery_answer_logged` events firing; raw-vs-synthesized artifact separation in storage; prompt-template versioning IMPLEMENTATION lands here per FORCED_RULE_PO_11 (schema element ratified in Cycle 1) — each `discovery_prompt_generated` event populates the version reference established in Cycle 1 |
| 3 | Council Prompt Generation + Substrate Writes | DRAFT, EXECUTION | Server-rendered council prompts woven from substrate state; convergence + Tommy-ratification path through to a written Layer B file in the new project's folder; `amendment_ratified` event fires before any in-place rule update (Deepseek ordering constraint from poll b82e9fff) |
| 4 | Amendment Surface + Friction-Logging Hooks + Review Friction | DRAFT, EXECUTION | Pending-amendments widget on main dashboard with ratification button; `amendment_ratified` events firing in the correct order; friction-logging hooks active inside the wizard; review-friction step between `amendment_proposed` and `amendment_ratified` (GPT obligation from poll b82e9fff — minimum: a "council weighed in" gate) |
| 5 | Observe & Reflect | META, REVIEW | After ≥1 real new project flows through end-to-end, retrospect on what's missing. Feeds phase-2 strategy and any candidate Universal Shell amendments. |

---

## SCHEMA ADDITIONS (FORCED_RULE_04 amendment-gated, lightweight)

**Inherited from existing schema (no addition required, referenced for clarity):** `friction` (used by FORCED_RULE_PO_05; defined in `schema_v0_1.sql` line 41), `amendment_proposed` and `amendment_ratified` (used by amendment fold-back; defined in migration 003 `protocol_observatory.sql`), `adoption`, `breakdown`, `convergence`, `cross_poll`, `disagreement`, `override`. (Note: Deepseek challenged this inheritance claim in poll b7f9421a, asserting these types are not in the ratified Universal Shell document. Empirically verified against the substrate schema files — types ARE present and operational. The Universal Shell document not formally enumerating every event type is a separate Layer-A documentation gap to address but does not change the substrate's operational truth.)

**Genuinely new `events.type` values to add:**

```sql
-- Wizard / draft lifecycle
'project_draft_started',
'draft_saved',
'wizard_step_completed',
'draft_resumed',
'draft_abandoned',
'draft_promoted_to_project',
'resumed_from_draft',

-- Discovery drill lifecycle
'discovery_prompt_generated',
'claude_drill_started',
'discovery_answer_logged',

-- UI provenance / K7 (validated by Deepseek in poll 69965acc as required for audit chain)
'ui_launch_event',

-- Optional, only if post-ratification CLI sync ships in v0.1; else defer
'amendment_applied_to_rules'
```

**Rationale per genuinely new type:** The wizard / draft lifecycle events make resume-across-restart reconstructable from substrate alone. The discovery drill lifecycle events let the per-project dashboard view render the conversational transcript. The `ui_launch_event` closes Deepseek's K7 finding in poll 69965acc: today the substrate cannot distinguish a Tommy-initiated discovery drill from an arbitrary paste — this event records the moment the wizard's "Start discovery drill" button fires, with a hash of the generated prompt.

**Provenance discipline note (per Deepseek poll b82e9fff finding):** Of the genuinely new types above, the convergence on poll 69965acc explicitly named only `draft_saved`, `draft_abandoned`, `resumed_from_draft`, `ui_launch_event`. The remaining seven (`project_draft_started`, `wizard_step_completed`, `draft_resumed`, `draft_promoted_to_project`, `discovery_prompt_generated`, `claude_drill_started`, `discovery_answer_logged`, `amendment_applied_to_rules`) are Claude's elaborations to close audit-chain reconstructability at finer granularity. Per Deepseek's discipline ask, this elaboration is surfaced retroactively as `amendment_proposed` event (logged alongside this Layer B revision) and is amendment-gated by FORCED_RULE_PO_06. Cycle 1 ratifies the final list before schema migration.

**Storage form choice (per Deepseek poll b82e9fff finding):** Implementation may use a side-car `draft_checkpoints` table keyed by a persistent UUID OR rely on substrate events alone for cross-restart resume. Both honor the convergence. Cycle 1 picks one and ratifies.

---

## WRAPPER SPEC

Inherit Universal Shell default wrapper. Project-specific extras:

- `[SUGGESTED_LOG_ENTRY: type=<event_type> | source=<brain> | description=<short_text>]` — inherited from dashboard project unchanged.
- `[TIER_ESCALATION_TRIGGERED: <which_trigger>]` — inherited.
- `[DRAFT_CHECKPOINT: <draft_id> | step=<step_name>]` — emitted by Claude Code during the discovery drill at meaningful state transitions, so the wizard can persist mid-conversation state without explicit user save action.

---

## ROUTING CONFIRMATION

Three-brain parallel polling confirmed for all Tier-2+ decisions in this project. Brains certify they will not read other brains' responses before posting their own. Round-2 cross-check (per FORCED_RULE_03 inherited) is mandatory whenever real disagreement persists after Round 1. Synthesis-validation cross-poll (per the candidate Universal Shell amendment 48c9dda2 surfaced this Cycle Zero) is mandatory when the orchestrator produces a binding artifact derived from council convergence, before sovereign ratification.

---

## KERNEL RATIFICATION

All seven Kernel principles ratified for this project. Load-bearing principles flagged:

- **K1 (Cognitive Load Optimization)** — load-bearing at orchestrator-to-Tommy interface (five breakdowns this Cycle Zero, mirror pattern from dashboard project's own Cycle Zero).
- **K2 (Sovereignty)** — Tier-3 auto-escalation triggers; sole-writer convention until phase 2.
- **K3 (Multi-Perspective Adversarial Reasoning)** — load-bearing per FORCED_RULE_03 inherited; reinforced by the build-thin guardrail FORCED_RULE_PO_09 below (K3's job is to push back against premature systemization).
- **K6 (Long-term Scalability)** — chassis must support phase-2 (browser-control) and phase-3 (API) swap-in without rewrite. Reflected as the architectural principle behind FORCED_RULE_PO_07 below.
- **K7 (Auditability and No Hidden Agency)** — load-bearing for `ui_launch_event`, draft event chain, and `amendment_ratified` ordering. Without these, the wizard breaks the substrate-as-derived-view contract from FORCED_RULE_09 inherited.

---

## FORCED RULES (project-specific)

These forced rules apply to this project for its full lifecycle. Inherited rules from the dashboard project's Layer B continue to apply where they cover universal substrate concerns. The rules below are project-specific additions.

### FORCED_RULE_PO_01 — Discovery drill must be conversational, one question at a time
The Claude Code discovery drill must ask one question at a time, with each answer free to pivot, collapse other queued questions, or open deeper follow-ups. Pre-loading a checklist of multiple questions and firing them at the user at once is forbidden. The internal checklist (intent / scope / consumers / constraints / success criteria / failure modes / external commitments / reversibility / required artifacts / known unknowns) is scaffolding for Claude, NOT an interrogation script for the user. The v0.1 prompt template handed to Claude Code must enforce this. Promoted from `amendment_proposed` event 2fd8b49e logged during this Cycle Zero. Candidate Universal Shell amendment.

### FORCED_RULE_PO_02 — Raw and synthesized artifacts never collapse into one storage blob
Brain dump (raw user input), Claude discovery transcript (raw Q&A), Claude synthesis (interpreted), council prompt (generated from synthesized state), council deliberation (raw brain responses), convergence summary (interpreted), ratified Layer B (canonical output) — each occupies its own substrate field, file, or panel. Mixing them corrupts auditability. From council convergence on poll 69965acc, both brains.

### FORCED_RULE_PO_03 — Click-to-copy is one launch adapter, not the core launch model
Click-to-copy of the discovery-drill prompt is the v0.1 launch implementation. A "Download prompt.md" affordance may be offered adjacent. Click-to-copy is one adapter implementation of the launch step, NOT the core launch model — phase 2 swaps it for browser-controlled paste; phase 3 swaps it for direct API call. Code organization must keep the launch step pluggable (per FORCED_RULE_PO_07).

### FORCED_RULE_PO_04 — UI write authority for v0.1 is localhost-trusted; phase 2 needs attribution before it begins
The v0.1 `/new-project` route is mounted on the local `sixis dashboard` HTTP server and trusts all localhost callers. This is acceptable for v0.1 because there is one user (Tommy) and no automation client. Phase 2 (Claude-driven browser-control) introduces a second initiator (Claude itself driving the browser) and the substrate cannot distinguish it from Tommy unless an attribution mechanism is in place. The K7 audit-chain logic and K2 sovereignty logic together require that an `X-Sixis-Agent` header (or equivalent) be designed, ratified via cross-poll, and implemented before phase 2 work begins. Tracked as `amendment_proposed` event 9a1b1b17.

### FORCED_RULE_PO_05 — All wizard friction logged immediately as friction events
The wizard's UI must surface a friction-logging path at every step (abandon, pivot, "I disagree with Claude's framing", "this discovery question doesn't make sense"). These fire `friction` events (existing schema type) with `source='tommy'` or `source='system'` immediately, never batched or deferred. Per FORCED_RULE_15 inherited from the dashboard project. Hidden obligation surfaced by Deepseek in Round 1 of poll 48e0e85f.

### FORCED_RULE_PO_06 — Schema additions limited to the listed event types; further additions amendment-gated
The new `events.type` values listed in the SCHEMA ADDITIONS section above constitute the complete lightweight amendment for v0.1, subject to Cycle-1 ratification of the provenance-flagged subset. Any additional event types or column changes during the v0.1 build require new `amendment_proposed` events and council review. Per FORCED_RULE_04 inherited.

### FORCED_RULE_PO_07 — Launch and write are adapters around a unified substrate workflow (K6 chassis principle)
The v0.1 chassis treats the Claude Code launch step and the substrate write step as adapters, not as the core model. The core model is: `draft → prompt artifact → conversational discovery transcript → synthesis → council deliberation → substrate write → amendment queue`. Manual copy/paste (phase 1), browser-control (phase 2), and full API (phase 3) are three implementations of the same launch adapter. Localhost-trusted SQLite write (phase 1), authenticated dashboard write (phase 2), and remote API write (phase 3) are three implementations of the same write adapter. This is a guiding architectural principle the v0.1 implementation must reflect, not a doctrinal mandate — concrete code organization (single-file adapters vs interface-based plugins vs other) is a Cycle-1 implementation call. The principle exists because phase 2 and phase 3 require chassis-level continuity, not because of abstract elegance preference. (Acknowledged per GPT poll b7f9421a: this rule does carry directional weight via K6 linkage and is not pure neutral guidance — that directional weight is intentional because Cycle Zero produced concrete evidence of phase-coupling risk if launch/write are baked into the core model.)

### FORCED_RULE_PO_08 — Multiple resumable drafts; no auto-expire; abandoned hides not deletes
The wizard supports multiple in-flight drafts simultaneously. Drafts do not auto-expire. Abandoned drafts are hidden from the active dashboard by default but never deleted from the substrate (they are evidence). Resume across a dashboard restart must produce an explicit `resumed_from_draft` event linking the new ratification attempt back to the original `draft_saved` event via `related_event_id`.

### FORCED_RULE_PO_09 — Build-thin discipline; defer formalization unless it prevents a known failure mode
v0.1 bias is build-thin and preserve messiness. Formalization (new schema fields, new forced rules, new event types, new architectural layers) is justified ONLY when it prevents a known failure mode observed in this Cycle Zero, in the dashboard project's Cycle Zero, or in a substrate event with a documented breakdown. Speculative structure ("we might need this later") is discouraged in v0.1; any proposal that adds structure must explicitly cite the known failure mode it prevents, and the cite is itself reviewable. (Wording softened per GPT poll b7f9421a from "forbidden" to "discouraged + must cite" — the original "forbidden" was a hard veto where a pressure gradient with auditable justification serves better.) K3-pressure from GPT explicitly produced this rule in poll b82e9fff after the council validated the orchestrator's first synthesis was ~20% over-formalized. This rule is the ongoing counterweight to that tendency and must be cited whenever a Cycle 1+ proposal adds structure.

### FORCED_RULE_PO_10 — Amendment ratification ordering: event before rule update
The `amendment_ratified` event must be written to the substrate BEFORE any in-place update of the local rule store, dashboard surface, or downstream artifact. If the rule update fires first and the event write fails, the substrate loses the audit trail of what was ratified. Per Deepseek's K7 finding in poll b82e9fff. Applies to: Cycle 3+ writes through the amendment fold-back surface.

### FORCED_RULE_PO_11 — Discovery-drill prompt-template versioning lands in v0.1
Each `discovery_prompt_generated` event must include a reference to the exact discovery-drill prompt-template version used (hash of template content OR `prompt_version_id` pointing at a versioned `prompt_templates` substrate row). Without this, the audit chain cannot reconstruct WHY a drill unfolded as it did after the template evolves — a template change would silently produce different drill behavior with no input-side trace. Per Deepseek's K3 mandatory counter in poll b7f9421a, adopted via M-Imperative-3 [ADOPTING_FROM] reasoning: PO_09's own logic ("formalization justified only when it prevents a known failure mode") MANDATES this rule, because template-change-induced silent drill divergence IS a documented K7 failure mode (raw-vs-synthesized collapse forbidden by PO_02 applies symmetrically to prompt input). Original synthesis incorrectly deferred this to Cycle 2 as "more work"; that interpretation contradicted PO_09's own gating logic. Schema element ratified in Cycle 1; implementation lands in Cycle 2.

### FORCED_RULE_PO_12 — Sovereign Delegation Rule (capability-token semi-autonomy)
Any autonomous or semi-autonomous agent acting through the SiXiS dashboard must operate under explicit, scoped, revocable sovereign-issued capability. Required mechanisms:

(1) **Explicit delegation boundary.** Sovereign initiates the agent session via the dashboard's "Start browser control" button. The agent cannot self-authorize. Session start logs a `sovereign_delegation_started` event with `session_id`, `capability_id`, `scope_permissions` (whitelist of allowed actions), `expires_at`, `scope_description`.

(2) **Scoped authority.** The agent's `capability_id` may only execute actions on the `scope_permissions` whitelist. The server validates every agent-driven request against the active session's scope. Out-of-scope actions are rejected with a logged breakdown event. Default scopes for browser-control: `fill_council_prompt`, `extract_brain_response`, `log_brain_response`. Never in default scope: `ratify_amendment`, `override_amendment`, `declare_convergence`, `generate_layer_b` — those still require sovereign action regardless of session.

(3) **Attribution on every write.** All agent-driven substrate writes record `actor_mode='browser_control'`, `authorized_by='tommy'`, `capability_session_id`, `captured_by='claude'`. The new source value `claude_browser_control` distinguishes agent writes from human writes. The `X-Sixis-Agent-Token` HTTP header carries the `capability_id`; the server validates on every request.

(4) **Revocation.** Sovereign has a "Stop browser control" button on the dashboard that immediately invalidates the active `capability_id` and logs a `sovereign_delegation_revoked` event with `session_id`, optional `revocation_reason`, `revoked_at`. Invalidation is server-authoritative — even in-flight agent requests fail their next attribution check.

(5) **Escalation.** Any ambiguous identity, authority, or scope condition halts to sovereign. The agent cannot proceed past ambiguity; it logs a friction event with `source='claude_browser_control'` and surfaces in the "Needs Your Attention" panel.

(6) **Recall via override.** If the agent performs an unintended action that the sovereign wants undone, the sovereign logs an explicit override event (existing event type, sovereign-only) with reason. The recall does not auto-undo the action — it creates an audit trail and triggers any defined compensation logic per the affected substrate state.

(7) **Protocol-version reference.** `sovereign_delegation_started` events MUST include `protocol_version_ref` so future auditors can verify the `scope_permissions` interpretation under the rules in force at delegation time (per the Reversibility-Based Bypass amendment hidden-obligation pattern).

Ratified by council Tier-2 convergence on poll 5ec0197b (Round 1 + Round 2 both DEFEND RATIFY) per amendments 83614b20 (Tier-2 by council) and 926869fb (mandatory 2-round). Tier-3 sovereign pre-ratification of phase 2 entry on event 601c465c. Operationalized by Phase 2 Cycles 3–4: migration 015 (source value + 3 event types), migration 016 (`capability_tokens` table), `_require_capability` middleware, browser-control endpoints, agent prompt template `browser_control_agent` v1, and the dashboard "Start/Stop browser control" button. Also queued as a candidate Universal Shell amendment for future meta-cycle promotion.

### FORCED_RULE_PO_13 — Mandatory Brain Attribution Header
Every cross-poll relay prompt and brain response must begin with `[BRAIN: <name>]` where `<name>` is the emitting brain's canonical identifier (`claude` / `gpt` / `deepseek` / etc.). Missing header = attribution-incomplete and non-canonical for audit lineage. The cross-poll prompt template (per FORCED_RULE_PO_11 versioning) must include this header as a hard requirement before relay. Ratified by council convergence on poll `09ee39a6-fdae-47fa-a305-595b7e454be8` (Round 2, Tier 1 FORCED_RULE) — addresses B1 from breakdown-cycle session 2026-05-07.

### FORCED_RULE_PO_16 — Project Closure Evidence Gate
A project is not closed until: (a) cycles attributed to the project, (b) events visible on `dashboard.sixis.ai`, (c) `What's Changed` log contains artifact-referenced entries (URL, commit SHA, dashboard link), (d) each entry's target verified reachable. Closure assertion before publish is a logged breakdown. This is the operational expression of universal kernel principle K8 (Assertion Requires Direct Evidence) applied to the project lifecycle. Ratified by council convergence on poll `09ee39a6-fdae-47fa-a305-595b7e454be8` (Round 2, Tier 2 FORCED_RULE) — addresses B5 from breakdown-cycle session 2026-05-07.

### FORCED_RULE_PO_18 — Universal Context Attribution Invariant (revised 2026-05-07)
**Original text (project-spawn-only trigger, superseded):** Any project/cycle creation event that establishes a new execution context must immediately rebind active project, active cycle, event routing target, and lineage references before subsequent work events may be emitted.

**Revised text (council ratification 2026-05-07, poll `12e16fbb-565e-42dd-a1da-3c1d4e04c6c6` Round 2 unanimous):**
Any substrate write creating or mutating a row in a table containing `source_project_id`, `cycle_id`, or equivalent execution-lineage fields must populate those fields from the active execution context when such context exists. Under an active execution context: NULL attribution is a protocol breakdown; stale attribution is a protocol breakdown; parent-context attribution after child-context activation is a protocol breakdown. Attribution inheritance must be automatic unless explicitly overridden by a documented cross-context operation.

Why revised: original trigger fired only on project/cycle creation events. B9 (rule attribution drift) happened mid-cycle when 10 amendments + rules were inserted with `source_project_id=NULL`. The original trigger never fired because nothing was being created. Revised invariant fires on every write that touches an execution-lineage column. Now operationalized by FORCED_RULE_20 (Pre-Publish Attribution Validation) at the publish boundary and FORCED_RULE_21 (Verified Substrate Writes) at the write boundary. Universal scope — applies to all SiXiS protocol projects.

### FORCED_RULE_20 — Pre-Publish Attribution Validation
Any publish operation generating canonical substrate artifacts must execute automated attribution validation before completion. Validation must: detect NULL execution-lineage fields under active context; detect stale context attribution; detect orphaned cycle references; detect invalid parent-child context relationships. Publish completion is blocked until validation passes or an explicit override is logged with sovereign attribution. Operational lock: `sixis publish` auto-runs `sixis verify-rule-attribution`. Fail-closed behavior on violations. Sovereign override: `--skip-attribution-check` (logs `sovereign_attribution_override` event). Universal scope. Ratified by council convergence on poll `12e16fbb-565e-42dd-a1da-3c1d4e04c6c6` (Round 2, Tier 2) — addresses B9 root-cause GAP B at the publish boundary.

### FORCED_RULE_21 — Verified Substrate Writes
Any helper, wrapper, decorator, or execution path performing substrate writes must verify persisted state through direct read-back assertion before reporting completion. Verification must confirm: primary key / identity fields; execution-lineage fields; critical invariant fields relevant to the operation. "Write attempted" and "write verified" are distinct operational states. Operations lacking verification may not report completion. Implementation pattern: a `_substrate_write` decorator in sixis.py wraps INSERT/UPDATE helpers and performs the read-back, centralizing enforcement and avoiding helper drift. Derived from K8 (Assertion Requires Direct Evidence) — operationalizes the kernel principle at the lowest level of substrate mutation. Universal scope. Ratified by council convergence on poll `12e16fbb-565e-42dd-a1da-3c1d4e04c6c6` (Round 2, Tier 2) — addresses B9 root-cause GAP B at the write boundary.

**Most important locked insight from B9-refinement cycle:** Attribution drift was not the root failure. The root failure was allowing substrate mutation paths to declare success without verified persisted-state confirmation. PO_18 (revised) defines the invariant; FORCED_RULE_20 enforces at publish boundary; FORCED_RULE_21 enforces at write boundary. Layered defense.

---

## CANDIDATE UNIVERSAL SHELL AMENDMENTS (queued for future meta-cycle)

The following Layer-B forced rules and observed patterns are candidates for promotion to the Universal Shell itself in a future Tier-3 amendment cycle:

1. **FORCED_RULE_PO_01** (Conversational discovery drill, one question at a time) — candidate for new Section 4.x in the Universal Shell. Discovery patterns appear in any future SiXiS project that uses an orchestrator brain to surface intent before council deliberation.
2. **Synthesis-Ratification Gate** (event 48c9dda2) — orchestrator's synthesized artifacts derived from council convergence must themselves be cross-polled back to the council before sovereign ratification. Surfaced by Tommy this Cycle Zero. Candidate for new Section 4.x.
3. **FORCED_RULE_PO_09** (Build-thin discipline) — candidate for K3 elaboration in the Universal Shell. Deepseek's "synthesis is a mirror, not a generative layer" framing in poll b82e9fff is the most concise statement of this discipline.
4. **Tier-2 ratification by council convergence** (amendment 83614b20) — Tier-1 and Tier-2 binding artifacts are ratified by council convergence, not by sovereign. Sovereign involvement is reserved for Tier-3. Surfaced by Tommy this Cycle Zero. Candidate for new Section 4.x in the Universal Shell.
5. **Council ratification is mandatorily a minimum 2-round process** (amendment 926869fb) — Round 1 each brain answers independently; Round 2 each brain shown the other's Round-1 response and must defend / [ADOPTING_FROM] / new third position. Surfaced by Tommy this Cycle Zero. Candidate for new Section 4.x in the Universal Shell, structurally identical to FORCED_RULE_03 but applied universally to ratification.
6. **FORCED_RULE_PO_12** (Sovereign Delegation Rule) — capability-token-scoped, server-authoritative-revocable agent delegation; `X-Sixis-Agent-Token` attribution on every agent-driven substrate write; default scopes whitelist excludes ratify/override/declare-convergence/generate-layer-b; escalation-on-ambiguity. Surfaced in Phase 2 Cycle 2 as a load-bearing K2 sovereignty extension and phase-2 prerequisite. Candidate for Section 4.x in the Universal Shell — pattern applies to any future SiXiS surface that gives an autonomous or semi-autonomous agent write authority.

The unifying observation across the six breakdowns logged this Cycle Zero: orchestrator's default posture continues to optimize for forward-velocity (move to next decision) over deliberation-completeness (satisfy all K-principles before advancing) — same root pattern flagged in the dashboard project's own Cycle Zero. Three of this project's six breakdowns are direct mirrors of dashboard-project breakdowns; the remaining three (synthesis-ratification-gate, Tier-2-by-council, 2-round-mandatory-ratification) are NEW protocol gaps surfaced for the first time and queued as candidate Universal Shell amendments. This warrants explicit forcing-function attention in a future Universal Shell amendment beyond the rules already promoted.

---

## SCOPE AMENDMENT — Project is 2-phase, not 3 (Tier-3 sovereign call event f522efaf, 2026-05-07)

Phase 3 (full API integration with brain providers) is removed from this project's scope and becomes its own future project (project #4 in the SiXiS arc). Rationale: phase 3 is a different chassis — API client, provider abstraction, key management — and folding it into this codebase would violate FORCED_RULE_PO_09 (build-thin). Project-onboarding-v0-1 closes when Phase 2 Cycle 10 (real-usage validation + retrospective) closes on Tommy's next new project. The 3-phase framing in Cycle Zero's frozen intent stands as historical context; this scope amendment is logged on top of it rather than rewriting it.

---

## DEFERRED TO PHASE 2 OR FUTURE PROJECTS

- Claude-driven browser-control to fill GPT and Deepseek tabs (phase 2 of this project)
- ~~Full API integration with brain providers (phase 3 of this project)~~ → moved to its own future project per the scope amendment above
- Database backend on dashboard.sixis.ai (3rd SiXiS project)
- Multi-user / auth model with `X-Sixis-Agent` header (gated by phase 2 amendment 9a1b1b17)
- Auto-cross-poll triggered when N amendments accumulate
- Compressed inline bootstrap payload for brains whose web-fetcher fails on the live URLs (queued amendment 05aa8bda)
- ~~Discovery-drill prompt-template versioning~~ — moved INTO v0.1 per FORCED_RULE_PO_11 (originally deferred to Cycle 2; re-included in v0.1 after Deepseek's K3 in poll b7f9421a demonstrated PO_09's own logic mandates inclusion)
- Amendment-system review friction between propose and ratify (GPT obligation from poll b82e9fff — addressed in Cycle 4)
- Richer per-project visualizations (charts, trend lines over the new event types)
- Public / marketable deployment of the wizard as a SiXiS-as-a-product surface

---

*End of LAYER_B for Project Onboarding Flow v0.1 (phase 1 of 3). This document is binding for all Cycle 1+ work after council Tier-2 ratification under the 2-round-mandatory procedure (amendments 83614b20 and 926869fb). Any further change requires `[AMENDMENT]` per Universal Shell Section 4.8.*
