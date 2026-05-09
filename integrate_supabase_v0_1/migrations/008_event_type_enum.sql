-- migration 008 — convert events.type from TEXT to event_type ENUM
-- Ports the 50+ event types from the SQLite CHECK constraint to a Postgres
-- enum. Future event types are added with `ALTER TYPE event_type ADD VALUE`.
--
-- ALTER TYPE ... ADD VALUE is non-transactional in Postgres ≤14 (transactional
-- in 15+). When extending the type, run the ALTER TYPE in its own statement,
-- then update reducer code.

BEGIN;

CREATE TYPE event_type AS ENUM (
  -- legacy core
  'friction',
  'rule_activation',
  'disagreement',
  'adoption',
  'override',
  'drift',
  'rollback',
  'redundancy_flag',
  'breakdown',
  'idea',
  'project_create',

  -- council deliberation
  'cross_poll',
  'convergence',
  'round_2_cross_check',
  'brain_position',
  'brain_response_logged',

  -- rules and amendments
  'rule_added',
  'rule_modified',
  'rule_removed',
  'amendment_proposed',
  'amendment_ratified',
  'amendment_applied_to_rules',

  -- versioning and migrations
  'version_bumped',
  'schema_migration',
  'change_published',

  -- project lifecycle
  'project_draft_started',
  'draft_saved',
  'draft_abandoned',
  'resumed_from_draft',
  'draft_promoted_to_project',
  'wizard_step_completed',
  'discovery_prompt_generated',
  'discovery_answer_logged',
  'discovery_synthesis_logged',
  'ui_launch_event',

  -- migration 015 — sovereign delegation primitives
  'sovereign_delegation_started',
  'sovereign_delegation_revoked',
  'browser_action',

  -- migration 017 — session handoff + cross-project provenance
  'session_started',
  'session_handoff',
  'session_abnormal_end',
  'cross_project_discovery',
  'carry_forward_created',
  'open_question_raised',
  'pending_work_logged',
  'item_resolved'
);

ALTER TABLE events
  ALTER COLUMN type TYPE event_type
  USING type::event_type;

COMMIT;
