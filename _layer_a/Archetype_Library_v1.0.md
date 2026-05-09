# Archetype Library v1.0

**Filled Archetype Content for Universal Shell v1.1**

**Status:** RATIFIED via two-round drafting cycle, unanimous brain convergence + Tommy Tier 3 sign-off, 2026-05-03.

**Companion to:** `Universal_Shell_v1.1.md` (Section 5 — Archetype Library)

This document is a standalone extract of the eight pre-loaded archetypes and their interactions. The canonical authoritative version lives in Universal Shell v1.1 Section 5. This file exists for portability and ease of reference when only the archetype content is needed.

---

## Preamble

### Confidence Levels

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

### Default Brain Configuration

The default brain assignments assume Tommy's three-brain setup:
- **Claude** — Orchestrator (polling, synthesis, paste-back wrapping)
- **GPT** — Architect or Strategist
- **Deepseek** — Reviewer / structured-output specialist / Executor

Layer B may override these assignments per project.

### Wrapper Extras Framing

Wrapper extras capture **decision-critical variables** or **artifacts the project produces**, not housekeeping metadata.

---

## Archetype Schema

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

---

## 1. Proposal Archetype

**Confidence:** High (Palace Poker cycle empirical data)

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

---

## 2. SaaS Build Archetype

**Confidence:** High (TowMarX v3.0 empirical data)

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

---

## 3. Content Archetype

**Confidence:** High (TowMarX blog/SEO empirical data)

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

---

## 4. Research Archetype

**Confidence:** Medium (principle-driven, iterate-when-used)

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

---

## 5. Product Strategy Archetype

**Confidence:** Medium (principle-driven, iterate-when-used)

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

---

## 6. Partnership / Negotiation Archetype

**Confidence:** Medium (principle-driven, iterate-when-used)

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

---

## 7. Hiring / Vendor Selection Archetype

**Confidence:** Medium (principle-driven, iterate-when-used)

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

---

## 8. Decision Analysis Archetype

**Confidence:** Medium (principle-driven, added during Round 2 cross-check)

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

---

## Archetype Interactions

Some archetypes naturally overlap or sequence. The Universal Shell does not support combining archetypes in a single Cycle Zero, but projects may require multiple phases.

**General principle:** Default to one primary archetype. If the project changes objective class, trigger parent/child structure or sequential Cycle Zeros via `[AMENDMENT: archetype_shift]`.

### Common Interaction Patterns

| Interaction | Example | Handling |
|-------------|---------|----------|
| Research → Proposal | Research market demand, then write proposal | Parent/child Layer B. Run full Research Cycle Zero. Output becomes Z1 input to lightweight Proposal adaptation round (not full second Cycle Zero). |
| Product Strategy → SaaS Build | Strategy decides feature; Build implements | Sequential separate Cycle Zeros. Strategy is distinct phase from Build. Strategy output becomes Z1 input to Build Cycle Zero. |
| Partnership + Hiring | Vendor negotiation that may convert to a hire | Start as Partnership/Negotiation. If path shifts to employment/vendor engagement, trigger `[AMENDMENT: archetype_shift]` and run partial Cycle Zero (Z2, Z3, Z4) for Hiring/Vendor Selection. |
| Decision Analysis → Research → Proposal | "Should I go after a partnership with X, and if so, propose it" | Parent/child structure. Decision Analysis as parent (often Tier 1, lightweight). If "go", run Research as child (if facts missing). Then Proposal as second child only if decision passes. Three archetypes, one project intent. |
| Content + Research | Research output is a blog post | Single Content archetype works; Content Z1 must reference Research output as context. No dual Cycle Zero needed if scope is contained. |

### For Complex Multi-Archetype Projects

The first Cycle Zero should be for the earliest decision-gate archetype (typically Decision Analysis or Research). Its output then determines whether to run a second Cycle Zero for the execution archetype.

### True Hybrid Projects

Projects where archetypes cannot be cleanly sequenced should use `OTHER` classification with a custom Layer B that combines rules manually. The Universal Shell does not provide automated multi-archetype instantiation in v1.1.

---

## Custom Archetype Save

The user may save any custom-generated Layer B as a new archetype for future reuse. Custom archetypes follow the same schema and become part of the personal archetype library extending the eight pre-loaded archetypes.

---

## Status

**Archetype Library v1.0** — ratified 2026-05-03. Pending validation when next applied to a real project. Three archetypes (Proposal, SaaS Build, Content) are empirically grounded. Five archetypes (Research, Product Strategy, Partnership/Negotiation, Hiring/Vendor Selection, Decision Analysis) are principle-driven with `iterate-when-used` rules flagged for refinement after first real use.

---

*End of Archetype Library v1.0*
