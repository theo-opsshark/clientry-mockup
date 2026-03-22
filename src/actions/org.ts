"use server";

import { getOrganizations } from "@/lib/jira-backend";
import { getCurrentUser } from "./auth";

/**
 * In-memory cache for org names (they rarely change).
 * Key: orgId, Value: org name
 */
const orgNameCache = new Map<string, string>();

/**
 * Get the display name for a Jira organization by ID.
 * Fetches from the Jira organizations API and caches in-memory.
 */
export async function getOrgName(orgId: string): Promise<string> {
  const cached = orgNameCache.get(orgId);
  if (cached) return cached;

  try {
    const user = await getCurrentUser();
    const portalId = user?.portalId ?? "demo";
    const orgs = await getOrganizations(portalId);
    for (const org of orgs.values) {
      orgNameCache.set(org.id, org.name);
    }
    return orgNameCache.get(orgId) ?? `Organization ${orgId}`;
  } catch {
    return `Organization ${orgId}`;
  }
}
