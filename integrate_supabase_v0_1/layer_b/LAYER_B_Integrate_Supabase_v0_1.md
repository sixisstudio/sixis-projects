# LAYER_B — Integrate Supabase v0.1

**Layer A:** SiXiS Protocol v1.0 at `~/Documents/Claude/Projects/SixiS/SiXiS_Protocol_v1.0md.md`
**Layer B status:** Draft, Tier 2 ratified by council convergence (Round 1 + Round 2, 2026-05-07)
**Sovereign:** Tommy
**Brains polled:** Claude (Orchestrator), GPT (Architect), Deepseek (Reviewer)
**Cross-poll IDs:** Round 1 `abc89ccf-391e-480b-b766-1f3fc769120d`, Round 2 `8cf24fbe-d81c-4a52-9065-7cc7eac01eb6`
**Project draft:** `2393b53b-3bbb-4782-994b-24a6bcd1cea8` · **Cycle:** `37245c60-914e-443b-bede-66a36fe09099` · **Project row:** `p_integrate_supabase`

---

## CONTEXT

**Frozen intent (Z1):**
> Migrate SiXiS substrate storage from local SQLite to a dedicated Supabase Postgres project, with Claude Code on Tommy's Mac as sole driver, redesigning the schema for the eventual autonomous-superbrain phase rather than lift-and-shift.

**Why now:** Architecture hygiene plus future-proofing. Not disaster recovery, not multi-device. The migration is the moment to convert sixis from informally event-sourced (events table coexists with mutation-shaped tables) to strictly event-sourced (events canonical, projections derived).

**Scope correction surfaced during Layer B research (2026-05-07):**
- `artifacts/substrate.db` is a 0-byte file, not a populated database. Original Z1 named two SQLite files; only one (`sixis_dashboard.db`) actually has data.
- The existing schema *already has an `events` table* with type/source/timestamp/metadata covering 50+ event types. School-A migration becomes "make events strictly canonical, rewrite mutation paths through reducers" — not "invent event sourcing from scratch."

---

## ROUND 1 + ROUND 2 CONVERGENCE (settled, do not relitigate)

### Architecture (Round 2)
- **Events table is the append-only command spine.** All state changes flow through events. `caused_by_event_id` chains preserve causality.
- **Current-state tables are synchronously-materialized projections.** Reducers/event-handlers update them in the same transaction as the event insert.
- **RLS enforced on projections** (hot read path). Events table can be append-heavy and query-optimized by project/time/type indexes; not the primary read surface.
- **Append-only is a DB invariant, not a code convention.** Events table grants: `INSERT` only for all roles, no `UPDATE`, no `DELETE` — even for service-role. Enforced at the database layer, not by sixis.py discipline.
- **Drift detection runs as a scheduled comparison job** during shadow mode (`reduce(events) → diff against actual projection → write drift_report rows`). Not via triggers — avoids two write paths inside the same transaction during validation. Triggers reserved for post-cutover real-time drift alarming if it becomes valuable.

### Operational (Round 1)
- **Sole-writer is temporal operational fact, not architectural foundation.** Schema must assume future multi-writer.
- **Pre-cutover 14-day shadow mode** with sixis.py running both backends (sqlite | supabase) and emitting both writes. Comparison job runs daily.
- **Synthetic two-writer concurrency harness** verifies reducer determinism: race two emitters on same projection key, run two parallel reducer instances against shared events, assert projection converges to identical state.
- **Actor / project / capability tables designed this cycle**, RLS designed but not enforced (Tommy's local Claude Code uses service-role and bypasses RLS).
- **Operational cost decision is a Z1 deliverable**: Supabase Pro tier ($25/mo) vs keep-alive pinger to prevent free-tier auto-pause. Decided in §10 below.
- **Post-cutover SQLite backup window 48h–7d**, finalized after shadow comparison results.
- **sixis.py refactor is the implementation long pole**, not the schema. Every existing verb (cycle-start, event-log, round-add, cross-poll, converge, log-brain-response, etc.) forks into emit-event + apply-projection.

---

## CLASSIFICATION

| Field | Value |
|---|---|
| `PROJECT_TYPE` | Migration (substrate storage, schema redesign) |
| `TIER` | 2 (council-ratified, reversible only inside post-cutover backup window) |
| `ARCHETYPE` | Migration with schema redesign |
| `SCOPE` | sixis_dashboard.db → Supabase Postgres. Schema redesign around five future-proofing pillars (multi-writer safety, append-only audit trail with versioned polls/rules, actor/RLS, cross-project queryability, Postgres-native types). Excludes: layer_b markdown (git canonical), `~/.claude/memory` (Claude Code feature), remote execution layer, multi-device usage. |

**Tier-3 auto-escalation triggers:**
1. RLS becomes enforced against any non-service-role actor mid-cycle (changes blast radius).
2. Cutover compressed below 14-day shadow without explicit ratification.
3. `events` table grant model loosened to allow `UPDATE` or `DELETE`.

---

## SOURCE SCHEMA INVENTORY (sixis_dashboard.db, 1.27MB)

Sixteen tables. Counts at draft time (2026-05-07):

| Table | Rows | Role |
|---|---|---|
| `events` | 363 | Already-event-sourced log of all state changes (50+ types) |
| `cycles` | 13 | Cycle-Zero-instantiated work units |
| `rounds` | 41 | Cross-polls within cycles |
| `polls` | 32 | Council deliberations (with convergence) |
| `rules` | 26 | Forced rules + Kernel principles + M-Imperatives unified |
| `projects` | 2 | Top-level project groupings |
| `sessions` | 2 | Chat session boundaries |
| `amendments` | 0 | Protocol amendment proposals (empty, schema scaffolded) |
| `session_handoff_items` | varies | Carry-forward / open-questions / pending-work |
| `kernel_principle_details` | small | K1-K7 rule extension |
| `m_imperative_details` | small | M-Imperative rule extension |
| `prompt_templates` | small | Versioned discovery/cross-poll prompt content |
| `capability_tokens` | varies | Sovereign delegation tokens |
| `amendment_rules` | small | Amendment ↔ rule join |
| `changes` | varies | Versioned change log |

**Observations:**
- `events` is already the de-facto spine. Every CROSS_POLL/CONVERGENCE/RULE_ACTIVATION/etc. emits an `events` row. The current write path is *both* row mutation (e.g., insert into `polls`) AND event log (insert into `events`). Migration converts row mutation into a derived effect of the event.
- `polls` carries `initiated_event_id` + `converged_event_id` FKs to `events` — already proves the event-as-source-of-truth pattern is viable in this schema.
- `cycles.outcome`, `projects.status`, `rules.status`, `amendments.status` are mutable state fields — these become the targets that reducers write, not direct UPDATE statements.

---

## TARGET SCHEMA (Postgres)

### 1. The Spine: `events` table (canonical, append-only)

```sql
CREATE TABLE events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id           UUID REFERENCES cycles(id),
  round_id           UUID REFERENCES rounds(id),
  project_id         UUID REFERENCES projects(id),
  rule_id            UUID REFERENCES rules(id) ON DELETE SET NULL,
  type               event_type NOT NULL,           -- enum, see below
  source             event_source NOT NULL,          -- enum: claude/gpt/deepseek/tommy/system/...
  actor_id           UUID REFERENCES actors(id),     -- new in this cycle
  capability_id      UUID REFERENCES capability_tokens(capability_id),
  payload            JSONB NOT NULL DEFAULT '{}'::jsonb,
  description        TEXT NOT NULL,
  caused_by_event_id UUID REFERENCES events(id),     -- causality chain
  occurred_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_project_time ON events(project_id, occurred_at);
CREATE INDEX idx_events_type_time    ON events(type, occurred_at);
CREATE INDEX idx_events_cycle        ON events(cycle_id);
CREATE INDEX idx_events_round        ON events(round_id);
CREATE INDEX idx_events_caused_by    ON events(caused_by_event_id);
CREATE INDEX idx_events_payload_gin  ON events USING GIN (payload);
```

**Event-type enum** ports all 50+ existing types from SQLite CHECK constraint. Postgres ENUM can be extended forward (`ALTER TYPE … ADD VALUE`) but never narrowed — matches append-only intent.

**Append-only enforcement (DB invariant, not convention):**
```sql
REVOKE UPDATE, DELETE ON events FROM PUBLIC;
REVOKE UPDATE, DELETE ON events FROM service_role;
GRANT INSERT, SELECT ON events TO service_role;
GRANT INSERT, SELECT ON events TO authenticated;
-- Migration scripts that need to repair history use a separate `events_admin` role
-- requiring explicit superuser SET ROLE.
```

### 2. Actor / Authorization Scaffold (new this cycle)

```sql
CREATE TABLE actors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          actor_kind NOT NULL,           -- enum: human, brain, agent, service
  identifier    TEXT NOT NULL,                 -- 'tommy' / 'claude' / 'gpt' / 'deepseek' / 'tommy_local_claude_code'
  display_name  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retired_at    TIMESTAMPTZ,
  UNIQUE (kind, identifier)
);

CREATE TABLE project_memberships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id),
  actor_id    UUID NOT NULL REFERENCES actors(id),
  role        membership_role NOT NULL,        -- enum: sovereign, contributor, observer
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ,
  UNIQUE (project_id, actor_id, role)
);

CREATE TABLE agent_capabilities (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID NOT NULL REFERENCES actors(id),
  capability   TEXT NOT NULL,                  -- 'emit_event', 'open_poll', 'ratify_amendment', etc.
  scope        JSONB NOT NULL DEFAULT '{}'::jsonb,
  granted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at   TIMESTAMPTZ
);
```

**Initial seed:** `tommy` (kind=human), `tommy_local_claude_code` (kind=service, identifier carries the bypass-marker), `claude` / `gpt` / `deepseek` (kind=brain).

**RLS designed but not enforced:** policies authored on projection tables for the future where non-service-role actors connect, but Tommy's local Claude Code uses service-role and bypasses RLS this cycle.

### 3. Projection Tables (current state)

One projection per source-schema table: `projects`, `cycles`, `rounds`, `polls`, `rules`, `amendments`, `sessions`, `session_handoff_items`, etc.

- All keep their existing column shape (modulo Postgres-native types: TEXT→UUID, INTEGER→BOOLEAN where appropriate, TIMESTAMP→TIMESTAMPTZ).
- All gain:
  - `created_event_id UUID REFERENCES events(id)` — event that materialized this row.
  - `last_event_id UUID REFERENCES events(id)` — most recent event that mutated it.
  - `version INTEGER NOT NULL DEFAULT 1` — bumped on every projection write.
- Writes happen only via reducer functions (PL/pgSQL or application-level), gated by service-role grants.

**Versioned polls/rules (pillar 2):** `polls` and `rules` projections additionally write to `polls_history` / `rules_history` tables on every state transition. The history tables are append-only with the same grant model as `events`.

### 4. Drift / Audit (non-canonical)

```sql
CREATE TABLE drift_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  table_name    TEXT NOT NULL,
  row_id        UUID NOT NULL,
  expected      JSONB,                         -- from reduce(events)
  actual        JSONB,                         -- from projection
  diff          JSONB,
  resolved_at   TIMESTAMPTZ,
  notes         TEXT
);
```

Populated by the scheduled comparison job (§9) during shadow mode and the first 7 days post-cutover. Not authoritative — informational only.

---

## ETL STRATEGY

For each source table, two questions: (a) is its history reconstructable from existing `events` rows? (b) what's the fallback if not?

| Source table | Reconstructable from existing events? | Strategy |
|---|---|---|
| `projects` | Partial (project_create events exist) | Direct projection insert from SQLite snapshot; backfill `project_create` events for any missing |
| `cycles` | No (no cycle_create event type currently) | Direct projection insert; emit synthetic `cycle_started` events with `backfilled=true` payload flag |
| `rounds` | No | Same pattern: direct insert + synthetic `round_opened` events |
| `polls` | Partial (cross_poll events exist for ~most polls) | Direct insert; backfill missing `cross_poll` events; sync via existing `sixis sync` command logic |
| `events` | N/A — IS the source | Direct INSERT into Postgres `events` (preserving original IDs as UUIDs derived from text IDs via `uuid5(NAMESPACE, sqlite_id)`) |
| `rules` | Partial (rule_added/modified/removed events exist) | Direct insert + backfill any missing rule events |
| `amendments` | Yes (amendment_proposed/ratified events) | Replay-based: derive projection from events |
| `sessions` | Partial | Direct insert + backfill `session_started` events |
| Others | N/A small | Direct projection insert |

**ID strategy:** SQLite uses TEXT primary keys. Postgres uses UUID. Map via `uuid5('sixis-substrate-v1', sqlite_id)` so the same SQLite ID always yields the same UUID — round-trip stable, idempotent re-runs safe.

**ETL script lives at:** `projects/integrate_supabase_v0_1/scripts/etl_sqlite_to_postgres.py`. Single command, idempotent, takes `--source-db` and `--target-dsn`.

---

## SIXIS.PY REFACTOR PLAN (the long pole)

**Step 1: Backend abstraction.**
Introduce `sixis.backends` module with `Backend` interface:
```python
class Backend(Protocol):
    def emit_event(self, event: Event) -> EventId: ...
    def apply_projection(self, table: str, row_id: UUID, mutation: dict) -> None: ...
    def query(self, sql: str, params: tuple) -> list[Row]: ...
    def transaction(self) -> ContextManager: ...
```
Two implementations: `SQLiteBackend` (current behavior) and `SupabaseBackend` (Postgres via psycopg/asyncpg).

**Step 2: Reducer registry.**
Each event type registers a reducer function: `event → projection mutations`. Reducers are pure given (event, current_projection_state) — no wall-clock dependence, no environment reads. This is the determinism property the two-writer harness verifies.

```python
@reducer('cross_poll')
def reduce_cross_poll(event: Event, ctx: ReducerContext) -> list[ProjectionMutation]:
    return [
        ProjectionMutation('polls', event.payload['poll_id'], {
            'cycle_id': event.cycle_id,
            'question': event.payload['question'],
            'initiated_event_id': event.id,
            'tier': event.payload.get('tier', 2),
            ...
        })
    ]
```

**Step 3: Verb migration.**
Every existing CLI verb that writes is rewritten:
- *Old:* `cycle-start` → INSERT into cycles + INSERT into events.
- *New:* `cycle-start` → emit_event(`cycle_started`, payload={...}) → reducer runs → projection updated atomically in same transaction.

The CLI surface stays identical. Internal write path forks.

**Step 4: Shadow-mode dual write.**
During the 14-day shadow window, `Backend` is wrapped in `DualWriteBackend(sqlite, supabase)` that emits to both, returns the SQLite result, logs Supabase errors but never blocks. Read path stays SQLite during shadow. The drift comparison job (next section) runs daily.

**Step 5: Cutover.**
Backend switched to `SupabaseBackend` only. SQLite file frozen, file-permission'd to read-only. Backup window starts.

---

## VALIDATION HARNESS

### Drift comparison job
Scheduled Python script: `projects/integrate_supabase_v0_1/scripts/drift_check.py`. Runs daily during shadow + first 7 days post-cutover.

For each projection table:
1. Read all rows.
2. For each row, replay events (`SELECT * FROM events WHERE projection_target = X ORDER BY occurred_at`) through the reducer.
3. Compute expected projection state.
4. Diff against actual projection.
5. Insert into `drift_reports` for any mismatch.

If `drift_reports` accumulates non-zero rows during shadow, cutover is blocked until root cause is logged + fixed.

### Two-writer reducer-determinism harness
Script: `projects/integrate_supabase_v0_1/scripts/two_writer_test.py`. Runs once before cutover, then in CI for any reducer change.

1. Generate synthetic event stream (1000 events, deterministic seed).
2. Spawn two emitter processes racing inserts onto the same projection keys.
3. Spawn two reducer processes consuming events independently.
4. Assert: final projection state from process A === final projection state from process B === replay-from-scratch result.

Failure surfaces non-determinism in reducers (wall-clock reads, environment dependence, race conditions) — schema choice doesn't save us if reducers are non-pure.

---

## OPERATIONAL DECISIONS

### Supabase Pro vs keep-alive pinger

**Decision: keep-alive pinger** during the first 60 days post-cutover; revisit Pro tier if usage stabilizes higher than free-tier ceilings.

**Rationale:** Tommy's usage is episodic. Free tier's 7-day inactivity auto-pause is the only practical concern. A pinger costs $0 and is reversible. Pro tier ($25/mo) is justified by the auto-pause issue alone, but only if usage outgrows free-tier limits (500MB DB, 2GB egress/mo) within the first 60 days. Let observed data drive the upgrade, not a guess.

**Pinger spec:** GitHub Action `cron: 0 */6 * * *` (every 6h) executes `SELECT 1` against the Supabase DB. Cheaper than even a `curl` to the dashboard URL; survives Tommy's vacations.

### Database location & connection strings
- **Supabase project:** dedicated to SiXiS (confirmed during discovery, not shared with TowMarX).
- **Pooled connection:** use Supabase Transaction pooler (`aws-1-...`) host, not direct connection — matches TowMarX pattern (memory: `reference_towmarx_db_urls.md`).
- **DSN env var:** `SIXIS_DATABASE_URL`, set in `~/.claude/settings.json` env or shell rc. Not committed.

---

## CUTOVER RUNBOOK

**Day 0–14 (Shadow):**
1. Apply migrations 001–008 to Supabase (events, projections, actors, RLS scaffold, grants).
2. Run ETL script (`etl_sqlite_to_postgres.py`) — initial backfill from SQLite snapshot.
3. Switch sixis.py to `DualWriteBackend`. SQLite remains read.
4. Daily: run `drift_check.py`. Inspect `drift_reports`. Zero rows = green.
5. Day 14: run `two_writer_test.py`. Must pass before cutover.

**Day 14 (Cutover, ~30 min window):**
1. Final SQLite snapshot to `sixis_dashboard.db.frozen-YYYY-MM-DD`.
2. Run final ETL re-sync (delta from last shadow comparison).
3. Run `drift_check.py` once. Zero drift required to proceed.
4. Switch sixis.py to `SupabaseBackend` only.
5. `chmod 444` on the frozen .db files.
6. Smoke test: open new chat, run `session-start`, confirm Supabase write + projection.

**Day 14–21 (Backup window, configurable to Day 14–48h):**
- SQLite frozen file remains. `drift_check.py` continues daily.
- If anomaly detected: rollback option remains by switching backend env var. Test rollback once on Day 17 against a throwaway snapshot.

**Day 21 (or 14+48h):**
- Archive frozen SQLite to `~/Documents/Claude/Projects/SixiS/archive/sixis_dashboard.db.snapshot-YYYY-MM-DD`.
- Remove from working tree.
- Final substrate event: `migration_completed`.

---

## Z1 DELIVERABLES CHECKLIST

- [ ] `migrations/001_events_spine.sql` — events table + grants
- [ ] `migrations/002_actors_and_capabilities.sql` — actor/membership/capability scaffold
- [ ] `migrations/003_projections_core.sql` — projects, cycles, rounds, polls, rules projections
- [ ] `migrations/004_projections_extra.sql` — sessions, session_handoff_items, amendments, etc.
- [ ] `migrations/005_history_tables.sql` — polls_history, rules_history (versioned audit)
- [ ] `migrations/006_drift_reports.sql` — drift_reports table
- [ ] `migrations/007_rls_policies.sql` — RLS designed, not enforced this cycle
- [ ] `migrations/008_event_type_enum.sql` — port the 50+ event types
- [ ] `scripts/etl_sqlite_to_postgres.py` — idempotent backfill
- [ ] `scripts/drift_check.py` — scheduled comparison job
- [ ] `scripts/two_writer_test.py` — determinism harness
- [ ] `scripts/keep_alive_pinger.yml` — GitHub Action
- [ ] `sixis/backends/__init__.py` + `sqlite.py` + `supabase.py` — backend abstraction
- [ ] `sixis/reducers/` — one file per event-type group, registry
- [ ] `sixis/dual_write.py` — shadow-mode wrapper
- [ ] CLI verb migration: each existing `sixis.py` verb rewritten to emit-event + reducer path
- [ ] Operational: `SIXIS_DATABASE_URL` documented, pinger deployed, Pro-tier-decision date set (Day +60)
- [ ] Cutover runbook executed, archive completed, `migration_completed` event logged

---

## OPEN QUESTIONS / KNOWN UNKNOWNS

1. **Reducer language:** Pure-Python (in sixis.py) or PL/pgSQL (in Postgres)? Python is easier to test and review; PL/pgSQL is in-transaction with no app round-trip. Lean Python for Cycle 1, revisit if performance bites — episodic single-writer makes round-trip cost negligible now.

2. **Event-type extension policy:** When a new event type is needed (e.g., a future amendment introduces one), the migration is `ALTER TYPE event_type ADD VALUE 'foo'`. This is non-transactional in Postgres ≤14 (transactional in 15+). Document the workflow.

3. **Backfill of pre-events history:** The 363 existing events in SQLite have `timestamp` but no `caused_by_event_id` chains. Post-migration these are leaf events with NULL causality. Acceptable. Future events get full chains.

4. **Layer-A coupling:** if SiXiS Protocol amends to require a new tracked field on events (e.g., a sovereignty marker), how does that propagate? Schema migration → enum extension → reducer update. Sequence is determined by FORCED_RULE_PO_10 (rule changes require preceding amendment_ratified event). Verify.

5. **TowMarX cross-project queries:** The Z1 specifies dedicated SiXiS Supabase project (not shared with TowMarX). Cross-project analytical queries that span SiXiS and TowMarX are out of scope for v0.1 — they'd require either federation or a read-replica unification project.

---

**End Layer B v0.1 draft. Implementation begins with migrations/001 + backend abstraction skeleton.**
