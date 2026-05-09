-- migration 006 — drift_reports
-- Populated by the scheduled comparison job (scripts/drift_check.py) during
-- shadow mode and the post-cutover backup window. Non-canonical: this table
-- is informational, never drives behavior automatically.
--
-- A non-zero unresolved drift count blocks cutover (Day 14 gate).

BEGIN;

CREATE TYPE drift_severity AS ENUM ('info', 'warning', 'critical');

CREATE TABLE drift_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  table_name    TEXT NOT NULL,
  row_id        UUID NOT NULL,
  severity      drift_severity NOT NULL DEFAULT 'warning',
  expected      JSONB,
  actual        JSONB,
  diff          JSONB,
  resolved_at   TIMESTAMPTZ,
  resolved_by   TEXT,
  notes         TEXT
);

CREATE INDEX idx_drift_reports_table     ON drift_reports(table_name);
CREATE INDEX idx_drift_reports_generated ON drift_reports(generated_at);
CREATE INDEX idx_drift_reports_unresolved
  ON drift_reports(generated_at) WHERE resolved_at IS NULL;
CREATE INDEX idx_drift_reports_severity  ON drift_reports(severity);

REVOKE ALL ON drift_reports FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON drift_reports TO service_role;
GRANT SELECT ON drift_reports TO authenticated;

COMMIT;
