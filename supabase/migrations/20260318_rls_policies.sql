-- ─── RLS Policies ────────────────────────────────────────────
-- RLS is already enabled on all tables (initial migration).
-- These policies define WHO can do WHAT.
--
-- Pattern:
--   • Authenticated users can READ data scoped to their portal
--   • All writes go through the service role (server actions),
--     which bypasses RLS — no INSERT/UPDATE policies needed
--   • The service role is also used for portal_users lookups
--     during auth, so those flows are unaffected by RLS
-- ─────────────────────────────────────────────────────────────

-- portal_users: users can read their own row
CREATE POLICY "Users can read own portal_users row"
  ON portal_users FOR SELECT
  TO authenticated
  USING (email = lower(auth.jwt() ->> 'email'));

-- portals: users can read portals they belong to
CREATE POLICY "Users can read their portal"
  ON portals FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT portal_id FROM portal_users
      WHERE email = lower(auth.jwt() ->> 'email')
    )
  );

-- ticket_cache: users can read cached tickets for their portal
CREATE POLICY "Users can read ticket cache for their portal"
  ON ticket_cache FOR SELECT
  TO authenticated
  USING (
    portal_id IN (
      SELECT portal_id FROM portal_users
      WHERE email = lower(auth.jwt() ->> 'email')
    )
  );

-- portal_request_types: users can read request types for their portal
CREATE POLICY "Users can read request types for their portal"
  ON portal_request_types FOR SELECT
  TO authenticated
  USING (
    portal_id IN (
      SELECT portal_id FROM portal_users
      WHERE email = lower(auth.jwt() ->> 'email')
    )
  );

-- magic_sessions: users can read and delete their own sessions
CREATE POLICY "Users can read own magic sessions"
  ON magic_sessions FOR SELECT
  TO authenticated
  USING (email = lower(auth.jwt() ->> 'email'));

CREATE POLICY "Users can delete own magic sessions"
  ON magic_sessions FOR DELETE
  TO authenticated
  USING (email = lower(auth.jwt() ->> 'email'));
