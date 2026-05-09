-- migration 005 — versioned history tables (pillar 2: append-only audit)
-- polls and rules are the high-value entities whose state transitions need
-- to be reconstructable. polls_history and rules_history capture the row
-- snapshot on every projection write. Same grant model as events: append-only.
--
-- Other projections (projects, cycles, etc.) have their full history
-- reconstructable from events alone, so they don't get history tables.
-- This is a deliberate choice to keep storage costs proportional to value.

BEGIN;

CREATE TABLE polls_history (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id               UUID NOT NULL REFERENCES polls(id),
  version               INTEGER NOT NULL,
  cycle_id              UUID REFERENCES cycles(id),
  round_id              UUID REFERENCES rounds(id),
  question              TEXT NOT NULL,
  initiated_by          TEXT NOT NULL,
  initiated_at          TIMESTAMPTZ NOT NULL,
  initiated_event_id    UUID NOT NULL REFERENCES events(id),
  converged_at          TIMESTAMPTZ,
  converged_event_id    UUID REFERENCES events(id),
  convergence_summary   TEXT,
  round_2_triggered     BOOLEAN NOT NULL,
  forced_rule_id        UUID REFERENCES rules(id),
  reopens_poll_id       UUID REFERENCES polls(id),
  backfilled            BOOLEAN NOT NULL,
  tier                  SMALLINT NOT NULL,
  recorded_event_id     UUID NOT NULL REFERENCES events(id),
  recorded_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (poll_id, version)
);

CREATE INDEX idx_polls_history_poll       ON polls_history(poll_id);
CREATE INDEX idx_polls_history_recorded   ON polls_history(recorded_at);

CREATE TABLE rules_history (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id             UUID NOT NULL REFERENCES rules(id),
  version             INTEGER NOT NULL,
  rule_name           TEXT NOT NULL,
  description         TEXT NOT NULL,
  layer               rule_layer NOT NULL,
  scope               TEXT,
  added_in_version    TEXT NOT NULL,
  source_event_id     UUID REFERENCES events(id),
  source_project_id   UUID REFERENCES projects(id),
  status              rule_status NOT NULL,
  added_at            TIMESTAMPTZ NOT NULL,
  removed_at          TIMESTAMPTZ,
  notes               TEXT,
  effective_from      TIMESTAMPTZ,
  kind                rule_kind NOT NULL,
  stable_id           TEXT,
  source_path         TEXT,
  source_version      TEXT,
  recorded_event_id   UUID NOT NULL REFERENCES events(id),
  recorded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rule_id, version)
);

CREATE INDEX idx_rules_history_rule     ON rules_history(rule_id);
CREATE INDEX idx_rules_history_recorded ON rules_history(recorded_at);

REVOKE ALL ON polls_history, rules_history FROM PUBLIC;
REVOKE UPDATE, DELETE, TRUNCATE ON polls_history, rules_history FROM service_role;
REVOKE UPDATE, DELETE, TRUNCATE ON polls_history, rules_history FROM authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON polls_history, rules_history FROM anon;
GRANT SELECT, INSERT ON polls_history, rules_history TO service_role;
GRANT SELECT ON polls_history, rules_history TO authenticated;

COMMIT;
