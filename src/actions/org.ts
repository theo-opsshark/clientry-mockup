"use server";

import { getJiraConfig } from "@/lib/config";
import { getOrganizations } from "@/lib/jira";

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
    const config = getJiraConfig();
    const orgs = await getOrganizations(config);
    // Cache all orgs while we're at it
    for (const org of orgs.values) {
      orgNameCache.set(org.id, org.name);
    }
    return orgNameCache.get(orgId) ?? `Organization ${orgId}`;
  } catch {
    return `Organization ${orgId}`;
  }
}
