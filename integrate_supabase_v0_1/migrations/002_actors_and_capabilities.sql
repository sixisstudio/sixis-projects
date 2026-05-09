-- migration 002 — actor / capability scaffold
-- Designed this cycle, not enforced this cycle. Tommy's local Claude Code
-- uses service-role and bypasses RLS. Schema exists so future non-service-role
-- actors (other agents, dashboards, browser sessions) plug in without retrofit.

BEGIN;

CREATE TYPE actor_kind AS ENUM (
  'human',
  'brain',
  'agent',
  'service'
);

CREATE TYPE membership_role AS ENUM (
  'sovereign',
  'contributor',
  'observer'
);

CREATE TABLE actors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          actor_kind NOT NULL,
  identifier    TEXT NOT NULL,
  display_name  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retired_at    TIMESTAMPTZ,
  UNIQUE (kind, identifier)
);

CREATE INDEX idx_actors_identifier ON actors(identifier);
CREATE INDEX idx_actors_kind       ON actors(kind);

CREATE TABLE project_memberships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL,
  actor_id    UUID NOT NULL REFERENCES actors(id),
  role        membership_role NOT NULL,
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ,
  UNIQUE (project_id, actor_id, role)
);
-- project_id FK to projects added in migration 003.

CREATE INDEX idx_project_memberships_project ON project_memberships(project_id);
CREATE INDEX idx_project_memberships_actor   ON project_memberships(actor_id);

CREATE TABLE agent_capabilities (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID NOT NULL REFERENCES actors(id),
  capability   TEXT NOT NULL,
  scope        JSONB NOT NULL DEFAULT '{}'::jsonb,
  granted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at   TIMESTAMPTZ
);

CREATE INDEX idx_agent_capabilities_actor      ON agent_capabilities(actor_id);
CREATE INDEX idx_agent_capabilities_capability ON agent_capabilities(capability);

-- capability_tokens — port of existing SQLite table for sovereign delegation.
CREATE TABLE capability_tokens (
  capability_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capability_id_hash   TEXT NOT NULL,
  sovereign            TEXT NOT NULL DEFAULT 'tommy',
  scope_permissions    JSONB NOT NULL,
  scope_description    TEXT,
  protocol_version_ref TEXT NOT NULL DEFAULT 'SiXiS_Protocol_v1.0',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at         TIMESTAMPTZ,
  expires_at           TIMESTAMPTZ NOT NULL,
  revoked_at           TIMESTAMPTZ,
  revocation_reason    TEXT,
  delegation_event_id  UUID REFERENCES events(id),
  revocation_event_id  UUID REFERENCES events(id)
);

CREATE INDEX idx_capability_tokens_revoked ON capability_tokens(revoked_at);
CREATE INDEX idx_capability_tokens_expires ON capability_tokens(expires_at);

-- Backfill events.capability_id FK now that the table exists.
ALTER TABLE events
  ADD CONSTRAINT events_capability_id_fkey
  FOREIGN KEY (capability_id) REFERENCES capability_tokens(capability_id);

ALTER TABLE events
  ADD CONSTRAINT events_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES actors(id);

-- Seed actors (idempotent via unique kind+identifier).
INSERT INTO actors (kind, identifier, display_name) VALUES
  ('human',   'tommy',                     'Tommy Ho'),
  ('brain',   'claude',                    'Claude (Orchestrator)'),
  ('brain',   'gpt',                       'GPT (Architect)'),
  ('brain',   'deepseek',                  'Deepseek (Reviewer)'),
  ('service', 'tommy_local_claude_code',   'Claude Code on Tommy''s Mac'),
  ('service', 'system',                    'SiXiS System')
ON CONFLICT (kind, identifier) DO NOTHING;

REVOKE ALL ON actors, project_memberships, agent_capabilities, capability_tokens FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON actors, project_memberships, agent_capabilities, capability_tokens TO service_role;
GRANT SELECT ON actors, project_memberships, agent_capabilities, capability_tokens TO authenticated;

COMMIT;
