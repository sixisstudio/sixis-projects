-- migration 007 — RLS policies (DESIGNED, NOT ENFORCED THIS CYCLE)
--
-- Tommy's local Claude Code uses service_role and bypasses RLS by design.
-- These policies exist so future non-service-role actors (other agents,
-- dashboards, browser sessions, the autonomous-superbrain phase) connect
-- under the right authorization model without retrofit.
--
-- Verified-not-enforced means: policies are written, RLS is enabled, but
-- the only role that connects this cycle is service_role which bypasses.
-- The first time a non-service-role actor connects, these policies are
-- exercised. Treat that day as a Tier-3 escalation event.

BEGIN;

-- Enable RLS on all projection tables. service_role bypasses by Supabase default.
ALTER TABLE events                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects                ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE amendments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE actors                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_memberships     ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_capabilities      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions                ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_handoff_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls_history           ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules_history           ENABLE ROW LEVEL SECURITY;
ALTER TABLE drift_reports           ENABLE ROW LEVEL SECURITY;

-- Helper: derive actor_id from JWT 'sub' claim. Convention: the JWT's
-- 'sub' is an actor identifier (e.g. 'claude', 'gpt') and the policy
-- looks up actors.id where identifier = sub.
--
-- For the autonomous-superbrain phase, agents will connect with their
-- own JWTs minted by Supabase Auth or a delegation token exchange.

CREATE OR REPLACE FUNCTION current_actor_id() RETURNS UUID
LANGUAGE sql STABLE AS $$
  SELECT id FROM actors
  WHERE identifier = COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    NULLIF(current_setting('jwt.claims.sub', true), '')
  )
  LIMIT 1
$$;

-- Read policies: an actor sees rows for projects they're a member of.
-- Universal-layer entities (rules with layer='universal', amendments with
-- target_layer='universal') are visible to all authenticated.

CREATE POLICY events_read ON events FOR SELECT TO authenticated
USING (
  project_id IN (
    SELECT project_id FROM project_memberships
    WHERE actor_id = current_actor_id() AND revoked_at IS NULL
  )
  OR project_id IS NULL
);

CREATE POLICY projects_read ON projects FOR SELECT TO authenticated
USING (
  id IN (
    SELECT project_id FROM project_memberships
    WHERE actor_id = current_actor_id() AND revoked_at IS NULL
  )
);

CREATE POLICY cycles_read ON cycles FOR SELECT TO authenticated
USING (
  project_id IN (
    SELECT project_id FROM project_memberships
    WHERE actor_id = current_actor_id() AND revoked_at IS NULL
  )
);

CREATE POLICY polls_read ON polls FOR SELECT TO authenticated
USING (
  cycle_id IN (
    SELECT id FROM cycles WHERE project_id IN (
      SELECT project_id FROM project_memberships
      WHERE actor_id = current_actor_id() AND revoked_at IS NULL
    )
  )
);

CREATE POLICY rules_read ON rules FOR SELECT TO authenticated
USING (
  layer = 'universal'
  OR source_project_id IN (
    SELECT project_id FROM project_memberships
    WHERE actor_id = current_actor_id() AND revoked_at IS NULL
  )
);

CREATE POLICY amendments_read ON amendments FOR SELECT TO authenticated
USING (
  target_layer = 'universal'
  OR target_project_id IN (
    SELECT project_id FROM project_memberships
    WHERE actor_id = current_actor_id() AND revoked_at IS NULL
  )
);

-- Actors and capabilities: an actor sees its own rows + the actors
-- it shares projects with.
CREATE POLICY actors_read_self_and_co ON actors FOR SELECT TO authenticated
USING (
  id = current_actor_id()
  OR id IN (
    SELECT pm.actor_id FROM project_memberships pm
    WHERE pm.project_id IN (
      SELECT project_id FROM project_memberships
      WHERE actor_id = current_actor_id() AND revoked_at IS NULL
    )
  )
);

CREATE POLICY agent_capabilities_read_self ON agent_capabilities FOR SELECT TO authenticated
USING (actor_id = current_actor_id());

CREATE POLICY project_memberships_read_self ON project_memberships FOR SELECT TO authenticated
USING (actor_id = current_actor_id());

-- Write policies: explicit denials at this layer. Mutations go through
-- the reducer service-role path. If a policy hole appears, default-deny.
CREATE POLICY events_write_via_capability ON events FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM agent_capabilities
    WHERE actor_id = current_actor_id()
      AND capability = 'emit_event'
      AND revoked_at IS NULL
  )
  AND actor_id = current_actor_id()
);

-- Sessions: an actor sees its own sessions only.
CREATE POLICY sessions_read_self ON sessions FOR SELECT TO authenticated
USING ("user" = (
  SELECT identifier FROM actors WHERE id = current_actor_id()
));

-- Drift reports: visible to all authenticated actors with project membership;
-- writes happen from service-role only.
CREATE POLICY drift_reports_read ON drift_reports FOR SELECT TO authenticated
USING (TRUE);

-- History tables: read-only for authenticated, writes from service-role only.
CREATE POLICY polls_history_read ON polls_history FOR SELECT TO authenticated
USING (
  poll_id IN (
    SELECT id FROM polls
  )
);

CREATE POLICY rules_history_read ON rules_history FOR SELECT TO authenticated
USING (TRUE);

COMMIT;
