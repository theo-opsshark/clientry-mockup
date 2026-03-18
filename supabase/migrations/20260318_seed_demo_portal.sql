-- Seed the demo portal with Jira config.
-- This uses the existing portal ID from the initial Supabase setup.
-- Jira credentials should be set via UPDATE after deployment (not committed to git).
--
-- The portal_users table already has entries pointing to this portal ID.
-- This migration ensures the portals row exists with proper structure.

INSERT INTO portals (id, name, slug, jira_site_url, jira_service_desk_id, primary_color)
VALUES (
  'f103d4df-4e83-4cf9-b3aa-bd5481834c0c',
  'Acme Corp',
  'acme-corp',
  'https://demostudio.atlassian.net',
  '7',
  '#06b6d4'
)
ON CONFLICT (id) DO UPDATE SET
  jira_site_url = EXCLUDED.jira_site_url,
  jira_service_desk_id = EXCLUDED.jira_service_desk_id;

-- NOTE: jira_email and jira_api_token are NOT set here.
-- They contain secrets and must be configured directly in Supabase:
--
--   UPDATE portals SET
--     jira_email = 'your-email@domain.com',
--     jira_api_token = 'your-api-token'
--   WHERE id = 'f103d4df-4e83-4cf9-b3aa-bd5481834c0c';
