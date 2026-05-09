# Universal Shell v1.2

**A Multi-Brain Decision Protocol for Cross-Domain Project Execution**

**Status:** RATIFIED via 5-cycle deliberation (Diagnostic → Architecture → Drafting Structure → Drafting → Archetype Library), unanimous brain convergence + Tommy Tier 3 sign-off, 2026-05-03. v1.2 amendments ratified 2026-05-07 from breakdown-cycle cross-poll (10 amendments — 3 Tier-3 universal layer additions K8/K9/M-Imperative-5 sovereign-ratified by Tommy + 7 derived FORCED_RULES council-ratified on convergence).

**Changes from v1.0:** Section 5 (Archetype Schema) expanded to include full filled content for eight pre-loaded archetypes (Decision Analysis added as the 8th archetype during Round 2 cross-check of the archetype drafting cycle).

**Changes from v1.1 (2026-05-07 breakdown-cycle ratification):** Added K8 (Assertion Requires Direct Evidence), K9 (Ownership Flows Downhill), M-Imperative-5 (Autonomous Capability First). Cross-poll IDs `2a711482-cda2-458d-85e8-cf2d0bcad9bd` (Round 1) and `09ee39a6-fdae-47fa-a305-595b7e454be8` (Round 2). Subsumes 8 process/protocol/system breakdowns observed during Integrate Supabase shadow-window build session.

**Pending validation** when next applied to a real project. The protocol is considered v1.2 because all amendments are convergent across three independent brains and Tommy Tier-3-ratified, but the new rules await real-world enforcement signal.

---

## Document Structure

This document is **Layer A** — the cross-project Universal Shell. It is paired with **Layer B** (Project Instance) documents generated per project via Cycle Zero. The canonical Layer B reference instance is `TowMarX_v3.0.md`, preserved unchanged.

Sections in order:

0. Preamble — Origin and Scope
1. Kernel Principles (K1–K7)
2. Cycle Zero (the mandatory pre-execution gate)
3. Meta-Protocol (governance during execution)
4. Forcing Functions and Resilience Mechanisms (post-Cycle-Zero)
5. Archetype Library (schema + filled content for all 8 archetypes + interactions)
6. Status and Deferred Items

The Universal Shell is a generic template. Examples within this document are illustrative only. The canonical filled instance for the TowMarX project is maintained separately as `TowMarX_v3.0.md` (unchanged from its original form).

---

## Section 0 — Preamble

### Origin

The Universal Shell is extracted from the TowMarX Protocol v3.0, generalized for cross-domain use. TowMarX v3.0 remains preserved as the first reference Layer B instance. This document is the result of five sequential deliberation cycles producing convergent multi-brain output across three independent reasoning engines.

### Scope

The Universal Shell governs **multi-brain decision-making protocols** — projects where one or more AI reasoning agents (LLMs) collaborate with a primary human decision-maker on work that benefits from adversarial deliberation. It is not a project-management tool, a workflow engine, or an execution platform. It is a discipline framework.

### Design Philosophy

**Resilient under imperfect conditions, not perfect.** The protocol must work when context is missing, brains drift, rounds fire without defined goals, or the user makes mistakes. Forcing functions over correctness proofs.

### Non-Goals

- The Universal Shell does not govern projects without a human-in-the-loop sovereign.
- It does not specify how AI agents are technically connected (API, prompt copy/paste, dashboard).
- It does not replace domain-specific operating procedures.

---

## Section 1 — Kernel Principles

The Kernel defines *what* the protocol prioritizes. Implementation mechanics are specified in Cycle Zero, Meta-Protocol, and Forcing Functions.

### K1 — Cognitive Load Optimization

**Layer A (Universal Core):**
The protocol's design must prioritize the cognitive load of the human decision-maker. This means minimizing required up-front taxonomy selection, using natural language for triggers, and providing clear defaults. Efficiency of machine processing is secondary to human comprehension and low-friction use.

**Layer B Extension Pattern:**
Per-project, the primary user's specific communication preferences, jargon allowances, response-length norms, and pacing are defined in Layer B.

### K2 — Sovereignty on Irreversible and Strategic Decisions

The primary decision-maker (the human who bears the consequences of a decision) retains final authority over all Tier-3 decisions (irreversible, high-stakes, or externally binding). This authority cannot be delegated to any agent or brain, nor can it be inferred from absence of objection. No brain may override it. The protocol must make this authority explicit before any Tier-3 decision is executed.

### K3 — Multi-Perspective Adversarial Reasoning Before Commitment

Before committing to any irreversible or high-stakes output, the protocol must generate and evaluate multiple independent perspectives. Convergence is only valid after meaningful disagreement has been explored and resolved. The required minimum number of perspectives is defined in Meta-Protocol 2.6 operational defaults and may be overridden per project in Layer B, but at minimum one distinct adversarial challenger is required for any Tier-2 or Tier-3 decision.

### K4 — Future-Scalable Architecture

**Layer A (Universal Core):**
When designing a multi-agent decision-making protocol, consider how it will scale with increased number of agents, new types of tasks, and longer durations. Avoid assumptions that lock the system into a single agent configuration or a fixed set of roles.

**Layer B Extension Pattern:**
Project-specific scaling targets (brain count, agent types, automation milestones) are defined in Layer B.

### K5 — Automation as a First-Class Commitment (Conditional)

**Layer A (Universal Core):**
For projects where the goal includes automated or semi-automated outputs (e.g., AI-generated content, decision support, agentic workflows), automation must be designed as a first-class principle from the start. It cannot be an afterthought or a post-hoc addition. The protocol should include explicit gates for specifying automation targets. **K5 does not apply to projects where automation is not a goal** (e.g., a one-off content piece, a single-event proposal).

**Layer B Extension Pattern:**
Project-specific automation north stars and operational embodiments are defined in Layer B.

### K6 — Exponential-Growth Lens in Decisions

**Layer A (Universal Core):**
When evaluating options, consider not only first-order effects but also how the choice compounds over time. A decision that appears small may lead to exponentially larger consequences (positive or negative). The protocol should surface these compounding dynamics explicitly.

**Layer B Extension Pattern:**
Project-specific compounding mechanisms (network effects, reuse patterns, lock-in risks) are named in Layer B.

### K7 — Auditability and No Hidden Agency

All meaningful outputs must be traceable, attributable, and inspectable. The system must make reasoning steps visible, identify which agent produced which output, and surface assumptions explicitly. The system must not introduce silent changes, conceal uncertainty, or imply decisions that were not explicitly made. Auditability is enforced through standardized output structures defined in Cycle Zero and Meta-Protocol.

### K8 — Assertion Requires Direct Evidence

Any operational claim that affects execution state, blocker status, completion, deployment, runtime behavior, or closure must be grounded in directly observed evidence or explicitly labeled as unverified. Static signals, historical data, and inferred conditions are insufficient. Each assertion class has a derived operational FORCED_RULE that names the verification step. Added in v1.1 from breakdown-cycle ratification (subsumes B2 false-positive blocker, B3 settings-without-verification, B5 premature closure).

### K9 — Ownership Flows Downhill

Responsibilities inherent to orchestration, auditability, lineage maintenance, protocol hygiene, and council initiation belong to the orchestrator/council layer unless explicitly reserved to the sovereign. The sovereign's authority is reserved for ratification, scope-change, and Tier-3 decisions, not for routine substrate writes that the protocol already specifies as orchestrator-job. Delegating orchestrator-job substrate writes to the sovereign is itself a logged breakdown. K9 is the structural counterweight to K2 — without it, K2 reads as "always defer upward," which inverts agency. Added in v1.1 from breakdown-cycle ratification (subsumes B8 delegation breach; reinforces B5 closure ownership and B7 lineage ownership).

---

## Section 2 — Cycle Zero (Mandatory Pre-Execution Gate)

Cycle Zero v1.1, fully ratified, is incorporated here as the canonical authoritative version.

### 2.0 — Cycle Zero Purpose

Cycle Zero is a mandatory setup phase that executes **before any substantive work** begins. Its purpose is to lock context, rules, roles, and structure so that subsequent cycles operate under shared, immutable constraints. No Cycle 1+ work is permitted unless Cycle Zero produces a ratified Layer B Project Instance document.

Cycle Zero is **triggered by the user's plain-language intent** — not by manual classification. The AI brains infer project type, archetype, and tier, then generate a draft Layer B for ratification. Active user time for archetypal projects is targeted at under 10 minutes.

### 2.1 — Trigger Model (Front Door)

The default entry point is the user's plain-language intent (one sentence or short paragraph). The user does not pre-classify the project.

**Step-by-step flow:**

1. User states intent (e.g., *"I want to create a proposal for Palace Poker."*)
2. AI brains process intent in parallel: extract `PROJECT_TYPE`, infer `TIER`, match best-fit archetype, identify implicit context, flag missing info as `[GAP_AUDIT]`.
3. Brains generate a draft Layer B document with archetype defaults populating Z3–Z7 where applicable.
4. User reviews the draft. Accept defaults → ratify. Correct mis-classification or add context → one revision round. Reject → start over.
5. Final ratification produces the locked Layer B document.

**Ambiguity handling:** When intent is ambiguous, AI detects classification conflict and asks one targeted clarifying question in plain language. AI never asks "which archetype?" — it asks about the underlying goal. If the user remains unsure, default to best-fit archetype with `[PROVISIONAL]` flag and no stall.

### 2.2 — Quick-Start Path (Tier 1 Simple)

For projects classified as Tier 1 simple, Cycle Zero collapses to a minimal three-gate execution:

**Required gates:** Z1 (Context Dump), Z2 (Work Classification), Z5 (Wrapper Lock).

**Auto-defaulted gates:** Z3 (single brain as Executor), Z4 (single cycle DRAFT), Z6 (single-brain bypass), Z7 (Kernel deemed accepted), Z8 (default minimal recovery).

The trigger model still operates. Quick-Start uses the trigger model, it does not bypass it.

**`[TIER_CHECK]` safety net** (mandatory): The single brain operating in Quick-Start mode must emit a `[TIER_CHECK]` block in its first response (full format in Section 4). Any criterion answered "yes" or "unclear" triggers automatic escalation to full three-brain Cycle Zero.

### 2.3 — The Eight Gates

Each gate uses a consistent template: **Name | Purpose | Inputs Required | Brain Actions | Output Artifact | Pass Criteria | Fail Behavior**.

#### Z1 — Context Dump

| Field | Specification |
|---|---|
| **Purpose** | Establish all known facts, assumptions, and explicitly flagged unknowns before any analysis. |
| **Inputs** | User's plain-language intent (any length). |
| **Actions** | Each brain independently produces a `[GAP_AUDIT]` block. |
| **Output** | Frozen `CONTEXT.md` (intent + merged gap list). |
| **Pass** | All brains submit `[GAP_AUDIT]`. No `[CRITICAL]` gap remains unresolved unless user logs `[KNOWN_GAP]` with justification. |
| **Fail** | User refuses to fill `[CRITICAL]` gap and does not log `[KNOWN_GAP]` → abort. |

#### Z2 — Work Classification

| Field | Specification |
|---|---|
| **Purpose** | Determine `PROJECT_TYPE`, `TIER`, `ARCHETYPE`, `SCOPE`. |
| **Inputs** | `CONTEXT.md`. |
| **Actions** | Brains independently propose classification values. |
| **Output** | `CLASSIFICATION.md`. |
| **Pass** | Brain agreement OR user tie-break. Classification locked. |
| **Fail** | User cannot select after one clarification round → abort. |

#### Z3 — Role Instantiation

| Field | Specification |
|---|---|
| **Purpose** | Define which brain(s) perform which roles for this project. |
| **Inputs** | `CLASSIFICATION.md`. |
| **Actions** | Suggest role matrix. Archetype provides defaults if applicable. |
| **Output** | `ROLES.md` (Brain \| Role \| Specific Responsibilities). |
| **Pass** | User ratifies. |
| **Fail** | One revision attempt; rejected again → abort. |

#### Z4 — Cycle Structure Lock

| Field | Specification |
|---|---|
| **Purpose** | Define cycle sequence (e.g., Strategy → Draft → Refine). |
| **Inputs** | `ROLES.md`. |
| **Actions** | Propose ordered cycle names with permitted `TASK_TYPE` per cycle. Enforce no forward leakage. |
| **Output** | `CYCLE_STRUCTURE.md`. |
| **Pass** | User ratifies. May collapse to single cycle. |
| **Fail** | Two failed attempts → abort. |

#### Z5 — Paste-Back Wrapper Lock

| Field | Specification |
|---|---|
| **Purpose** | Mandate the exact format for all brain responses for this project's entire run. |
| **Inputs** | None beyond Universal Shell default. |
| **Actions** | Confirm wrapper template. |
| **Output** | `WRAPPER_SPEC.md`. |
| **Pass** | User ratifies. No response without this wrapper is considered delivered. |
| **Fail** | Non-compliant response handling per Section 4. |

**Default wrapper format:**

```
[BRAIN: <name> | TASK_TYPE: <type> | TIMESTAMP: YYYY-MM-DD HH:MM:SS | CYCLE: <name>]
<response>
[END BRAIN: <name>]
```

Plus `[ROLE]` line if roles differentiated.

#### Z6 — Three-Brain Routing Validation

| Field | Specification |
|---|---|
| **Purpose** | Ensure parallel polling and no cross-brain echo before responses are submitted. |
| **Inputs** | Project declared to use three brains. |
| **Actions** | Brains self-certify they will not read other responses before posting. Protocol runner implements parallel session separation. |
| **Output** | `ROUTING_CONFIRMATION.md`. |
| **Pass** | Parallel polls initiated. No reference to another brain's content before all are in. |
| **Fail** | Fallback to single-brain with explicit log, or abort. **Bypassed automatically in Quick-Start** (Section 2.2). |

#### Z7 — Kernel Confirmation

| Field | Specification |
|---|---|
| **Purpose** | Ratify universal Kernel principles for this project. |
| **Inputs** | Kernel principles from Universal Shell (Section 1). |
| **Actions** | Present Kernel to user. |
| **Output** | `KERNEL_RATIFICATION.md`. |
| **Pass** | User ratifies (or default-accept in Quick-Start). |
| **Fail** | User rejects any principle → project cannot run under Universal Shell; abort. |

#### Z8 — Failure Recovery Protocol

| Field | Specification |
|---|---|
| **Purpose** | Define what happens when any gate fails or the cycle stalls. |
| **Inputs** | Specific failure point. |
| **Actions** | Apply recovery options: recoverable (user fills, retry); irrecoverable (user `[EXECUTIVE_OVERRIDE]` with logged reasoning); brain timeout (remaining brains proceed under `[BRAIN_ABSENT]` with unanimous-of-present requirement); identical outputs (trigger `[REDUNDANCY_MODE]`). |
| **Output** | `FAILURE_LOG.md` attached to Layer B. |
| **Pass** | Failure resolved or clean abort logged. |
| **Fail** | Three resolution attempts without success → project abandoned. |

### 2.4 — Cycle Zero Output (Layer B Document)

A completed Cycle Zero produces `LAYER_B_<PROJECT_NAME>.md` containing:

- `CONTEXT.md` (frozen intent + merged gap list)
- `CLASSIFICATION.md` (`PROJECT_TYPE`, `TIER`, `ARCHETYPE`, `SCOPE`)
- `ROLES.md`
- `CYCLE_STRUCTURE.md`
- `WRAPPER_SPEC.md`
- `ROUTING_CONFIRMATION.md`
- `KERNEL_RATIFICATION.md`
- `FAILURE_LOG.md` (may be empty)
- `[TIER_CHECK]` block (Quick-Start only)

Layer B is **binding** for all subsequent cycles. Any change requires either rerunning Cycle Zero or invoking the `[AMENDMENT]` procedure (Section 4.8). **Cycle 1 may not begin until Layer B is locked.**

---

## Section 3 — Meta-Protocol

The Meta-Protocol governs *how* cycles run, how rules evolve, and how decisions are validated.

### 3.1 — Rule Evolution Engine

The protocol may be amended only through a formal Meta-layer process. Amendments require: (a) a documented proposal describing the change and its rationale, (b) a Tier-3 poll (unanimous brain convergence + human ratification) unless the change is purely cosmetic, (c) an audit trail of the adoption. For minor clarifications (typos, formatting), a single human approval suffices.

### 3.2 — Pre-Send Validation Framework

Before any message or artifact is considered "final" for delivery to an external party (or for irreversible execution), the protocol must run a validation check. The check verifies: (a) no unresolved placeholders, (b) correct formatting for the intended consumer, (c) no protocol violations in the construction. The exact fields and tags are defined per project in Layer B.

### 3.3 — Counter-Argument Architecture

Every decision poll that asks brains to commit to a recommendation (Tier 2 or higher) must include a **mandatory counter-argument** section, explicitly labeled `MANDATORY COUNTER-ARGUMENT (K3)`. The counter-argument must be a genuine steelman of the opposing view, not a strawman. Failure to produce a substantive counter-argument invalidates the poll.

### 3.4 — Consumer Classification Framework

The protocol must distinguish between different consumers of its outputs: human readers (who need natural language, contextual summaries) and machine consumers (who need structured data, consistent delimiters, parseable formats). The classification (`human`, `machine`, `hybrid`) must be declared at the start of each cycle or sub-cycle. The specific tag syntax is project-specific.

### 3.5 — Epistemic Integrity (M-Imperatives)

The protocol operates under four inviolable imperatives:

**M-Imperative-1 (Conversational Dialogue):** Responses should be succinct and avoid unnecessary verbosity, especially beyond the first exchange. If a complex response is required, break it into multiple messages or use summaries.

**M-Imperative-2 (Second-Thought Anchor):** The brain most responsible for the current direction must provide an anchored stance that others can challenge. This prevents groupthink.

**M-Imperative-3 (No Silent Capitulation):** If one brain adopts another's phrasing or position, it must be explicitly tagged `[ADOPTING_FROM: <brain> - re-audit: <reason>]`. Silent adoption is forbidden.

**M-Imperative-4 (Truth-over-Convenience):** Brains must prioritize accuracy and intellectual honesty over appearing consistent or agreeable. If new information contradicts a prior stance, it must be stated plainly.

**M-Imperative-5 (Autonomous Capability First):** When an authorized toolchain can directly execute a task within approved scope, the orchestrator must default to direct execution. Human relay is fallback behavior for unauthorized or unsupported paths only. This rule changes the orchestrator's operating identity from relay-assistant to authorized-executor. Added in v1.2 from breakdown-cycle ratification (subsumes B4 paste-relay default; partial cover for B6 and B8).

### 3.5.1 — Universal FORCED_RULES (operational expressions of K8/K9/M-Imperative-5)

Added in v1.2 from breakdown-cycle ratification. These are universal-layer FORCED_RULES that name concrete verification or behavior steps for the kernel principles above. Full text and substrate-level identifiers in the rules registry; dashboard surfaces them with hover tooltips.

**FORCED_RULE_14 (Blocker Evidence Required):** Declared blockers must include observed-evidence, attempted-action, actual-failure, confidence-level, and remaining-unblock-test fields. "Potential blocker" and "confirmed blocker" are distinct states. Operational expression of K8.

**FORCED_RULE_15 (Config Runtime Verification):** Configuration / settings / environment / mode changes must be followed by explicit runtime verification before being treated as complete. State labels: configured / loaded / verified. Mutation is not confirmation. Operational expression of K8.

**FORCED_RULE_17 (Tool Capability Check Before Human Delegation):** Before requesting sovereign relay or manual action, the orchestrator must evaluate whether existing authorized tools can perform the action directly. Operational expression of M-Imperative-5.

**FORCED_RULE_19 (Standing Scope Persistence):** Once the sovereign authorizes a bounded scope, execution proceeds continuously within that scope. Phase-end summaries are not fresh checkpoints. Sole legitimate stops: blocker, hard-to-reverse blast radius beyond scope, calendar gate, prohibited action. Re-asking inside standing authorization is a logged breakdown.

### 3.6 — Severity, Convergence, and Modifiability

**Universal Tier Structure:**

- **Tier 1:** Reversible within a short period, minimal risk, no external commitment. Convergence requires simple majority of brains; human approval optional.
- **Tier 2:** Reversible but with moderate cost or effort, or involves external communication. Convergence requires simple majority + human ratification.
- **Tier 3:** Irreversible within 7 days, significant risk, or binding external commitment. Convergence requires unanimous brain agreement + human ratification.

**Operational Defaults** (overridable in Layer B):

- Default redundancy threshold for review trigger: human-reader judgment ("would a human reader treat these as substantially the same argument?")
- Default paste-back violation limit: 2 per project before `[NON_COMPLIANT]` flag
- Default re-post window: 5 minutes
- Default false-rollback consequence: warning, no automatic vote penalty
- Default required adversarial perspectives:
  - Tier 1: optional
  - Tier 2: at least one challenger
  - Tier 3: at least two challengers

**Layer B overrides** are permitted for project-specific risk profiles. Tier 3 monetary thresholds, time windows, and required brain count are typically set in Layer B.

---

## Section 4 — Forcing Functions and Resilience Mechanisms

These mechanisms govern Cycle 1+ work — what happens after Cycle Zero locks Layer B and real work begins.

### 4.1 — State Lock Between Rounds

**Specification:**
After a round produces a canonical artifact, a `[STATE_LOCK: <artifact_id> | ROUND: <n>]` tag must be issued. The locked artifact becomes the binding baseline for subsequent rounds.

**Trigger Conditions:**
- Explicit convergence signal at round end
- User-issued lock declaration
- If no lock issued, the previous lock remains active

**Response Procedure:**
1. Moderator (user or designated brain) posts lock tag with artifact pointer and timestamp.
2. Artifact is frozen and versioned (e.g., `EMAIL_v2_r2`).
3. All subsequent outputs that modify the locked artifact must present changes as **diffs** (Section 4.2 format), not full rewrites.

**Violation Handling:**
- First violation → `[STATE_VIOLATION]`, output rejected, re-submission required with proper diff and `[ADOPTING_FROM]`.
- Second violation (same brain, same cycle) → output ignored for that decision.
- Repeated violations → flagged for escalation (Section 4.7).

**Failure Mode:**
If state lock is missing, the cycle cannot advance. The previous locked state remains canonical.

### 4.2 — Diff-Based Changes (Within State Lock)

After a `[STATE_LOCK]` is issued, all subsequent outputs that modify the locked artifact must present changes as diffs relative to the locked state. Full-artifact rewrites are prohibited unless the entire artifact is explicitly unlocked via `[STATE_UNLOCK]` (which requires user approval).

**Diff Format:**

```
[BASE: <artifact_id>]
[DIFF]
- Removed: <text>
+ Added: <text>
~ Modified: <original> → <new>
[/DIFF]
[ADOPTING_FROM: <brain> - re-audit: <reason>]   (if change originates from another brain's prior suggestion)
```

**Failure Mode:**
Full rewrite without diff format → `[STATE_VIOLATION]` → output rejected. Persistent failure to use diffs → escalation per Section 4.7.

### 4.3 — Paste-Back Validation In Flight

**Specification:**
Every response during a live cycle must conform to the wrapper format defined in Z5. Non-compliance is detected automatically (regex/structural check) or by any brain. Correction is immediate and does not halt the cycle unless repeated.

**Trigger Conditions:**
- Missing required fields: `[BRAIN]`, `[TASK_TYPE]`, `[TIMESTAMP]`, `[END BRAIN]`
- Different delimiter or spelling
- Missing `[ROLE]` line when roles differentiated

**Response Procedure:**
1. Any brain (or user) replies with `[VALIDATION_FAIL]` pointing to violation.
2. Violating brain re-posts within default 5-minute window (configurable in Layer B) with corrected wrapper.
3. Repeated violations trigger `[FORMAT_ALERT]`; the brain's response is ignored for that sub-decision.
4. After violation limit reached (default 2, configurable in Layer B), brain marked `[NON_COMPLIANT]`. Further responses ignored unless user invokes `[ACCEPT_DESPITE_NONCOMPLIANT]`. Tier 3 cycles halt until user intervenes.

**Failure Mode:**
Silent non-compliance corrupts audit trail. For Tier 3 cycles, manual validation script must be run before advancing.

### 4.4 — Drift Detection

**Specification:**
Drift occurs when a brain's output, relative to the last locked state, changes meaning, scope, or binding constraints without explicit `[ADOPTING_FROM]` tag justifying the change. Drift is distinct from legitimate revision (which is proposed and approved with proper attribution).

**Trigger Conditions:**
- Brain reintroduces a previously rejected phrase or concept without justification.
- Brain changes a numerical threshold, date, or commitment level without `[ADOPTING_FROM]`.
- Brain adds new constraints that were not in locked artifact and not raised as gaps.
- Semantic drift: same words, shifted meaning (any brain may flag).

**Response Procedure:**
1. Any brain that observes drift posts `[DRIFT_DETECTED: <reason>]` quoting the offending line.
2. Offending brain must either acknowledge with `[RETRACTED]` or defend with `[ADOPTING_FROM]` (proving the change derives from prior locked statement or new ratified input via `[BASED_ON: <source>]`).
3. If offending brain does not respond within two messages, moderator accepts the drift claim and reverts to last locked state (Section 4.5).

**Distinguishing Drift from Legitimate Revision:**
A legitimate revision requires a new input. Brain must cite that input with `[BASED_ON: <source> - <timestamp>]`. Without such citation, any change is drift.

**Failure Mode:**
Undetected drift accumulates silently and corrupts convergence. Caught later only via post-cycle audit.

### 4.5 — Auto-Rollback

**Specification:**
When drift is confirmed (and not defended), the protocol restores the last locked state.

**Trigger Conditions:**
- `[DRIFT_DETECTED]` issued and offending brain fails to defend within two messages.
- User explicitly invokes `[ROLLBACK: <lock_id>]`.
- Repeated wrapper failures (implied execution drift).

**Response Procedure:**
1. Moderator posts `[ROLLBACK: to <lock_id> | reason: <summary>]`.
2. Thread is cleared of all posts after that lock.
3. Cycle restarts from the locked artifact.
4. Audit entry written to `FAILURE_LOG.md` with reason and offending brain.

**Who Can Trigger:**
Any brain or user. False rollbacks (where claim is later found unsubstantiated) are logged in `FAILURE_LOG.md`. Default consequence: warning only, no automatic vote penalty (per Section 3.6 default).

**Data Preserved:**
Audit log, locked artifact, and rollback metadata. Discarded posts are retained in audit log but removed from active thread.

**Failure Mode:**
If rollback itself fails to restore clean state → escalate to Cycle Reset (restart from Cycle Zero or last stable cycle).

### 4.6 — Redundancy Escalation

**Specification:**
When two or more brains produce outputs that a human reader would treat as substantially the same argument, conclusion, or phrasing — without substantive independent reasoning — this may indicate a breakdown of adversarial independence and triggers redundancy review.

**Trigger Conditions:**
The standard is human-reader judgment ("would a reader treat these as the same point?"), not a numerical word-overlap threshold. The Layer A specification deliberately avoids hardcoded thresholds; operational defaults are defined in Section 3.6 and may be overridden in Layer B.

Common signals include:
- Same conclusion and same supporting arguments in same order
- One brain explicitly says "I agree with the previous brain" without adding new reasoning
- Verbatim or near-verbatim substantial overlap of consecutive content

**Response Procedure:**
1. Any brain (or user) posts `[REDUNDANCY_FLAG: between <brainA> and <brainB>]`.
2. Review triggered: moderator asks each flagged brain to provide independent reasoning.
3. If brains fail to produce distinct reasoning after one chance, cycle enters `[REDUNDANCY_MODE]` for that decision: only one brain's output considered (typically the more detailed); other contributions logged but not counted.
4. If redundancy occurs twice in same project, protocol requires full three-brain re-initialization (rerun Cycle Zero with stricter role separation).

**False Positive Handling:**
`[REDUNDANCY_FLAG]` can be contested. If flagged brains demonstrate independent reasoning (different reasoning paths to same conclusion), flag is dismissed. Burden of proof is on flagged brains.

**Failure Mode:**
Ignored redundancy → false convergence risk → flagged in any post-cycle validation.

### 4.7 — Compliance and Participation Gating

When a brain accumulates violations across the mechanisms above, the protocol does not apply automatic punitive penalties (no vote weighting, no automatic disenfranchisement). Instead, **participation gating** applies:

- **Compliant** → full participation
- **Repeated violations within a cycle** → output ignored for that decision
- **Persistent non-compliance** → temporary exclusion until user explicitly reinstates with `[REINSTATE]`

The user retains override authority via `[ACCEPT_DESPITE_NONCOMPLIANT]` to admit non-compliant output if its substance is valuable. All compliance events are logged in `FAILURE_LOG.md`.

### 4.8 — `[AMENDMENT]` Procedure

**Specification:**
A locked Layer B document may be amended mid-project. Amendments are classified as **lightweight** or **heavy** based on scope of change.

**Trigger Conditions:**
- New information emerges (e.g., a constraint not previously known)
- User decides to expand or narrow scope
- A brain discovers a contradiction in Layer B
- Initial classification proves incorrect

**Lightweight Amendment Procedure** (default):

1. User posts `[AMENDMENT: <scope>]` with description of change.
2. Brains have a defined window (default 30 min, configurable) to raise objections.
3. If any brain raises a substantive objection, amendment is tabled for a mini-poll.
4. If no objection, user ratifies with `[AMENDMENT_RATIFIED]`.
5. Layer B updated with version note.

**Heavy Amendment Procedure** (required when change affects Tier, Kernel principles, or core cycle structure):

Run a truncated Cycle Zero (Z2 Work Classification, Z3 Role Instantiation, Z4 Cycle Structure Lock at minimum) to re-classify and re-instantiate roles. This is required when amendment changes `PROJECT_TYPE`, `TIER`, or any forced rule.

**Failure Mode:**
An undeclared change to Layer B is treated as drift. Persistent misuse triggers protocol halt. Improper ratification voids the amendment; previous Layer B remains binding.

---

## Section 5 — Archetype Library

The Universal Shell supports pre-loaded **archetypes** — project-type templates that Cycle Zero uses to populate Layer B defaults. This section provides both the schema and the filled content for all eight pre-loaded archetypes.

### 5.0 — Confidence Levels

Three archetypes have **direct empirical signal** from cycles run during protocol development:
- **Proposal** — derived from the Palace Poker email cycle
- **SaaS Build** — derived from TowMarX v3.0 (the reference Layer B instance)
- **Content** — derived from the user's blog/SEO work on TowMarX

Five archetypes have **less direct signal** and rely on principle-driven defaults plus general best practices for the project type. Forced rules in these archetypes that are uncertain are marked `# iterate-when-used`:
- Research
- Product Strategy
- Partnership / Negotiation
- Hiring / Vendor Selection
- Decision Analysis

### 5.1 — Archetype Schema

Every archetype must define the following structure:

```yaml
archetype_name: <string>
applicable_project_types: [list of PROJECT_TYPE values]
default_roles:
  - brain: <name>
    role: Architect | Reviewer | Executor | Advisor
    responsibilities: <string>
default_cycle_structure:
  - name: <string>
    task_types_allowed: [META, STRATEGY, DRAFT, REVIEW, EXECUTION]
default_severity_tiers:
  tier_1_criteria: <condition>
  tier_2_criteria: <condition>
  tier_3_criteria: <condition>
forced_rules:
  - rule_name: <string>
    description: <string>
    applicable_cycles: <list>
archetype_specific_wrapper_extras:
  - field: <string>
    required: true | false
```

The default brain configuration assumes Tommy's three-brain setup (Claude as Orchestrator, GPT as Architect/Strategist, Deepseek as Reviewer/Executor). Layer B may override these assignments per project.

### 5.2 — Proposal Archetype

```yaml
archetype_name: Proposal
applicable_project_types: [Proposal, Pitch, Outreach, Email, Deck]
default_roles:
  - brain: Claude
    role: Orchestrator
    responsibilities: Polling, synthesis, paste-back wrapping, convergence detection
  - brain: GPT
    role: Architect
    responsibilities: Strategic framing, email/draft structure, value proposition
  - brain: Deepseek
    role: Reviewer + Cross-checker
    responsibilities: Constraint validation, drift detection, forced-rule enforcement
default_cycle_structure:
  - name: Strategy
    task_types_allowed: [META, STRATEGY]
  - name: Draft
    task_types_allowed: [DRAFT]
  - name: Refine
    task_types_allowed: [DRAFT, REVIEW]
default_severity_tiers:
  tier_1_criteria: Internal drafts or low-stakes outreach
  tier_2_criteria: External communication with moderate business impact, reversible within 7 days
  tier_3_criteria: Binding contract, pricing commitment, irreversible send, or decision to abandon engagement
forced_rules:
  - rule_name: No draft in Cycle 1
    description: Cycle 1 (Strategy) may not produce any email/document body text. Output must be strategic recommendations, risks, decision options, and framing only. Illustrative phrases allowed only with [EXAMPLE, NOT FINAL].
    applicable_cycles: [Strategy]
  - rule_name: Late context injection requires restructured Cycle 1
    description: If new strategic context arrives after Cycle 1 is locked, the proposal must revert to Cycle 1 (or run a truncated Cycle Zero) to re-evaluate posture, not proceed directly to Draft.
    applicable_cycles: [Strategy, Draft]
  - rule_name: No pricing or phases in first contact email
    description: The initial outreach email (first external contact after a warm conversation) must not contain pricing, phased timelines, or deliverable lists. Those elements belong in a follow-up meeting or a subsequent written proposal after value alignment.
    applicable_cycles: [Draft]
  - rule_name: Single clear ask
    description: Each proposal must contain exactly one primary call-to-action. Multiple asks dilute response.
    applicable_cycles: [Draft]
  - rule_name: Recipient ratification before send
    description: Before any external email is sent, the final draft must be ratified by the user after a final adversarial review by all three brains, checking for tone, missing context, and unintended commitments.
    applicable_cycles: [Refine]
archetype_specific_wrapper_extras:
  - field: TARGET_RECIPIENT
    required: true
  - field: PRIMARY_ASK
    required: true
```

### 5.3 — SaaS Build Archetype

```yaml
archetype_name: SaaS Build
applicable_project_types: [Software Development, Platform Build, Feature Development, SaaS Build]
default_roles:
  - brain: Claude
    role: Orchestrator + Product Architect
    responsibilities: Cycle structure, feature breakdown, technical feasibility
  - brain: GPT
    role: System Designer + Strategist
    responsibilities: Architecture patterns, user stories, roadmap
  - brain: Deepseek
    role: Reviewer + Implementation Check
    responsibilities: Constraint validation, dependency checking, integrity of Executor role
default_cycle_structure:
  - name: Feature Definition
    task_types_allowed: [STRATEGY]
  - name: Technical Design
    task_types_allowed: [DRAFT, REVIEW]
  - name: Implementation Planning
    task_types_allowed: [DRAFT, EXECUTION]
  - name: Code Review & Merge
    task_types_allowed: [REVIEW, EXECUTION]
default_severity_tiers:
  tier_1_criteria: Refactoring, logging, comments, non-breaking changes, UI tweaks
  tier_2_criteria: New features affecting user workflows, reversible within 7 days
  tier_3_criteria: Database schema change, API contract change, production deployment, irreversible commit
forced_rules:
  - rule_name: Tier 3 required for schema changes
    description: Any change to production database schema, data migration, or external API contract requires Tier-3 classification (unanimous brains + user ratification) before any code is written.
    applicable_cycles: [Feature Definition, Technical Design]
  - rule_name: Executor role for actual code
    description: Only the agent (brain or human) designated as Executor may produce final executable code. If no Executor is specified in Layer B, the user is the default Executor. Other brains may review, challenge, or propose diffs, but not commit final production code.
    applicable_cycles: [Implementation Planning, Code Review & Merge]
  - rule_name: No silent dependency addition
    description: Any new external library, service, or API dependency must be explicitly proposed and ratified in Feature Definition or Technical Design cycles, with justification of necessity and risk.
    applicable_cycles: [Feature Definition, Technical Design]
  - rule_name: Pre-deployment adversarial review
    description: Before any merge to main branch or production deployment, a mandatory adversarial review must be performed by a brain not involved in the implementation, checking for security, performance, and backward compatibility.
    applicable_cycles: [Code Review & Merge]
  - rule_name: Reversibility check
    description: Any feature must define a rollback strategy before implementation. Tier 3 changes must include explicit rollback procedure documented in Layer B.
    applicable_cycles: [Technical Design]
archetype_specific_wrapper_extras:
  - field: FEATURE_SCOPE
    required: true
  - field: ROLLBACK_PLAN
    required: true
```

### 5.4 — Content Archetype

```yaml
archetype_name: Content
applicable_project_types: [Blog, SEO Article, Marketing Content, Content]
default_roles:
  - brain: Deepseek
    role: Executor + Reviewer
    responsibilities: Drafting content, SEO auditing, internal linking, JSON-LD
  - brain: Claude
    role: Orchestrator + Strategist
    responsibilities: Topic framing, keyword analysis, content structure
  - brain: GPT
    role: Architect + Cross-checker
    responsibilities: Tone, readability, adversarial review
default_cycle_structure:
  - name: Topic & Keyword Lock
    task_types_allowed: [META, STRATEGY]
  - name: Draft & SEO
    task_types_allowed: [DRAFT]
  - name: Review & Finalize
    task_types_allowed: [REVIEW]
default_severity_tiers:
  tier_1_criteria: Minor edits, internal notes, non-published drafts
  tier_2_criteria: Blog post scheduled for publication, external newsletter, SEO-targeted content
  tier_3_criteria: Homepage copy, legal disclaimers, irreversible public statements, brand-critical pages
forced_rules:
  - rule_name: Keyword and audience lock in Z1
    description: Before any drafting, Z1 must explicitly lock the primary keyword, secondary keywords, target audience, and intended tone. Ambiguity here forces a gap resolution before proceeding.
    applicable_cycles: [Topic & Keyword Lock]
  - rule_name: Structure before writing
    description: Outline must be created and ratified before content drafting begins.
    applicable_cycles: [Topic & Keyword Lock]
  - rule_name: JSON-LD and meta description required for publication
    description: For any content intended for public web publication (blog post, article, landing page), the final output must include JSON-LD structured data (Article schema) and a meta description. This rule is optional for other content types.
    applicable_cycles: [Draft & SEO, Review & Finalize]
  - rule_name: Internal linking audit
    description: Before finalization, the content must be reviewed for internal links to existing relevant pages. The audit must produce a [LINKING_AUDIT] listing at least one relevant internal link per 300 words of content, with a minimum of 2 links for posts under 600 words. Default thresholds; Layer B may override.
    applicable_cycles: [Review & Finalize]
  - rule_name: No AI-generated placeholder statistics
    description: Statistics, data points, or quotations that are not explicitly sourced must be flagged [UNVERIFIED]. Final ratification requires either verification or removal.
    applicable_cycles: [Draft & SEO]
archetype_specific_wrapper_extras:
  - field: TARGET_KEYWORD
    required: true
  - field: PUBLICATION_PLATFORM
    required: true
```

### 5.5 — Research Archetype

```yaml
archetype_name: Research
applicable_project_types: [Market Research, Competitive Analysis, Exploration, Research]
default_roles:
  - brain: Deepseek
    role: Structured Analyzer
    responsibilities: Data collection, gap auditing, evidence synthesis
  - brain: GPT
    role: Hypothesizer + Broad Seeker
    responsibilities: Literature mapping, alternative explanations
  - brain: Claude
    role: Orchestrator + Integrator
    responsibilities: Research question refinement, bias checking, final synthesis
default_cycle_structure:
  - name: Question & Scope
    task_types_allowed: [META, STRATEGY]
  - name: Evidence Collection
    task_types_allowed: [DRAFT]
  - name: Analysis & Synthesis
    task_types_allowed: [DRAFT, REVIEW]
default_severity_tiers:
  tier_1_criteria: Exploratory reading, informal note gathering
  tier_2_criteria: Structured research with external citations, may inform decision
  tier_3_criteria: Research that will be published externally or used as basis for irreversible investment
forced_rules:
  - rule_name: Falsifiable question or bounded exploratory objective
    description: Research must define either a falsifiable question or a clearly bounded exploratory objective. Non-falsifiable questions in decision-research contexts trigger refinement.
    applicable_cycles: [Question & Scope]
  - rule_name: Source credibility audit
    description: Each source used must be tagged with credibility level (A-D). At least two sources at A or B level required for any factual claim that is not common knowledge.
    applicable_cycles: [Evidence Collection]
    # iterate-when-used: initial version may be over-specific; adjust after first Research project
  - rule_name: Bias and counter-evidence mandatory
    description: For any conclusion, the final synthesis must include a dedicated section listing plausible alternative interpretations and any evidence that contradicts the primary conclusion.
    applicable_cycles: [Analysis & Synthesis]
  - rule_name: Uncertainty bounds on claims
    description: The output must specify confidence intervals or qualitative uncertainty levels (e.g., "low confidence," "highly speculative") for each major claim.
    applicable_cycles: [Analysis & Synthesis]
    # iterate-when-used: designed for decision research; may be relaxed for pure literature reviews
archetype_specific_wrapper_extras:
  - field: RESEARCH_QUESTION
    required: true
  - field: SOURCE_LIMIT
    required: false
```

### 5.6 — Product Strategy Archetype

```yaml
archetype_name: Product Strategy
applicable_project_types: [Product Planning, Roadmapping, Feature Prioritization, Product Strategy]
default_roles:
  - brain: GPT
    role: Strategist + Market Lens
    responsibilities: User value, competitive positioning, long-term roadmap
  - brain: Claude
    role: Orchestrator + Execution Lens
    responsibilities: Feasibility, resource constraints, technical debt
  - brain: Deepseek
    role: Reviewer + Data Lens
    responsibilities: Metrics, KPIs, trade-off analysis
default_cycle_structure:
  - name: Opportunity Framing
    task_types_allowed: [META, STRATEGY]
  - name: Option Generation
    task_types_allowed: [DRAFT]
  - name: Trade-off & Recommendation
    task_types_allowed: [DRAFT, REVIEW]
default_severity_tiers:
  tier_1_criteria: Internal brainstorming, no resource commitment
  tier_2_criteria: Recommendation for a quarter-sized initiative, reversible within 3 months
  tier_3_criteria: Platform-level pivot, annual roadmap commitment, external partnership decision
forced_rules:
  - rule_name: Problem definition first
    description: Strategy must begin with a clearly defined problem. No options generated until problem is locked.
    applicable_cycles: [Opportunity Framing]
  - rule_name: Must include "do nothing" baseline
    description: Every strategic recommendation must compare against a baseline of making no change, including projected costs (opportunity cost, maintenance, etc.).
    applicable_cycles: [Trade-off & Recommendation]
  - rule_name: At least two alternative strategies
    description: The strategy cycle must generate at least two viable alternative approaches before converging on a recommendation. Rejected alternatives must be documented with reasons for rejection.
    applicable_cycles: [Option Generation]
  - rule_name: Explicit scoring rubric for Tier 2+
    description: For Tier-2 or higher decisions, each option must be scored using an explicit rubric (e.g., RICE — Reach, Impact, Confidence, Effort) defined in Layer B.
    applicable_cycles: [Trade-off & Recommendation]
    # iterate-when-used: RICE may not fit all contexts; project-specific rubric defined in Layer B
  - rule_name: Counterfactual sensitivity analysis
    description: The recommendation must include sensitivity analysis: how would the recommendation change if key assumptions (market growth, user adoption, competitor response) are 50% better or worse?
    applicable_cycles: [Trade-off & Recommendation]
archetype_specific_wrapper_extras:
  - field: STRATEGY_HORIZON
    required: true
  - field: KEY_ASSUMPTIONS
    required: true
```

### 5.7 — Partnership / Negotiation Archetype

```yaml
archetype_name: Partnership / Negotiation
applicable_project_types: [Negotiation, Partnership Deals, Alliances, Partnership/Negotiation]
default_roles:
  - brain: Claude
    role: Orchestrator + Lead Negotiator
    responsibilities: Structuring negotiation phases, red lines, fallback positions
  - brain: GPT
    role: Strategist + Value Creator
    responsibilities: Identifying win-win options, non-monetary trade-offs
  - brain: Deepseek
    role: Reviewer + Devil's Advocate
    responsibilities: Risk auditing, worst-case scenario testing, hidden obligation detection
default_cycle_structure:
  - name: Party & Interest Mapping
    task_types_allowed: [META, STRATEGY]
  - name: BATNA & Red Lines
    task_types_allowed: [STRATEGY]
  - name: Draft Term Sheet
    task_types_allowed: [DRAFT]
  - name: Negotiation Simulation
    task_types_allowed: [REVIEW]
default_severity_tiers:
  tier_1_criteria: Exploratory conversation, information exchange
  tier_2_criteria: Non-binding letter of intent, term sheet with escape clauses
  tier_3_criteria: Binding agreement, exclusivity clause, revenue commitment, equity transfer
forced_rules:
  - rule_name: Counterparty interest mapping
    description: Identify counterparty incentives, decision-makers, and constraints before engagement. Cannot proceed without [COUNTERPARTY_MAP].
    applicable_cycles: [Party & Interest Mapping]
  - rule_name: BATNA must be explicitly defined
    description: Before any term sheet is drafted, the Best Alternative to a Negotiated Agreement (BATNA) must be documented in concrete terms. Without a BATNA, the negotiation cannot proceed to the Draft Term Sheet cycle.
    applicable_cycles: [BATNA & Red Lines]
    # iterate-when-used: requires domain expertise; may need refinement after first use
  - rule_name: Red lines require Tier-3 escalation
    description: Any proposal that crosses a documented red line (even if the counterparty offers concessions) must be escalated to Tier-3 with unanimous brain approval and user ratification.
    applicable_cycles: [Draft Term Sheet, Negotiation Simulation]
  - rule_name: Hidden obligation audit
    description: Every draft agreement must be reviewed for clauses that could create future costs or dependencies outside the obvious scope. The [HIDDEN_OBLIGATION_AUDIT] must flag automatic renewal, exclusivity spillover, non-compete, and data retention beyond termination. For Tier 1-2 partnerships, lightweight flag is sufficient; Tier 3 requires full legal review.
    applicable_cycles: [Draft Term Sheet, Negotiation Simulation]
  - rule_name: Post-agreement exit cost analysis
    description: Before ratification, the agreement must include a clear analysis of the cost and process to exit the partnership (notice period, termination fees, IP return, data deletion).
    applicable_cycles: [Negotiation Simulation]
    # iterate-when-used: high complexity; may be too heavy for small partnerships
archetype_specific_wrapper_extras:
  - field: COUNTERPARTY_NAME
    required: true
  - field: DEADLINE
    required: false
```

### 5.8 — Hiring / Vendor Selection Archetype

```yaml
archetype_name: Hiring / Vendor Selection
applicable_project_types: [Hiring, Vendor Selection, Outsourcing, Hiring/Vendor Selection]
default_roles:
  - brain: Deepseek
    role: Evaluator + Scorekeeper
    responsibilities: Scoring rubric management, bias detection, fact checking
  - brain: GPT
    role: Interviewer + Cultural Fit
    responsibilities: Question design, reference interpretation
  - brain: Claude
    role: Orchestrator + Decision Integrator
    responsibilities: Process management, final recommendation synthesis
default_cycle_structure:
  - name: Role Definition & Scoring Rubric
    task_types_allowed: [META, STRATEGY]
  - name: Candidate/Vendor Screening
    task_types_allowed: [DRAFT]
  - name: Interview/Reference Analysis
    task_types_allowed: [DRAFT, REVIEW]
  - name: Final Comparison & Offer
    task_types_allowed: [DRAFT, EXECUTION]
default_severity_tiers:
  tier_1_criteria: Freelance one-off task, short-term contract under $500
  tier_2_criteria: Full-time hire, annual vendor contract under $10k, freelance ongoing
  tier_3_criteria: Full-time executive hire, multi-year vendor contract >$50k, critical security/function role
forced_rules:
  - rule_name: Scoring rubric defined before candidates seen
    description: To prevent anchoring bias, the scoring rubric (categories, weights, scoring scale) must be locked in the Role Definition cycle before any candidate/vendor names are introduced.
    applicable_cycles: [Role Definition & Scoring Rubric]
  - rule_name: Conflict of interest declaration
    description: Each brain must self-declare any known conflict of interest before evaluating candidates/vendors. If no conflict exists, a single [NO_CONFLICT] statement at the start of the cycle suffices. If a conflict is declared, the brain's evaluation is logged but excluded from final scoring unless user overrides.
    applicable_cycles: [Role Definition & Scoring Rubric, Candidate/Vendor Screening, Interview/Reference Analysis, Final Comparison & Offer]
  - rule_name: Blind review for Tier 2+ initial screening
    description: For Tier-2 and above, the initial screening should be done with candidate/vendor names removed where practical. If blind review is not practical, document why in [SCREENING_NOTE].
    applicable_cycles: [Candidate/Vendor Screening]
    # iterate-when-used: may be impractical for small pipelines; revisit after first use
  - rule_name: Reference check mandatory for top 2 finalists
    description: No final offer may be extended without collecting at least two substantive reference conversations (not email) for each finalist. Reference summaries must be included in audit trail.
    applicable_cycles: [Interview/Reference Analysis]
  - rule_name: Decision documentation
    description: Final decision must be documented with explicit reasoning, weighted scores, and rejection rationale for non-selected candidates.
    applicable_cycles: [Final Comparison & Offer]
archetype_specific_wrapper_extras:
  - field: ROLE_OR_VENDOR_TYPE
    required: true
  - field: BUDGET_RANGE
    required: true
```

### 5.9 — Decision Analysis Archetype

```yaml
archetype_name: Decision Analysis
applicable_project_types: [Decision Analysis, Go/No-Go, Decision]
default_roles:
  - brain: Deepseek
    role: Structured Evaluator
    responsibilities: Option framing, criteria weighting, scoring
  - brain: Claude
    role: Orchestrator + Devil's Advocate
    responsibilities: Challenging assumptions, worst-case analysis, synthesis
  - brain: GPT
    role: Creative Optioner
    responsibilities: Generating alternatives beyond binary go/no-go
default_cycle_structure:
  - name: Frame Options
    task_types_allowed: [STRATEGY]
  - name: Criteria & Weights
    task_types_allowed: [STRATEGY]
  - name: Decision & Rationale
    task_types_allowed: [DRAFT, REVIEW]
default_severity_tiers:
  tier_1_criteria: Minor go/no-go with low irreversible cost
  tier_2_criteria: Decision affects >$500 or multi-week effort, reversible within 7 days
  tier_3_criteria: Decision binds external partners, exceeds $5000, or commits to irreversible direction
forced_rules:
  - rule_name: Must include "do nothing" baseline
    description: The decision options must always include an explicit "no action" or "maintain status quo" baseline with its own projected costs and benefits.
    applicable_cycles: [Frame Options]
  - rule_name: At least two alternatives beyond binary
    description: Beyond "go" and "no-go", the analysis must generate at least two other creative options (e.g., "go with reduced scope", "delay 3 months", "partial commitment").
    applicable_cycles: [Frame Options]
  - rule_name: Explicit go/no-go threshold
    description: The decision must have a pre-defined threshold (e.g., "go if expected ROI > 2x", "no-go if any red-line risk materializes"). Ambiguous decision criteria force refinement.
    applicable_cycles: [Criteria & Weights]
archetype_specific_wrapper_extras:
  - field: DECISION_DEADLINE
    required: true
  - field: KEY_UNCERTAINTIES
    required: true
```

### 5.10 — Archetype Interactions

Some archetypes naturally overlap or sequence. The Universal Shell does not support combining archetypes in a single Cycle Zero, but projects may require multiple phases. The handling below was ratified during the archetype drafting cycle.

**General principle:** Default to one primary archetype. If the project changes objective class, trigger parent/child structure or sequential Cycle Zeros via `[AMENDMENT: archetype_shift]`.

**Common interaction patterns:**

| Interaction | Example | Handling |
|-------------|---------|----------|
| Research → Proposal | Research market demand, then write proposal | Parent/child Layer B. Run full Research Cycle Zero. Output becomes Z1 input to lightweight Proposal adaptation round (not full second Cycle Zero). |
| Product Strategy → SaaS Build | Strategy decides feature; Build implements | Sequential separate Cycle Zeros. Strategy is distinct phase from Build. Strategy output becomes Z1 input to Build Cycle Zero. |
| Partnership + Hiring | Vendor negotiation that may convert to a hire | Start as Partnership/Negotiation. If path shifts to employment/vendor engagement, trigger `[AMENDMENT: archetype_shift]` and run partial Cycle Zero (Z2, Z3, Z4) for Hiring/Vendor Selection. |
| Decision Analysis → Research → Proposal | "Should I go after a partnership with X, and if so, propose it" | Parent/child structure. Decision Analysis as parent (often Tier 1, lightweight). If "go", run Research as child (if facts missing). Then Proposal as second child only if decision passes. Three archetypes, one project intent. |
| Content + Research | Research output is a blog post | Single Content archetype works; Content Z1 must reference Research output as context. No dual Cycle Zero needed if scope is contained. |

**For complex multi-archetype projects:** The first Cycle Zero should be for the earliest decision-gate archetype (typically Decision Analysis or Research). Its output then determines whether to run a second Cycle Zero for the execution archetype.

**True hybrid projects** (where archetypes cannot be cleanly sequenced) should use `OTHER` classification with a custom Layer B that combines rules manually. The Universal Shell does not provide automated multi-archetype instantiation in v1.1.

### 5.11 — Custom Archetype Save

The user may save any custom-generated Layer B as a new archetype for future reuse. Custom archetypes follow the same schema and become part of the personal archetype library extending the eight pre-loaded archetypes.

---

## Section 6 — Status and Deferred Items

### Status

**Universal Shell v1.1** — ratified across five sequential deliberation cycles (Diagnostic, Architecture, Drafting Structure, Drafting, Archetype Library). All sections produced via unanimous multi-brain convergence with re-audited cross-adoption.

**Changes from v1.0:**
- Section 5 (Archetype Schema) renamed to Archetype Library
- Section 5 expanded to include filled content for eight pre-loaded archetypes
- Decision Analysis added as the 8th archetype during Round 2 cross-check of archetype drafting
- Archetype Interactions sub-section added (Section 5.10)

This document supersedes any prior consolidated form. Amendments to this document require a Tier 3 poll per Section 3.1.

### Deferred Items

Items intentionally not specified in v1.1:

- **Validation cycle outcomes** — validation against real third-domain projects (per the original 4-cycle plan) was declared out-of-scope for the protocol-development thread. Validation is expected to occur organically when this Universal Shell is next applied to a real project. v1.1 is therefore "convergent but not field-tested."
- **Protocol Generator** — meta-rules for generating project-specific protocols. Architecture cycle ratified deferral until Universal Shell stabilizes through field use.
- **Dashboard / software implementation** — copy-paste-based execution is the current medium. Whether to build the protocol as software is an open architectural question deferred to future deliberation.
- **Automated multi-archetype instantiation** — the Universal Shell handles multi-archetype projects via parent/child structure or sequential Cycle Zeros, but does not provide automated detection or merging of archetypes. This is a v1.2+ consideration.
- **Filled `OTHER` archetype handling** — when a project does not match any of the eight pre-loaded archetypes, brains generate a custom Layer B from scratch. The user may save this as a new archetype, but no formal procedure for promoting custom archetypes to canonical status is specified.

### Reference Layer B

`TowMarX_v3.0.md` is preserved unchanged as the first reference Layer B instance. Any other illustrative examples in this document are non-normative.

### Document Generation

This document was produced through the protocol it describes — five sequential deliberation cycles among three independent reasoning engines (Claude, GPT, Deepseek) with the user as Tier 3 sovereign. The friction points encountered during this self-referential drafting were themselves diagnostic data informing v1.1.

---

*End of Universal Shell v1.1*
