-- migration 001 — events spine
-- Canonical append-only command log. All state changes flow through here.
-- Append-only is a DB invariant via table grants, not a code convention.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

CREATE TYPE event_source AS ENUM (
  'claude',
  'gpt',
  'deepseek',
  'tommy',
  'system',
  'orchestrator_memory_backfill',
  'claude_browser_control'
);

-- event_type enum is created in migration 008 with the full type list ported
-- from the SQLite CHECK constraint. This migration declares the column with
-- a TEXT type that 008 will ALTER to event_type.
-- Doing it this way keeps 001 self-contained and lets 008 evolve the type
-- list independently of the spine schema.

CREATE TABLE events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id           UUID,
  round_id           UUID,
  project_id         UUID,
  rule_id            UUID,
  type               TEXT NOT NULL,
  source             event_source NOT NULL,
  actor_id           UUID,
  capability_id      UUID,
  payload            JSONB NOT NULL DEFAULT '{}'::jsonb,
  description        TEXT NOT NULL,
  caused_by_event_id UUID REFERENCES events(id),
  occurred_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FKs to other tables get added in migration 003 once those tables exist.
-- Self-FK (caused_by_event_id) declared above is fine.

CREATE INDEX idx_events_project_time ON events(project_id, occurred_at);
CREATE INDEX idx_events_type_time    ON events(type, occurred_at);
CREATE INDEX idx_events_cycle        ON events(cycle_id);
CREATE INDEX idx_events_round        ON events(round_id);
CREATE INDEX idx_events_caused_by    ON events(caused_by_event_id);
CREATE INDEX idx_events_payload_gin  ON events USING GIN (payload);
CREATE INDEX idx_events_actor        ON events(actor_id);

-- Append-only enforcement.
-- service_role is Supabase's default privileged key used by sixis.py.
-- It can INSERT and SELECT, but cannot UPDATE or DELETE.
-- Migration scripts that need to repair history use a separate role:
--
--   CREATE ROLE events_admin;
--   GRANT UPDATE, DELETE ON events TO events_admin;
--
-- and require explicit SET ROLE events_admin from a superuser session.

-- Supabase default privileges grant ALL on new tables to service_role and
-- authenticated. REVOKE ALL FROM PUBLIC alone is insufficient — we must
-- explicitly REVOKE UPDATE, DELETE, TRUNCATE from each named role to enforce
-- append-only as a database invariant.
REVOKE ALL ON events FROM PUBLIC;
REVOKE UPDATE, DELETE, TRUNCATE ON events FROM service_role;
REVOKE UPDATE, DELETE, TRUNCATE ON events FROM authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON events FROM anon;
GRANT SELECT, INSERT ON events TO service_role;
GRANT SELECT, INSERT ON events TO authenticated;

-- Defensive: a row-level policy denying UPDATE/DELETE even if grants are loosened.
-- ALTER TABLE events ENABLE ROW LEVEL SECURITY;  -- enabled in migration 007

COMMIT;
