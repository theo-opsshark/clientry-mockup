// ─── Supabase table types ────────────────────────────────────

export interface Portal {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  jira_site_url: string;
  jira_service_desk_id: string;
  jira_api_token: string | null;
  jira_email: string | null;
  oauth_access_token: string | null;
  oauth_refresh_token: string | null;
  webhook_id: string | null;
  webhook_expires_at: string | null;
  created_at: string;
}

export interface PortalUser {
  id: string;
  portal_id: string;
  email: string;
  role: "user" | "manager" | "admin";
  jira_org_id: string | null;
  created_at: string;
}

export interface MagicSession {
  id: string;
  portal_id: string;
  email: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface TicketCacheEntry {
  id: string;
  portal_id: string;
  jira_key: string;
  data: Record<string, unknown>;
  cached_at: string;
}

export interface PortalRequestType {
  id: string;
  portal_id: string;
  jira_request_type_id: string;
  display_name: string | null;
  display_order: number;
  enabled: boolean;
}
