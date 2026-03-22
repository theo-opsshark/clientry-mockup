-- Forge integration columns for portals
-- Portals with forge_cloud_id set use the Forge webtrigger for Jira API calls
-- instead of direct service account tokens.

ALTER TABLE portals ADD COLUMN forge_cloud_id text UNIQUE;
ALTER TABLE portals ADD COLUMN forge_webtrigger_url text;
ALTER TABLE portals ADD COLUMN forge_webhook_secret text;
ALTER TABLE portals ADD COLUMN forge_installed_at timestamptz;

-- Make Jira credential columns nullable (Forge portals don't need them)
ALTER TABLE portals ALTER COLUMN jira_site_url DROP NOT NULL;
ALTER TABLE portals ALTER COLUMN jira_service_desk_id DROP NOT NULL;
