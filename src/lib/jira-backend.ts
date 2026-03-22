/**
 * Jira backend dispatcher.
 * Routes Jira API calls through either:
 *   - Forge webtrigger (for Marketplace-installed portals with forge_cloud_id)
 *   - Direct Jira API (for legacy portals with service account tokens)
 *
 * Server actions should use this instead of importing jira.ts directly.
 */

import { createClient } from "@supabase/supabase-js";
import { forgeCall, type ForgePortalConfig } from "./forge";
import { getJiraConfig } from "./config";
import type { JiraConfig, PaginatedResponse, RequestType, RequestTypeField, JiraRequest, JiraComment, CreatedRequest } from "./jira";

// ─── Portal Backend Resolution ───────────────────────────────

interface PortalBackend {
  type: "forge" | "direct";
  forgeConfig?: ForgePortalConfig;
  jiraConfig?: JiraConfig;
  serviceDeskId: string;
}

const backendCache = new Map<string, { backend: PortalBackend; cachedAt: number }>();
const BACKEND_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Resolve which backend (Forge or direct) to use for a portal.
 */
export async function getBackend(portalId: string): Promise<PortalBackend> {
  // Check cache
  const cached = backendCache.get(portalId);
  if (cached && Date.now() - cached.cachedAt < BACKEND_CACHE_TTL) {
    return cached.backend;
  }

  // Demo / env-var fallback
  if (!portalId || portalId === "demo") {
    const config = await getJiraConfig(portalId);
    const backend: PortalBackend = {
      type: "direct",
      jiraConfig: config,
      serviceDeskId: config.serviceDeskId,
    };
    return backend;
  }

  // Look up portal
  const supabase = getServiceClient();
  const { data: portal, error } = await supabase
    .from("portals")
    .select("forge_cloud_id, forge_webtrigger_url, forge_webhook_secret, forge_installed_at, jira_service_desk_id")
    .eq("id", portalId)
    .single();

  if (error || !portal) {
    throw new Error(`Portal not found: ${portalId}`);
  }

  let backend: PortalBackend;

  if (portal.forge_cloud_id && portal.forge_webtrigger_url && portal.forge_webhook_secret && portal.forge_installed_at) {
    // Forge-connected portal
    backend = {
      type: "forge",
      forgeConfig: {
        forgeCloudId: portal.forge_cloud_id,
        forgeWebtriggerUrl: portal.forge_webtrigger_url,
        forgeWebhookSecret: portal.forge_webhook_secret,
        serviceDeskId: portal.jira_service_desk_id ?? "",
      },
      serviceDeskId: portal.jira_service_desk_id ?? "",
    };
  } else {
    // Direct Jira connection (legacy)
    const config = await getJiraConfig(portalId);
    backend = {
      type: "direct",
      jiraConfig: config,
      serviceDeskId: config.serviceDeskId,
    };
  }

  backendCache.set(portalId, { backend, cachedAt: Date.now() });
  return backend;
}

/** Clear cached backend for a portal */
export function clearBackendCache(portalId: string): void {
  backendCache.delete(portalId);
}

// ─── Unified Jira API Functions ──────────────────────────────
// These mirror the functions in jira.ts but route through the correct backend.

export async function getRequestTypes(portalId: string): Promise<RequestType[]> {
  const backend = await getBackend(portalId);
  if (backend.type === "forge") {
    // Forge returns the raw paginated response; extract and filter like jira.ts does
    const data = await forgeCall<PaginatedResponse<RequestType>>(backend.forgeConfig!, "getRequestTypes", {
      serviceDeskId: backend.serviceDeskId,
    });
    return data.values.filter((rt) => rt.groupIds.length > 0);
  }
  const jira = await import("./jira");
  return jira.getRequestTypes(backend.jiraConfig!);
}

export async function getRequestTypeFields(portalId: string, requestTypeId: string): Promise<{ requestTypeFields: RequestTypeField[]; canRaiseOnBehalfOf: boolean }> {
  const backend = await getBackend(portalId);
  if (backend.type === "forge") {
    return forgeCall(backend.forgeConfig!, "getRequestTypeFields", {
      serviceDeskId: backend.serviceDeskId,
      requestTypeId,
    });
  }
  const jira = await import("./jira");
  return jira.getRequestTypeFields(backend.jiraConfig!, requestTypeId);
}

export async function createRequest(
  portalId: string,
  requestTypeId: string,
  fieldValues: Record<string, unknown>,
  raiseOnBehalfOf?: string
): Promise<CreatedRequest> {
  const backend = await getBackend(portalId);
  if (backend.type === "forge") {
    return forgeCall<CreatedRequest>(backend.forgeConfig!, "createRequest", {
      serviceDeskId: backend.serviceDeskId,
      requestTypeId,
      fieldValues,
      raiseOnBehalfOf,
    });
  }
  const jira = await import("./jira");
  return jira.createRequest(backend.jiraConfig!, requestTypeId, fieldValues, raiseOnBehalfOf);
}

export async function getMyRequests(portalId: string, options?: { start?: number; limit?: number }): Promise<PaginatedResponse<JiraRequest>> {
  const backend = await getBackend(portalId);
  if (backend.type === "forge") {
    return forgeCall(backend.forgeConfig!, "getMyRequests", {
      start: options?.start ?? 0,
      limit: options?.limit ?? 50,
    });
  }
  const jira = await import("./jira");
  return jira.getMyRequests(backend.jiraConfig!, options);
}

export async function getOrgRequests(portalId: string, orgId: string, options?: { start?: number; limit?: number }): Promise<PaginatedResponse<JiraRequest>> {
  const backend = await getBackend(portalId);
  if (backend.type === "forge") {
    return forgeCall(backend.forgeConfig!, "getOrgRequests", {
      organizationId: orgId,
      start: options?.start ?? 0,
      limit: options?.limit ?? 50,
    });
  }
  const jira = await import("./jira");
  return jira.getOrgRequests(backend.jiraConfig!, orgId, options);
}

export async function getRequestByKey(portalId: string, issueKey: string): Promise<JiraRequest> {
  const backend = await getBackend(portalId);
  if (backend.type === "forge") {
    return forgeCall(backend.forgeConfig!, "getRequestByKey", { issueKey });
  }
  const jira = await import("./jira");
  return jira.getRequestByKey(backend.jiraConfig!, issueKey);
}

export async function getRequestComments(portalId: string, issueKey: string, options?: { start?: number; limit?: number }): Promise<PaginatedResponse<JiraComment>> {
  const backend = await getBackend(portalId);
  if (backend.type === "forge") {
    return forgeCall(backend.forgeConfig!, "getRequestComments", {
      issueKey,
      start: options?.start ?? 0,
      limit: options?.limit ?? 50,
    });
  }
  const jira = await import("./jira");
  return jira.getRequestComments(backend.jiraConfig!, issueKey, options);
}

export async function addRequestComment(portalId: string, issueKey: string, body: string): Promise<JiraComment> {
  const backend = await getBackend(portalId);
  if (backend.type === "forge") {
    return forgeCall(backend.forgeConfig!, "addRequestComment", { issueKey, body });
  }
  const jira = await import("./jira");
  return jira.addRequestComment(backend.jiraConfig!, issueKey, body);
}

export async function getOrganizations(portalId: string): Promise<PaginatedResponse<{ id: string; name: string }>> {
  const backend = await getBackend(portalId);
  if (backend.type === "forge") {
    return forgeCall(backend.forgeConfig!, "getOrganizations", {});
  }
  const jira = await import("./jira");
  return jira.getOrganizations(backend.jiraConfig!);
}

export async function createOrFindCustomer(
  portalId: string,
  email: string,
  displayName: string
): Promise<{ success: boolean; accountId?: string; error?: string }> {
  const backend = await getBackend(portalId);
  if (backend.type === "forge") {
    return forgeCall(backend.forgeConfig!, "createOrFindCustomer", { email, displayName });
  }
  const jira = await import("./jira");
  return jira.createOrFindCustomer(backend.jiraConfig!, email, displayName);
}

export async function addUserToOrganization(
  portalId: string,
  orgId: string,
  accountIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const backend = await getBackend(portalId);
  if (backend.type === "forge") {
    return forgeCall(backend.forgeConfig!, "addUserToOrganization", {
      organizationId: orgId,
      accountIds,
    });
  }
  const jira = await import("./jira");
  return jira.addUserToOrganization(backend.jiraConfig!, orgId, accountIds);
}
