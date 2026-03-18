import { createClient } from "@supabase/supabase-js";
import type { JiraConfig } from "./jira";

/**
 * In-memory cache for portal Jira configs.
 * Keyed by portalId — configs rarely change, so we cache for the
 * process lifetime. Restarting the server clears the cache.
 */
const configCache = new Map<string, JiraConfig>();

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Get Jira config for a portal.
 *
 * When portalId is provided: loads from Supabase `portals` table.
 * When portalId is null/undefined (pre-auth dev mode): falls back to env vars.
 */
export async function getJiraConfig(
  portalId?: string | null
): Promise<JiraConfig> {
  // ─── Env-var fallback for pre-auth dev mode ───
  if (!portalId) {
    return getJiraConfigFromEnv();
  }

  // ─── Check cache ───
  const cached = configCache.get(portalId);
  if (cached) return cached;

  // ─── Load from Supabase ───
  const supabase = getServiceClient();
  const { data: portal, error } = await supabase
    .from("portals")
    .select("jira_site_url, jira_email, jira_api_token, jira_service_desk_id")
    .eq("id", portalId)
    .single();

  if (error || !portal) {
    throw new Error(`Portal not found: ${portalId}`);
  }

  if (
    !portal.jira_site_url ||
    !portal.jira_email ||
    !portal.jira_api_token ||
    !portal.jira_service_desk_id
  ) {
    throw new Error(
      `Portal ${portalId} is missing Jira credentials. Configure them in the portals table.`
    );
  }

  const config: JiraConfig = {
    baseUrl: portal.jira_site_url,
    email: portal.jira_email,
    apiToken: portal.jira_api_token,
    serviceDeskId: portal.jira_service_desk_id,
  };

  configCache.set(portalId, config);
  return config;
}

/**
 * Fallback: read Jira config from environment variables.
 * Used when AUTH_ENABLED=false (no authenticated user = no portalId).
 */
function getJiraConfigFromEnv(): JiraConfig {
  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;
  const serviceDeskId = process.env.JIRA_SERVICE_DESK_ID;

  if (!baseUrl || !email || !apiToken || !serviceDeskId) {
    throw new Error(
      "No portalId provided and JIRA_* env vars are missing. Either authenticate or set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_SERVICE_DESK_ID."
    );
  }

  return { baseUrl, email, apiToken, serviceDeskId };
}
