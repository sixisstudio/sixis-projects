-- migration 004 — extra projection tables
-- rules, amendments, sessions, session_handoff_items, kernel/m_imperative
-- details, prompt_templates, amendment_rules, changes.

BEGIN;

CREATE TYPE rule_layer    AS ENUM ('universal', 'project');
CREATE TYPE rule_status   AS ENUM ('active', 'modified', 'removed', 'proposed', 'candidate_universal', 'universal');
CREATE TYPE rule_kind     AS ENUM ('kernel_principle', 'm_imperative', 'forced_rule', 'archetype_rule');

CREATE TABLE rules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name           TEXT NOT NULL,
  description         TEXT NOT NULL,
  layer               rule_layer NOT NULL,
  scope               TEXT,
  added_in_version    TEXT NOT NULL,
  source_event_id     UUID REFERENCES events(id),
  source_project_id   UUID REFERENCES projects(id),
  status              rule_status NOT NULL DEFAULT 'active',
  added_at            TIMESTAMPTZ NOT NULL,
  removed_at          TIMESTAMPTZ,
  notes               TEXT,
  effective_from      TIMESTAMPTZ,
  kind                rule_kind NOT NULL DEFAULT 'forced_rule',
  stable_id           TEXT,
  source_path         TEXT,
  source_version      TEXT,
  created_event_id    UUID REFERENCES events(id),
  last_event_id       UUID REFERENCES events(id),
  version             INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_rules_layer   ON rules(layer);
CREATE INDEX idx_rules_status  ON rules(status);
CREATE INDEX idx_rules_kind    ON rules(kind);
CREATE INDEX idx_rules_stable  ON rules(stable_id);
CREATE INDEX idx_rules_project ON rules(source_project_id);

-- Now backfill polls.forced_rule_id FK.
ALTER TABLE polls
  ADD CONSTRAINT polls_forced_rule_id_fkey
  FOREIGN KEY (forced_rule_id) REFERENCES rules(id);

ALTER TABLE events
  ADD CONSTRAINT events_rule_id_fkey
  FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE SET NULL;

CREATE TYPE amendment_status     AS ENUM ('proposed', 'ratified', 'rejected', 'superseded');
CREATE TYPE amendment_layer      AS ENUM ('universal', 'project');

CREATE TABLE amendments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_summary    TEXT NOT NULL,
  rationale           TEXT,
  proposed_at         TIMESTAMPTZ NOT NULL,
  proposed_by         TEXT NOT NULL,
  ratified_at         TIMESTAMPTZ,
  ratified_by         TEXT,
  status              amendment_status NOT NULL DEFAULT 'proposed',
  target_version      TEXT,
  target_layer        amendment_layer NOT NULL,
  target_project_id   UUID REFERENCES projects(id),
  source_event_id     UUID REFERENCES events(id),
  created_event_id    UUID REFERENCES events(id),
  last_event_id       UUID REFERENCES events(id),
  version             INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_amendments_status   ON amendments(status);
CREATE INDEX idx_amendments_target_v ON amendments(target_version);

CREATE TYPE amendment_change_type AS ENUM ('add', 'modify', 'remove');

CREATE TABLE amendment_rules (
  amendment_id  UUID NOT NULL REFERENCES amendments(id),
  rule_id       UUID NOT NULL REFERENCES rules(id),
  change_type   amendment_change_type NOT NULL,
  PRIMARY KEY (amendment_id, rule_id)
);

CREATE TABLE kernel_principle_details (
  rule_id     UUID PRIMARY KEY REFERENCES rules(id) ON DELETE CASCADE,
  k_number    TEXT NOT NULL,
  layer_text  TEXT,
  conditional BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE m_imperative_details (
  rule_id              UUID PRIMARY KEY REFERENCES rules(id) ON DELETE CASCADE,
  m_number             TEXT NOT NULL,
  short_label          TEXT,
  brain_role_applies   TEXT
);

CREATE TABLE prompt_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  version     INTEGER NOT NULL,
  content     TEXT NOT NULL,
  hash        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (name, version)
);

CREATE INDEX idx_prompt_templates_name   ON prompt_templates(name);
CREATE INDEX idx_prompt_templates_active ON prompt_templates(active);

CREATE TYPE session_status         AS ENUM ('active', 'closed', 'interrupted', 'superseded');
CREATE TYPE handoff_item_type      AS ENUM ('carry_forward', 'open_question', 'pending_work');
CREATE TYPE handoff_item_status    AS ENUM ('pending', 'resolved', 'superseded', 'abandoned');

CREATE TABLE sessions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at               TIMESTAMPTZ NOT NULL,
  ended_at                 TIMESTAMPTZ,
  last_heartbeat           TIMESTAMPTZ NOT NULL,
  status                   session_status NOT NULL DEFAULT 'active',
  "user"                   TEXT NOT NULL DEFAULT 'tommy',
  parent_session_id        UUID REFERENCES sessions(id),
  originating_project_id   UUID REFERENCES projects(id),
  scope_projects           JSONB,
  notes                    TEXT,
  created_event_id         UUID REFERENCES events(id),
  last_event_id            UUID REFERENCES events(id),
  version                  INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_sessions_status  ON sessions(status);
CREATE INDEX idx_sessions_user    ON sessions("user");
CREATE INDEX idx_sessions_started ON sessions(started_at);
CREATE INDEX idx_sessions_parent  ON sessions(parent_session_id);
CREATE UNIQUE INDEX idx_sessions_one_active_per_user
  ON sessions("user") WHERE ended_at IS NULL;

CREATE TABLE session_handoff_items (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_handoff_event_id   UUID NOT NULL REFERENCES events(id),
  type                       handoff_item_type NOT NULL,
  text                       TEXT NOT NULL,
  status                     handoff_item_status NOT NULL DEFAULT 'pending',
  resolved_in_session_id     UUID REFERENCES sessions(id),
  resolved_at                TIMESTAMPTZ,
  resolved_event_id          UUID REFERENCES events(id),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_handoff_items_handoff     ON session_handoff_items(session_handoff_event_id);
CREATE INDEX idx_handoff_items_status      ON session_handoff_items(status);
CREATE INDEX idx_handoff_items_resolved_in ON session_handoff_items(resolved_in_session_id);
CREATE INDEX idx_handoff_items_type        ON session_handoff_items(type);

CREATE TYPE change_type AS ENUM ('feature', 'fix', 'refactor', 'schema', 'ui', 'docs', 'mixed');

CREATE TABLE changes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version      TEXT,
  title        TEXT NOT NULL,
  description  TEXT,
  change_type  change_type NOT NULL DEFAULT 'mixed',
  git_sha      TEXT,
  changed_at   TIMESTAMPTZ NOT NULL,
  changed_by   TEXT NOT NULL DEFAULT 'orchestrator',
  project_id   UUID REFERENCES projects(id),
  metadata     JSONB
);

CREATE INDEX idx_changes_at      ON changes(changed_at);
CREATE INDEX idx_changes_version ON changes(version);
CREATE INDEX idx_changes_project ON changes(project_id);

REVOKE ALL ON
  rules, amendments, amendment_rules, kernel_principle_details,
  m_imperative_details, prompt_templates, sessions, session_handoff_items, changes
FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE ON
  rules, amendments, amendment_rules, kernel_principle_details,
  m_imperative_details, prompt_templates, sessions, session_handoff_items, changes
TO service_role;

GRANT SELECT ON
  rules, amendments, amendment_rules, kernel_principle_details,
  m_imperative_details, prompt_templates, sessions, session_handoff_items, changes
TO authenticated;

COMMIT;
