# Universal Shell v1.0

**A Multi-Brain Decision Protocol for Cross-Domain Project Execution**

**Status:** RATIFIED via 4-cycle deliberation (Diagnostic → Architecture → Drafting Structure → Drafting), unanimous brain convergence + Tommy Tier 3 sign-off, 2026-05-03.

**Pending validation** when next applied to a real project. The protocol is considered v1.0 because all sections are convergent across three independent brains, but no real-world test has yet been run against this consolidated form.

---

## Document Structure

This document is **Layer A** — the cross-project Universal Shell. It is paired with **Layer B** (Project Instance) documents generated per project via Cycle Zero. The canonical Layer B reference instance is `TowMarX_v3.0.md`, preserved unchanged.

Sections in order:

0. Preamble — Origin and Scope
1. Kernel Principles (K1–K7)
2. Cycle Zero (the mandatory pre-execution gate)
3. Meta-Protocol (governance during execution)
4. Forcing Functions and Resilience Mechanisms (post-Cycle-Zero)
5. Archetype Schema (structure only; content deferred)
6. Status and Deferred Items

The Universal Shell is a generic template. Examples within this document are illustrative only. The canonical filled instance for the TowMarX project is maintained separately as `TowMarX_v3.0.md` (unchanged from its original form).

---

## Section 0 — Preamble

### Origin

The Universal Shell is extracted from the TowMarX Protocol v3.0, generalized for cross-domain use. TowMarX v3.0 remains preserved as the first reference Layer B instance. This document is the result of four sequential deliberation cycles producing convergent multi-brain output across three independent reasoning engines.

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

---

## Section 2 — Cycle Zero (Mandatory Pre-Execution Gate)

Cycle Zero v1.1, fully ratified, is incorporated here. This section is reproduced from `Cycle_Zero_v1.1.md` for completeness within the Universal Shell.

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

Layer B is **binding** for all subsequent cycles. Any change requires either rerunning Cycle Zero or invoking the `[AMENDMENT]` procedure (Section 4.6). **Cycle 1 may not begin until Layer B is locked.**

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

## Section 5 — Archetype Schema

The Universal Shell supports pre-loaded **archetypes** — project-type templates that Cycle Zero uses to populate Layer B defaults. The schema below defines what every archetype must contain. **Archetype content is deferred** — schemas only are specified here.

### Archetype Schema Definition

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

### Pre-Loaded Archetype List (content deferred)

- Proposal
- SaaS Build
- Content
- Research
- Product Strategy
- Partnership / Negotiation
- Hiring / Vendor Selection

The user may save any custom-generated Layer B as a new archetype for future reuse. Archetype content is populated through optional later cycles or ad-hoc as projects are started.

---

## Section 6 — Status and Deferred Items

### Status

**Universal Shell v1.0** — ratified across four sequential deliberation cycles (Diagnostic, Architecture, Drafting Structure, Drafting). All sections produced via unanimous multi-brain convergence with re-audited cross-adoption.

This document supersedes any prior consolidated form. Amendments to this document require a Tier 3 poll per Section 3.1.

### Deferred Items

Items intentionally not specified in v1.0:

- **Filled-out archetype library content** — schemas defined; specific archetype content (Proposal forced rules, Content cycle structure, etc.) deferred to optional later cycles.
- **Validation cycle outcomes** — validation against real third-domain projects (per the original 4-cycle plan) was declared out-of-scope for the protocol-development thread. Validation is expected to occur organically when this Universal Shell is next applied to a real project. v1.0 is therefore "convergent but not field-tested."
- **Protocol Generator** — meta-rules for generating project-specific protocols. Architecture cycle ratified deferral until Universal Shell stabilizes through field use.
- **Dashboard / software implementation** — copy-paste-based execution is the current medium. Whether to build the protocol as software is an open architectural question deferred to future deliberation.

### Reference Layer B

`TowMarX_v3.0.md` is preserved unchanged as the first reference Layer B instance. Any other illustrative examples in this document are non-normative.

### Document Generation

This document was produced through the protocol it describes — a four-cycle deliberation among three independent reasoning engines (Claude, GPT, Deepseek) with the user as Tier 3 sovereign. The friction points encountered during this self-referential drafting were themselves diagnostic data informing v1.0.

---

*End of Universal Shell v1.0*
