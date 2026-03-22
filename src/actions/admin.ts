"use server";

import { createClient } from "@supabase/supabase-js";
import { getCurrentUser } from "./auth";
import { getJiraConfig } from "@/lib/config";
import {
  getRequestTypes as getRequestTypesDirect,
  getOrganizations as getOrganizationsDirect,
  type RequestType,
} from "@/lib/jira";
import {
  getRequestTypes,
  getOrganizations,
} from "@/lib/jira-backend";

// ─── Helpers ─────────────────────────────────────────────────

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function requireAdmin(): Promise<{
  email: string;
  portalId: string;
  role: "admin";
}> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized: admin role required");
  }
  return { email: user.email, portalId: user.portalId, role: "admin" };
}

function getEncryptionKey(): string {
  const key = process.env.PORTAL_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("PORTAL_ENCRYPTION_KEY env var is required for token encryption");
  }
  return key;
}

// ─── Cache invalidation ─────────────────────────────────────

// Import the caches we need to clear after admin changes.
// These are module-level Maps that cache portal data.
// We clear them by importing and calling delete/clear.

/** Clear the JiraConfig cache for a portal (forces re-fetch from DB) */
async function clearConfigCache(portalId: string): Promise<void> {
  // Dynamic import to avoid circular dependency
  const { clearJiraConfigCache } = await import("@/lib/config");
  clearJiraConfigCache(portalId);
}

/** Clear the portal branding data cache */
async function clearPortalDataCache(portalId: string): Promise<void> {
  const { clearPortalDataCache: clearCache } = await import("./portal");
  clearCache(portalId);
}

// ─── Jira Connection ─────────────────────────────────────────

export interface JiraConnectionStatus {
  connected: boolean;
  siteUrl: string | null;
  email: string | null;
  serviceDeskId: string | null;
  hasToken: boolean;
}

/**
 * Get the current Jira connection status (without exposing the token).
 */
export async function getJiraConnectionStatus(): Promise<JiraConnectionStatus> {
  const { portalId } = await requireAdmin();
  const supabase = getServiceClient();

  const { data: portal } = await supabase
    .from("portals")
    .select("jira_site_url, jira_email, jira_api_token, jira_service_desk_id")
    .eq("id", portalId)
    .single();

  if (!portal) {
    return { connected: false, siteUrl: null, email: null, serviceDeskId: null, hasToken: false };
  }

  return {
    connected: !!(portal.jira_site_url && portal.jira_email && portal.jira_api_token && portal.jira_service_desk_id),
    siteUrl: portal.jira_site_url,
    email: portal.jira_email,
    serviceDeskId: portal.jira_service_desk_id,
    hasToken: !!portal.jira_api_token,
  };
}

/**
 * Test a Jira connection without saving. Returns success or error message.
 */
export async function testJiraConnection(
  siteUrl: string,
  email: string,
  apiToken: string
): Promise<{ success: boolean; error?: string; serviceDeskCount?: number }> {
  await requireAdmin();

  try {
    const { getAuthHeaders, isServiceAccount, getApiBase } = await import("@/lib/jira");
    const config = { baseUrl: siteUrl.replace(/\/$/, ""), email, apiToken, serviceDeskId: "" };
    const headers = getAuthHeaders(config);
    const base = isServiceAccount(config)
      ? await getApiBase(config)
      : siteUrl.replace(/\/$/, "");

    const res = await fetch(
      `${base}/rest/servicedeskapi/servicedesk`,
      { headers, cache: "no-store" }
    );

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 401) {
        return { success: false, error: "Invalid credentials. Check your email and API token." };
      }
      if (res.status === 403) {
        return { success: false, error: "Access denied. The API token may not have sufficient permissions." };
      }
      return { success: false, error: `Jira API error ${res.status}: ${body}` };
    }

    const data = await res.json();
    return { success: true, serviceDeskCount: data.values?.length ?? 0 };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Connection failed. Check the site URL.",
    };
  }
}

/**
 * Get available service desks from a Jira instance.
 */
export async function getAvailableServiceDesks(
  siteUrl: string,
  email: string,
  apiToken: string
): Promise<Array<{ id: string; name: string }>> {
  await requireAdmin();

  const { getAuthHeaders, isServiceAccount, getApiBase } = await import("@/lib/jira");
  const config = { baseUrl: siteUrl.replace(/\/$/, ""), email, apiToken, serviceDeskId: "" };
  const headers = getAuthHeaders(config);
  const base = isServiceAccount(config)
    ? await getApiBase(config)
    : siteUrl.replace(/\/$/, "");

  const res = await fetch(
    `${base}/rest/servicedeskapi/servicedesk`,
    { headers, cache: "no-store" }
  );

  if (!res.ok) return [];
  const data = await res.json();
  return (data.values ?? []).map((sd: { id: string; projectName: string }) => ({
    id: String(sd.id),
    name: sd.projectName,
  }));
}

/**
 * Save Jira connection config. Encrypts the API token before storing.
 * Validates the connection first — fails fast if creds are wrong.
 */
export async function updateJiraConfig(
  siteUrl: string,
  email: string,
  apiToken: string,
  serviceDeskId: string
): Promise<{ success: boolean; error?: string }> {
  const { portalId } = await requireAdmin();

  // Validate first
  const test = await testJiraConnection(siteUrl, email, apiToken);
  if (!test.success) {
    return { success: false, error: test.error };
  }

  const supabase = getServiceClient();
  const encryptionKey = getEncryptionKey();

  // Encrypt the API token using pgcrypto
  const { data: encrypted, error: encryptError } = await supabase.rpc("encrypt_token", {
    token_value: apiToken,
    encryption_key: encryptionKey,
  });

  if (encryptError || !encrypted) {
    // Do not store plaintext credentials — fail fast
    console.error("Token encryption failed:", encryptError?.message);
    return {
      success: false,
      error: "Failed to encrypt API token. Ensure pgcrypto is enabled in your database.",
    };
  }

  const tokenToStore = encrypted;

  const { error } = await supabase
    .from("portals")
    .update({
      jira_site_url: siteUrl.replace(/\/$/, ""),
      jira_email: email,
      jira_api_token: tokenToStore,
      jira_service_desk_id: serviceDeskId,
    })
    .eq("id", portalId);

  if (error) {
    return { success: false, error: "Failed to save configuration." };
  }

  await clearConfigCache(portalId);
  return { success: true };
}

// ─── Branding ────────────────────────────────────────────────

export interface PortalBranding {
  name: string;
  primaryColor: string;
  logoUrl: string | null;
}

export async function getPortalBranding(): Promise<PortalBranding> {
  const { portalId } = await requireAdmin();
  const supabase = getServiceClient();

  const { data: portal } = await supabase
    .from("portals")
    .select("name, primary_color, logo_url")
    .eq("id", portalId)
    .single();

  return {
    name: portal?.name ?? "",
    primaryColor: portal?.primary_color ?? "#06b6d4",
    logoUrl: portal?.logo_url ?? null,
  };
}

export async function updateBranding(
  name: string,
  primaryColor: string,
  logoUrl?: string | null
): Promise<{ success: boolean; error?: string }> {
  const { portalId } = await requireAdmin();
  const supabase = getServiceClient();

  const updates: Record<string, unknown> = {
    name,
    primary_color: primaryColor,
  };
  if (logoUrl !== undefined) {
    updates.logo_url = logoUrl || null;
  }

  const { error } = await supabase
    .from("portals")
    .update(updates)
    .eq("id", portalId);

  if (error) {
    return { success: false, error: "Failed to update branding." };
  }

  await clearPortalDataCache(portalId);
  return { success: true };
}

// ─── Request Types ───────────────────────────────────────────

export interface AdminRequestType {
  jiraId: string;
  name: string;
  description: string;
  enabled: boolean;
  displayName: string | null;
  displayOrder: number;
}

/**
 * Get all request types from Jira, cross-referenced with portal_request_types
 * to show which are enabled.
 */
export async function getAdminRequestTypes(): Promise<AdminRequestType[]> {
  const { portalId } = await requireAdmin();
  const supabase = getServiceClient();

  let jiraTypes: RequestType[];
  try {
    jiraTypes = await getRequestTypes(portalId);
  } catch {
    return [];
  }

  // Get existing portal_request_types config
  const { data: portalTypes } = await supabase
    .from("portal_request_types")
    .select("jira_request_type_id, display_name, display_order, enabled")
    .eq("portal_id", portalId);

  const configMap = new Map(
    (portalTypes ?? []).map((pt) => [pt.jira_request_type_id, pt])
  );

  return jiraTypes.map((rt, index) => {
    const config = configMap.get(rt.id);
    return {
      jiraId: rt.id,
      name: rt.name,
      description: rt.description,
      enabled: config?.enabled ?? true, // Default: all enabled
      displayName: config?.display_name ?? null,
      displayOrder: config?.display_order ?? index,
    };
  });
}

export async function updateRequestTypeVisibility(
  requestTypeId: string,
  enabled: boolean,
  displayName?: string | null,
  displayOrder?: number
): Promise<{ success: boolean }> {
  const { portalId } = await requireAdmin();
  const supabase = getServiceClient();

  await supabase
    .from("portal_request_types")
    .upsert(
      {
        portal_id: portalId,
        jira_request_type_id: requestTypeId,
        enabled,
        display_name: displayName ?? null,
        display_order: displayOrder ?? 0,
      },
      { onConflict: "portal_id,jira_request_type_id", ignoreDuplicates: false }
    );

  return { success: true };
}

/**
 * Batch-update request type ordering. Accepts an array of { jiraId, displayOrder }.
 */
export async function updateRequestTypeOrder(
  items: Array<{ jiraId: string; displayOrder: number }>
): Promise<{ success: boolean }> {
  const { portalId } = await requireAdmin();
  const supabase = getServiceClient();

  // Get existing enabled states so we don't accidentally re-enable disabled types
  const { data: existing } = await supabase
    .from("portal_request_types")
    .select("jira_request_type_id, enabled")
    .eq("portal_id", portalId);

  const enabledMap = new Map(
    (existing ?? []).map((e) => [e.jira_request_type_id, e.enabled])
  );

  // Upsert all in parallel, preserving existing enabled state
  await Promise.all(
    items.map(({ jiraId, displayOrder }) =>
      supabase
        .from("portal_request_types")
        .upsert(
          {
            portal_id: portalId,
            jira_request_type_id: jiraId,
            display_order: displayOrder,
            enabled: enabledMap.get(jiraId) ?? true,
          },
          { onConflict: "portal_id,jira_request_type_id", ignoreDuplicates: false }
        )
    )
  );

  return { success: true };
}

// ─── Users ───────────────────────────────────────────────────

export interface PortalUserInfo {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: "user" | "manager" | "admin";
  jiraOrgId: string | null;
  createdAt: string;
}

export async function getPortalUsers(): Promise<PortalUserInfo[]> {
  const { portalId } = await requireAdmin();
  const supabase = getServiceClient();

  const { data: users } = await supabase
    .from("portal_users")
    .select("id, email, first_name, last_name, role, jira_org_id, created_at")
    .eq("portal_id", portalId)
    .order("created_at", { ascending: true });

  return (users ?? []).map((u) => ({
    id: u.id,
    email: u.email,
    firstName: u.first_name,
    lastName: u.last_name,
    role: u.role,
    jiraOrgId: u.jira_org_id,
    createdAt: u.created_at,
  }));
}

/**
 * Fetch Jira organizations for the admin's portal.
 */
export async function getJiraOrganizations(): Promise<
  Array<{ id: string; name: string }>
> {
  const { portalId } = await requireAdmin();
  try {
    const result = await getOrganizations(portalId);
    return result.values ?? [];
  } catch {
    return [];
  }
}

export async function inviteUser(
  email: string,
  role: "user" | "manager" | "admin",
  jiraOrgId?: string
): Promise<{ success: boolean; error?: string }> {
  const { portalId } = await requireAdmin();
  const supabase = getServiceClient();
  const normalizedEmail = email.toLowerCase().trim();

  // Insert into portal_users
  const { error } = await supabase.from("portal_users").insert({
    portal_id: portalId,
    email: normalizedEmail,
    role,
    jira_org_id: jiraOrgId || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "This email is already invited." };
    }
    return { success: false, error: "Failed to invite user." };
  }

  // Jira customer creation happens automatically on first ticket submission
  // via raiseOnBehalfOf — no need to pre-create here.

  return { success: true };
}

export async function removeUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin();
  const supabase = getServiceClient();

  // Can't remove yourself
  const { data: targetUser } = await supabase
    .from("portal_users")
    .select("email")
    .eq("id", userId)
    .single();

  if (targetUser?.email === admin.email) {
    return { success: false, error: "You cannot remove yourself." };
  }

  const { error } = await supabase
    .from("portal_users")
    .delete()
    .eq("id", userId)
    .eq("portal_id", admin.portalId);

  if (error) {
    return { success: false, error: "Failed to remove user." };
  }

  return { success: true };
}

export async function updateUserRole(
  userId: string,
  role: "user" | "manager" | "admin"
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin();
  const supabase = getServiceClient();

  // Can't change your own role
  const { data: targetUser } = await supabase
    .from("portal_users")
    .select("email")
    .eq("id", userId)
    .single();

  if (targetUser?.email === admin.email) {
    return { success: false, error: "You cannot change your own role." };
  }

  const { error } = await supabase
    .from("portal_users")
    .update({ role })
    .eq("id", userId)
    .eq("portal_id", admin.portalId);

  if (error) {
    return { success: false, error: "Failed to update role." };
  }

  return { success: true };
}
