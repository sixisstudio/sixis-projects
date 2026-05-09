# Research Brief — SiXiS in the Multi-Agent Decision Landscape

**Project:** Gemini Synthesis Judge v0.1, Cycle 4
**Source:** ChatGPT exploration chat (separate from this Claude Code session) where the user (a) asked another model to read every page on dashboard.sixis.ai, (b) compared SiXiS to other multi-agent / adversarial / governance tools on the market, (c) discussed "what to adopt from the others," (d) probed whether SiXiS is "the concept of generative AI improving itself," (e) explored big-possibility framings, and (f) re-surveyed the competitive landscape.
**Why durable:** Tommy's stated project scope had two halves — *build the Judge* and *capture this chat*. The Judge work is logged via cross-poll convergence + Cycle 1+2 ship. This brief is the durable form of the capture half. It exists so future positioning, partnership, fundraising, or external-communication projects don't have to re-derive how SiXiS sits in the market.

---

## 1. What category is SiXiS?

The closest market labels are: **structured multi-agent AI deliberation framework**, **adversarial collaboration platform for decision intelligence**, or **multi-agent AI governance system**. None fully fit. The exploration chat landed on this framing:

> SiXiS is a **governance and execution framework that deliberately captures its own breakdowns to harden itself over time, with a human sovereign in the loop on all irreversible moves.**

That sentence is the durable positioning sentence. Use it verbatim for external comms when an elevator pitch is needed.

The category is also distinct from **what generative AI / LLMs are doing to improve**. The user asked this directly. The crisp answer: SiXiS is not an LLM-improvement method. The brains are stateless instances that rely on the bootstrap + substrate to get up to speed each session. They don't get smarter over time — the *scaffolding around them* does. SiXiS is to LLM collaboration what agile is to software development: a structured practice that improves the process and outcomes while the underlying technology improves on its own track.

---

## 2. Competitive landscape (categories + closest matches)

The exploration surfaced four real categories and one academic category. Each category has working products; none combine all the SiXiS primitives.

| Category | Closest match | What overlaps | What's missing vs SiXiS |
|---|---|---|---|
| **Adversarial Councils / Debate-as-a-Service** | ChatBotKit's Adversarial Council; Swarm Discussion (Moderator/Contrarian/Historian); `@faviovazquez/deliberate`; Expert Panel Deliberation | Forces multiple agents to debate before output; structured disagreement rounds | One-off debate per question. No persistent project, no human sovereign, no immutable audit log, no kernel principles, no Cycle Zero gate. |
| **Multi-Model Triangulation** | CoReason MACO (council of models with 4th Judge synthesizing) | Runs multiple models, has a separate "judge" role | Deterministic recipes for narrow tasks (code-gen, fact-check). No multi-cycle project execution. |
| **Auditable AI Governance / Workflow Enforcement** | Castra (7-role RBAC + cryptographic audit chain); ADEPT (transparent ethics panel with logged votes) | Immutable audit trails; deterministic rule enforcement | Locks down a fixed workflow. Lacks the multi-brain strategic deliberation needed for creative/strategic work. |
| **Agent Team Orchestration** | AI Kit (17 specialized agents incl. 4 Researchers on different LLMs); The Cog (multi-model team IDE w/ MCP) | Multi-model workflows for productivity | General platform, not a decision-making protocol. No enforced audit trail tying decisions to causes. |
| **Academic / Conceptual** | Dimensional Governance; LOKA; OntoMotoOS | Theoretical frameworks for distributing authority across human-AI systems | Papers, not running code. Validate the problem; don't ship a solution. |

The single-sentence market story:

> **Point solutions exist for either better deliberation OR audit-locked workflow OR multi-agent productivity. SiXiS is the only system that bundles all three around a sovereign-led, self-improving execution loop.**

---

## 3. What SiXiS could adopt from the others (3 ideas, ranked by leverage)

The exploration chat proposed three specific imports. Recording them here because Tension Maps and Cross-Examination Rounds are explicitly **future SiXiS projects** (parked, not done). The Synthesis Judge (this project) is the third, now built.

### 3.1 Tension Maps — *parked, future project*

Origin: Swarm Discussion. Mechanism: a structured artifact attached to each cross-poll round that classifies the *kind* of disagreement (factual / definitional / strategic / value-based / phrasing-illusion) and tracks resolution across rounds. Substrate impact: a new `tension_map` event type (or schema field) carrying the classification.

Why high leverage: SiXiS currently logs that disagreement happened, but not the *shape* of disagreement. Tension Maps would turn the substrate from a timeline of events into a searchable map of how decisions stall.

### 3.2 Synthesis Judge — *built, this project*

Origin: CoReason MACO's "4th Judge" model. Mechanism: a separate non-voting model that audits convergence artifacts for hidden contradictions, unaddressed counter-arguments, premature consensus. The user's adaptation: use Gemini (their browser Pro account) as the Judge in the SiXiS council ratification flow.

Why high leverage: the orchestrator (Claude) currently both facilitates convergence AND writes synthesis — a structural blind spot. The Judge audits without voting. Built and shipped in Cycles 1+2; ratified design at Layer B.

### 3.3 Cross-Examination Rounds — *parked, future project*

Origin: Expert Panel Deliberation. Mechanism: pre-defined challenge questions each brain must answer about another's position before synthesis (vs. SiXiS's current freeform Round 2). Aligns with the Counter-Argument Architecture in the SiXiS Meta-Protocol.

Why moderate leverage: the current Round 2 cross-check is freeform. Templating it would force deeper adversarial pressure on Tier-3 decisions. Marked as Phase 2 work after the Judge proves itself.

---

## 4. Big-possibility framings (durable for external positioning)

The exploration chat surfaced seven possibility threads. Recording the four most durable here.

**(a) The Universal Project OS.** SiXiS as a substrate where every meaningful move is recorded, attributed, debated, and ratified — a single tool replacing Notion + Linear + Slack + multi-model AI chat for high-consequence work. Distinct from project management because it captures the *reasoning behind decisions*, not just task state.

**(b) Institutional Memory That Actually Learns.** The dense event log (frictions, drifts, overrides, ratifications) becomes a searchable institutional cortex over hundreds of projects. Reveals which decisions stall, which forced rules reduce breakdowns, which adversarial patterns produce best outcomes. Self-writing playbook.

**(c) Living Documents That Defend Themselves.** Legal contracts, safety cases, architectural decision records — currently static snapshots. With SiXiS they become living artifacts carrying their adversarial history. The answer to "why did we approve this?" is a replayable timeline, not a stale doc.

**(d) AI Alignment in the Wild.** SiXiS's primitives (sovereignty on irreversible decisions, no hidden agency, mandatory adversarial challenge, drift detection + auto-rollback) are alignment scaffolding for systems of humans + AIs, not just individual models. As autonomous agents get more capable, SiXiS could serve as a containment + collaboration framework — agency with inspectability and override at every step.

The single-sentence north star for product positioning:

> **SiXiS is the operating system for any team that cannot afford silent AI drift, hidden agency, or unexamined consensus.**

---

## 5. The recursive doom loop (the meta-most-exciting finding)

The exploration noticed something that deserves a paragraph of its own. The dashboard project (the tool being read) was built using the protocol that captures the protocol's breakdowns. The protocol generates the tool that observes the protocol.

> *More cycles → more breakdowns → better rules → fewer breakdowns → more ambitious projects → new classes of breakdown → deeper Meta-Protocol evolution.*

This is a self-tuning engine for high-consequence collaboration. The Gemini Judge built in this project audited the very convergence that ratified its own design (smoke test on poll 32eeb4da returned a clean null verdict). That moment is the loop in microcosm.

---

## 6. Use-when-positioning notes

When someone asks **"what is this?"**:
- Default answer: "Multi-brain adversarial decision framework with a human sovereign and immutable audit trail."
- If they need more: "Multiple AI models — Claude, GPT, DeepSeek, soon Gemini as auditor — debate every consequential decision under structured rules. The human ratifies. Everything is logged and queryable."
- If they want the punchline: "It's a governance OS for anyone who can't afford silent AI drift."

When someone asks **"how is this different from [X]?"**:
- For *agent orchestration tools* (AutoGPT, CrewAI, AI Kit): "Those run agents in parallel for productivity. SiXiS forces them to disagree under audit before any irreversible decision."
- For *AI debate tools* (ChatBotKit Adversarial Council): "Those are debate-as-a-service for one question. SiXiS is the substrate the debate runs inside, with persistent project memory and self-improving rules."
- For *workflow audit tools* (Castra, ADEPT): "Those enforce a fixed workflow. SiXiS deliberates on what the workflow should be."

When someone asks **"is this just generative AI improving?"**:
- "No. SiXiS is governance, not training. The models are stateless commodity; the *scaffolding* improves."

---

## Provenance

- Source chat: ChatGPT exploration session, subject "Go to dashboard.sixis.ai and read every page and link, especially the md."
- Captured into substrate as: `research_capture` event (ID logged in Cycle 4 ship event).
- Brief authored by: Claude (orchestrator, this Claude Code session).
- Authoritative for: SiXiS positioning, market-categorization questions, "what is this?" elevator-pitch responses, and informing future projects that touch external comms.
- Not authoritative for: technical architecture (use Layer B + protocol.md), product roadmap (use the active project list).
