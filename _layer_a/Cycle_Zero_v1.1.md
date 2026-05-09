# Cycle Zero Specification v1.1

**Universal Shell — Mandatory Pre-Execution Gate**

**Status:** RATIFIED via 4-cycle deliberation (Diagnostic → Architecture → Drafting Structure → Drafting), unanimous brain convergence + Tommy Tier 3 sign-off, 2026-05-03.

Standalone artifact. Pending validation on real third project before the remainder of the Universal Shell is drafted.

---

## Section 0 — Purpose

Cycle Zero is a mandatory setup phase that executes **before any substantive work** (Strategy, Drafting, Research, Execution, etc.) begins. Its purpose is to lock context, rules, roles, and structure so that subsequent cycles operate under shared, immutable constraints. No Cycle 1+ work is permitted unless Cycle Zero produces a ratified Layer B Project Instance document.

Cycle Zero is **triggered by Tommy's plain-language intent** — not by manual classification. The AI brains infer project type, archetype, and tier, then generate a draft Layer B for ratification. Active Tommy time for archetypal projects is targeted at under 10 minutes.

**Design philosophy:** Resilient under imperfect conditions, not perfect. The protocol must work when context is missing, brains drift, or rounds are fired without defined goals. Forcing functions over correctness proofs.

---

## Section 1 — Trigger Model (Front Door)

The default entry point for Cycle Zero is Tommy's plain-language intent.

**Example:** *"I want to create a proposal for Palace Poker."*

### Step-by-step flow

1. **Tommy states intent** (one sentence or short paragraph). No prior classification required. Tommy never selects archetype manually.

2. **AI brains process intent in parallel:**
   - Extract likely `PROJECT_TYPE`
   - Infer `TIER` based on risk/reversibility heuristics
   - Match to best-fit archetype (if any)
   - Identify implicit context already present
   - Flag missing info as `[GAP_AUDIT]`

3. **Brains generate a draft Layer B document** (all eight gates with default values for omitted info). Draft includes:
   - Proposed `CLASSIFICATION.md` (inferred)
   - Default `ROLES.md` from archetype
   - Default `CYCLE_STRUCTURE.md`
   - Default `WRAPPER_SPEC.md`
   - Summary of gaps requiring Tommy's confirmation

4. **Tommy reviews the draft** (presented as a single, unified document) and:
   - Accepts all defaults → ratification (pass)
   - Corrects any mis-classification or adds missing context → one round of revision
   - Rejects and starts over (rare)

5. **Final ratification** produces the locked Layer B document.

If no archetype matches, brains generate a custom Layer B using the same 8-gate process without template defaults. Active deliberation time increases (~15–20 min instead of <10 min).

The trigger model is also available in **Quick-Start mode** (see Section 2). Quick-start uses the trigger model — it does not bypass it.

### Ambiguity handling

When intent is ambiguous (e.g., *"I want to figure out whether to go after Palace at all"* — Decision Analysis OR Proposal?), AI detects classification conflict and asks **one** targeted clarifying question in plain language. AI never asks "which archetype?" — it asks about the underlying goal. If Tommy stays unsure, default to best-fit archetype with `[PROVISIONAL]` flag and no stall.

---

## Section 2 — Quick-Start Path (Tier 1 Simple)

For projects classified as Tier 1 simple (low complexity, reversible, low stakes), Cycle Zero collapses to a minimal three-gate execution:

**Required gates:**
- Z1 — Context Dump
- Z2 — Work Classification
- Z5 — Wrapper Lock

**Auto-defaulted gates:**
- Z3 — Roles: single brain (Deepseek) as Executor
- Z4 — Cycle Structure: single cycle (DRAFT)
- Z6 — Routing: single-brain bypass (no parallel polling)
- Z7 — Kernel: deemed accepted unless Tommy objects
- Z8 — Recovery: default minimal

The trigger model still operates: Tommy declares intent in plain language, AI infers Tier 1 simple classification and confirms via Z1/Z2/Z5.

**`[TIER_CHECK]` safety net** (mandatory, see Section 4): The single brain operating in Quick-Start mode **must** emit a `[TIER_CHECK]` block in its first response. Any criterion answered "yes" or "unclear" triggers automatic escalation to full three-brain Cycle Zero.

---

## Section 3 — The Eight Gates (Z1–Z8)

Each gate uses a consistent template:
**Name | Purpose | Inputs Required | Brain Actions | Output Artifact | Pass Criteria | Fail Behavior**

### Z1 — Context Dump

| Field | Specification |
|---|---|
| **Purpose** | Establish all known facts, assumptions, and explicitly flagged unknowns before any analysis. |
| **Inputs** | Tommy's plain-language intent (any length). |
| **Actions** | Each brain independently produces a `[GAP_AUDIT]` block listing missing, ambiguous, or assumed items. |
| **Output** | Frozen `CONTEXT.md` (Tommy's intent + merged gap list, duplicates removed). |
| **Pass** | All brains submit `[GAP_AUDIT]`. No `[CRITICAL]` gap remains unresolved unless Tommy logs `[KNOWN_GAP]` with justification. |
| **Fail** | Tommy refuses to fill `[CRITICAL]` gap and does not log `[KNOWN_GAP]` → abort. |

### Z2 — Work Classification

| Field | Specification |
|---|---|
| **Purpose** | Determine `PROJECT_TYPE`, `TIER`, `ARCHETYPE`, and `SCOPE`. |
| **Inputs** | `CONTEXT.md`. |
| **Actions** | Brains independently propose `PROJECT_TYPE` (Proposal \| SaaS Build \| Content \| Research \| Product Strategy \| Partnership/Negotiation \| Hiring/Vendor Selection \| OTHER+description), `TIER` (1\|2\|3, generalized from TowMarX criteria), `SCOPE` (one sentence). |
| **Output** | `CLASSIFICATION.md`. |
| **Pass** | Brain agreement OR Tommy tie-break. Classification locked. |
| **Fail** | Tommy cannot select after one clarification round → abort. |

### Z3 — Role Instantiation

| Field | Specification |
|---|---|
| **Purpose** | Define which brain(s) perform which roles for this project. |
| **Inputs** | `CLASSIFICATION.md`. |
| **Actions** | Suggest role matrix. For archetypal projects, archetype provides defaults. For custom projects, brains deliberate and output `ROLES.md` (Brain \| Role \| Specific Responsibilities). |
| **Output** | `ROLES.md`. |
| **Pass** | Tommy ratifies. |
| **Fail** | Brains revise once if rejected; still rejected → abort. |

### Z4 — Cycle Structure Lock

| Field | Specification |
|---|---|
| **Purpose** | Define the cycle sequence (e.g., Strategy → Draft → Refine). |
| **Inputs** | `ROLES.md`. |
| **Actions** | Propose ordered cycle names with permitted `TASK_TYPE` per cycle. Enforce "no forward leakage" (each cycle's output binds the next; no work belonging to a later cycle is allowed in an earlier one). |
| **Output** | `CYCLE_STRUCTURE.md`. |
| **Pass** | Tommy ratifies. May collapse to single cycle for simple projects. |
| **Fail** | Two failed attempts → abort. |

### Z5 — Paste-Back Wrapper Lock

| Field | Specification |
|---|---|
| **Purpose** | Mandate the exact format for all brain responses for this project's entire run. |
| **Inputs** | None beyond Universal Shell default. |
| **Actions** | Confirm wrapper template (default below; overridable only by Tommy). |
| **Output** | `WRAPPER_SPEC.md`. |
| **Pass** | Tommy ratifies. No response without this wrapper is considered delivered. |
| **Fail** | Non-compliant responses rejected with templated correction. After two rejections, brain marked `[NON_COMPLIANT]`; cycle falls back to manual moderation. |

**Default wrapper format:**

```
[BRAIN: <name> | TASK_TYPE: <type> | TIMESTAMP: YYYY-MM-DD HH:MM:SS | CYCLE: <name>]
<response>
[END BRAIN: <name>]
```

Plus `[ROLE]` line if roles are differentiated.

### Z6 — Three-Brain Routing Validation

| Field | Specification |
|---|---|
| **Purpose** | Ensure parallel polling and no cross-brain echo before responses are submitted. |
| **Inputs** | Project declared to use three brains. |
| **Actions** | Brains self-certify they will not read other responses before posting. Protocol runner implements parallel session separation. |
| **Output** | `ROUTING_CONFIRMATION.md`. |
| **Pass** | Parallel polls initiated. No reference to another brain's content before all are in. |
| **Fail** | Fallback to single-brain with explicit log, or abort. **Bypassed automatically in Quick-Start path** (see Section 2). |

### Z7 — Kernel Confirmation

| Field | Specification |
|---|---|
| **Purpose** | Ratify universal Kernel principles (generalized K1–K7) for this project. |
| **Inputs** | Kernel principles from Universal Shell. |
| **Actions** | Present Kernel to Tommy. |
| **Output** | `KERNEL_RATIFICATION.md`. |
| **Pass** | Tommy ratifies (or default-accept in Quick-Start). |
| **Fail** | Tommy rejects any principle → project cannot run under Universal Shell; abort. |

### Z8 — Failure Recovery Protocol

| Field | Specification |
|---|---|
| **Purpose** | Define what happens when any gate fails or the cycle stalls. |
| **Inputs** | Specific failure point. |
| **Actions** | Apply recovery options: recoverable failure (Tommy fills, retry); irrecoverable (Tommy may `[EXECUTIVE_OVERRIDE]` with logged reasoning); brain timeout 48h, no response (remaining two brains proceed under `[BRAIN_ABSENT]` with unanimous-of-present agreement); identical outputs (trigger `[REDUNDANCY_MODE]` review). |
| **Output** | `FAILURE_LOG.md` attached to Layer B document. |
| **Pass** | Failure resolved or clean abort logged. |
| **Fail** | Three resolution attempts without success → project abandoned; no further cycles run. |

---

## Section 4 — Forcing Functions Within Cycle Zero

These apply specifically to Cycle Zero execution (not later cycles).

### 1. `[GAP_AUDIT]` requirement

Each brain produces a `[GAP_AUDIT]` block in Z1. Format:

```
[GAP_AUDIT]
- CRITICAL: <gap that would block subsequent cycles>
- MINOR: <gap that affects quality but not feasibility>
- CLARIFICATION: <ambiguity needing one-line resolution>
[END GAP_AUDIT]
```

A gap is `[CRITICAL]` if its absence would make any subsequent cycle impossible or highly likely to produce wrong output.

### 2. Phase gate between Z1 and Z2

No Z2 discussion begins until all brains have submitted `[GAP_AUDIT]` and `CONTEXT.md` is frozen.

### 3. Archetype schema validation

When an archetype is selected, the generated `ROLES.md`, `CYCLE_STRUCTURE.md`, and `WRAPPER_SPEC.md` must conform to that archetype's schema (see Section 6).

### 4. Time bound per gate

Each gate (except Z1) is limited to 30 minutes of brain deliberation. If no convergence, fallback to Z8.

### 5. Quick-Start simplification

If `TIER=1` and `SIMPLE=true` (declared by Tommy or inferred by AI): only Z1, Z2, Z5 are mandatory. Z3, Z4, Z6, Z7 auto-default per Section 2. Z8 reduces to default minimal recovery.

### 6. `[TIER_CHECK]` safety net (Quick-Start only)

Any single brain operating in Quick-Start mode **must** emit the following block as part of its first response:

```
[TIER_CHECK]
Proposed tier: Tier 1
Reason: <one-line>
Escalation triggers checked:
  - Reversible within 7 days?              yes / no / unclear
  - Financial/legal/reputational risk
    > $500?                                yes / no / unclear
  - Requires external partnership
    decision?                              yes / no / unclear
  - Multi-step project?                    yes / no / unclear
  - Requires role separation?              yes / no / unclear
  - Ambiguous objective?                   yes / no / unclear
Decision: proceed quick-start  |  ESCALATE
[/TIER_CHECK]
```

**Any** answer of "yes" or "unclear" → automatic escalation to full three-brain Cycle Zero. The brain may not silently proceed.

---

## Section 5 — AI-Assisted Instantiation Flow

The Trigger Model (Section 1) is the front door. The full Cycle Zero instantiation flow is:

1. Tommy states intent (one sentence or short paragraph).
2. AI receives intent. No archetype pre-selection required from Tommy.
3. AI runs parallel inference (or single-brain inference if Quick-Start path is being attempted):
   - Extract `PROJECT_TYPE`
   - Infer `TIER`
   - Match archetype
   - Run `[GAP_AUDIT]`
   - Identify ambiguities for one-question clarification
4. AI generates draft Layer B document. For archetypal projects, archetype defaults populate Z3–Z7. For custom projects, brains deliberate.
5. AI presents draft Layer B + targeted clarification questions in plain language. Format: single unified document with gaps highlighted inline.
6. Tommy reviews:
   - Accept all defaults → ratify (pass)
   - Correct mis-classification or add missing context → one revision round
   - Reject → start over
7. Final ratification → Layer B locked → Cycle 1 may begin.

The flow is **generative, not autonomous**. Brains propose; Tommy ratifies. The goal is to make Cycle Zero feel like a 2-minute conversational exchange for Quick-Start projects and <10 minutes for Tier 2 archetypal projects.

---

## Section 6 — Archetype Schema (Structure Only)

Every archetype must define the following structure. Filled archetype content (Proposal, SaaS Build, Content, etc.) is **deferred** to a later drafting cycle.

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

**Pre-loaded archetype list** (deferred content):
- Proposal
- SaaS Build
- Content
- Research
- Product Strategy
- Partnership / Negotiation
- Hiring / Vendor Selection

Tommy may save any custom-generated Layer B as a new archetype for future reuse.

---

## Section 7 — Resilience Mechanisms Within Cycle Zero

Of the Universal Shell resilience mechanisms ratified in the Architecture cycle, the following apply **within Cycle Zero** (not later cycles):

### Provisional flagging

During Z1, if context is incomplete but not `[CRITICAL]`, brains may respond with `[PROVISIONAL]` and propose a minimal viable subset of the classification. Cycle Zero proceeds; flag transfers to Layer B.

### Redundancy check

In Z6, the system verifies all three brains are responding. If one brain fails to respond within the time limit, the remaining two execute redundancy fallback: unanimous agreement required, decisions logged as `[REDUNDANCY_MODE]`.

### Escalation rule

If any gate fails twice, invoke Z8. Tommy may `[EXECUTIVE_OVERRIDE]` with logged reasoning.

**Drift detection and auto-rollback are deferred** — they apply to later cycles where persistent state exists. Cycle Zero has no canonical artifact to drift from until ratification.

---

## Section 8 — Cycle Zero Output (The Layer B Document)

A completed Cycle Zero produces a single `LAYER_B_<PROJECT_NAME>.md` file containing:

- `CONTEXT.md` (frozen Tommy intent + merged gap list)
- `CLASSIFICATION.md` (`PROJECT_TYPE`, `TIER`, `ARCHETYPE`, `SCOPE`)
- `ROLES.md` (Brain \| Role \| Responsibilities matrix)
- `CYCLE_STRUCTURE.md` (ordered cycles with permitted `TASK_TYPE` per cycle)
- `WRAPPER_SPEC.md` (paste-back format)
- `ROUTING_CONFIRMATION.md` (parallel polling certified, or single-brain bypass logged for Quick-Start)
- `KERNEL_RATIFICATION.md` (Tommy explicit acceptance)
- `FAILURE_LOG.md` (may be empty)
- `[TIER_CHECK]` block (Quick-Start only)

This document is **binding** for all subsequent cycles of the project. Any change to it requires either:
- Rerunning Cycle Zero, or
- Formal `[AMENDMENT]` procedure (deferred — to be defined in later Universal Shell sections)

**Cycle 1 may not begin until Layer B is locked.**

---

## Section 9 — Status and Deferred Items

**Status:** This is Cycle Zero v1.1, ratified 2026-05-03. **Pending validation** on a real third project before the remainder of the Universal Shell is drafted.

**Deferred to subsequent cycles:**
- Generalized Kernel principles (K1–K7 adapted from TowMarX)
- Generalized Meta-Protocol rules (polling discipline, M-Imperatives)
- Forcing functions for cycles **after** Cycle Zero (state lock, etc.)
- Resilience mechanisms applying across multiple cycles (drift detection, auto-rollback)
- Filled-out archetype library content (the seven specific archetypes populated)
- `[AMENDMENT]` procedure for modifying a locked Layer B document
- Validation cycle test outcomes against this v1.1 specification

---

*End of Cycle Zero Specification v1.1*
