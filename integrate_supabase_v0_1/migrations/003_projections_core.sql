-- migration 003 — core projection tables
-- These are derived from the events stream by reducers. Direct writes
-- happen only via reducer functions; CLI and brain code never UPDATE these
-- tables directly post-cutover (during shadow, dual-write is the path).
--
-- Each projection carries: created_event_id, last_event_id, version.

BEGIN;

CREATE TYPE project_status   AS ENUM ('active', 'paused', 'shipped', 'abandoned');
CREATE TYPE cycle_outcome    AS ENUM ('shipped', 'stalled', 'abandoned', 'in_progress');
CREATE TYPE poll_tier        AS ENUM ('1', '2', '3');

CREATE TABLE projects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  description       TEXT,
  archetype         TEXT,
  owner             TEXT NOT NULL DEFAULT 'tommy',
  status            project_status NOT NULL DEFAULT 'active',
  started_at        TIMESTAMPTZ NOT NULL,
  ended_at          TIMESTAMPTZ,
  created_event_id  UUID REFERENCES events(id),
  last_event_id     UUID REFERENCES events(id),
  version           INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_projects_slug      ON projects(slug);
CREATE INDEX idx_projects_status    ON projects(status);
CREATE INDEX idx_projects_archetype ON projects(archetype);

-- Backfill FKs that referenced projects(id) without a real target.
ALTER TABLE project_memberships
  ADD CONSTRAINT project_memberships_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id);

ALTER TABLE events
  ADD CONSTRAINT events_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id);

CREATE TABLE cycles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID REFERENCES projects(id),
  intent            TEXT NOT NULL,
  archetype         TEXT NOT NULL,
  tier              SMALLINT NOT NULL CHECK (tier IN (1, 2, 3)),
  protocol_version  TEXT NOT NULL,
  started_at        TIMESTAMPTZ NOT NULL,
  ended_at          TIMESTAMPTZ,
  outcome           cycle_outcome,
  created_event_id  UUID REFERENCES events(id),
  last_event_id     UUID REFERENCES events(id),
  version           INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_cycles_project ON cycles(project_id);
CREATE INDEX idx_cycles_outcome ON cycles(outcome);

ALTER TABLE events
  ADD CONSTRAINT events_cycle_id_fkey
  FOREIGN KEY (cycle_id) REFERENCES cycles(id);

CREATE TABLE rounds (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id             UUID NOT NULL REFERENCES cycles(id),
  round_number         INTEGER NOT NULL,
  summary              TEXT,
  locked_artifact_ref  TEXT,
  converged_at         TIMESTAMPTZ,
  created_event_id     UUID REFERENCES events(id),
  last_event_id        UUID REFERENCES events(id),
  version              INTEGER NOT NULL DEFAULT 1,
  UNIQUE (cycle_id, round_number)
);

CREATE INDEX idx_rounds_cycle ON rounds(cycle_id);

ALTER TABLE events
  ADD CONSTRAINT events_round_id_fkey
  FOREIGN KEY (round_id) REFERENCES rounds(id);

CREATE TABLE polls (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id              UUID NOT NULL REFERENCES cycles(id),
  round_id              UUID REFERENCES rounds(id),
  question              TEXT NOT NULL,
  initiated_by          TEXT NOT NULL,
  initiated_at          TIMESTAMPTZ NOT NULL,
  initiated_event_id    UUID NOT NULL REFERENCES events(id),
  converged_at          TIMESTAMPTZ,
  converged_event_id    UUID REFERENCES events(id),
  convergence_summary   TEXT,
  round_2_triggered     BOOLEAN NOT NULL DEFAULT FALSE,
  forced_rule_id        UUID,                              -- FK added in 004 after rules
  reopens_poll_id       UUID REFERENCES polls(id),
  backfilled            BOOLEAN NOT NULL DEFAULT FALSE,
  tier                  SMALLINT NOT NULL DEFAULT 2 CHECK (tier IN (1, 2, 3)),
  created_event_id      UUID REFERENCES events(id),
  last_event_id         UUID REFERENCES events(id),
  version               INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_polls_cycle ON polls(cycle_id);
CREATE INDEX idx_polls_round ON polls(round_id);
CREATE INDEX idx_polls_tier  ON polls(tier);

REVOKE ALL ON projects, cycles, rounds, polls FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON projects, cycles, rounds, polls TO service_role;
GRANT SELECT ON projects, cycles, rounds, polls TO authenticated;

COMMIT;
