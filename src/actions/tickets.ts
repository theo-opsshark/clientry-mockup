"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import {
  getMyRequests,
  getOrgRequests,
  getRequestByKey,
  getRequestComments,
  addRequestComment,
} from "@/lib/jira-backend";
import type { JiraRequest, JiraComment } from "@/lib/jira";
import { getCurrentUser } from "./auth";

// ─── Types ───────────────────────────────────────────────────

export interface TicketListItem {
  issueKey: string;
  summary: string;
  status: string;
  statusCategory: string;
  requestTypeId: string;
  reporter: string;
  createdDate: string;
  createdFriendly: string;
  updatedFriendly: string;
}

export interface TicketDetail {
  issueKey: string;
  summary: string;
  description: string;
  status: string;
  statusCategory: string;
  reporter: string;
  reporterEmail: string;
  createdDate: string;
  createdFriendly: string;
  fields: Array<{ label: string; value: string }>;
  comments: Array<{
    id: string;
    body: string;
    author: string;
    createdFriendly: string;
    isPublic: boolean;
  }>;
}

// ─── Cache Config ────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Check cache for a ticket list (stored under a synthetic key like "list:user:email" or "list:org:orgId").
 * Returns null if not cached or stale.
 */
async function getCachedTickets(
  portalId: string,
  cacheKey: string
): Promise<TicketListItem[] | null> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("ticket_cache")
    .select("data, cached_at")
    .eq("portal_id", portalId)
    .eq("jira_key", cacheKey)
    .single();

  if (!data) return null;

  const age = Date.now() - new Date(data.cached_at).getTime();
  if (age > CACHE_TTL_MS) return null;

  return data.data as TicketListItem[];
}

/**
 * Store ticket list in cache.
 */
async function setCachedTickets(
  portalId: string,
  cacheKey: string,
  tickets: TicketListItem[]
): Promise<void> {
  const supabase = getServiceClient();
  await supabase.from("ticket_cache").upsert(
    {
      portal_id: portalId,
      jira_key: cacheKey,
      data: tickets,
      cached_at: new Date().toISOString(),
    },
    { onConflict: "portal_id,jira_key" }
  );
}

/**
 * Check cache for a single ticket detail.
 */
async function getCachedDetail(
  portalId: string,
  issueKey: string
): Promise<TicketDetail | null> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("ticket_cache")
    .select("data, cached_at")
    .eq("portal_id", portalId)
    .eq("jira_key", `detail:${issueKey}`)
    .single();

  if (!data) return null;

  const age = Date.now() - new Date(data.cached_at).getTime();
  if (age > CACHE_TTL_MS) return null;

  return data.data as TicketDetail;
}

/**
 * Store single ticket detail in cache.
 */
async function setCachedDetail(
  portalId: string,
  issueKey: string,
  detail: TicketDetail
): Promise<void> {
  const supabase = getServiceClient();
  await supabase.from("ticket_cache").upsert(
    {
      portal_id: portalId,
      jira_key: `detail:${issueKey}`,
      data: detail,
      cached_at: new Date().toISOString(),
    },
    { onConflict: "portal_id,jira_key" }
  );
}

/**
 * Invalidate cached data for a specific ticket (detail + any list caches).
 */
async function invalidateTicketCache(
  portalId: string,
  issueKey: string
): Promise<void> {
  const supabase = getServiceClient();
  // Delete the detail cache entry
  await supabase
    .from("ticket_cache")
    .delete()
    .eq("portal_id", portalId)
    .eq("jira_key", `detail:${issueKey}`);

  // Also invalidate list caches (they contain stale status/data).
  // Delete all list:* entries for this portal so next load fetches fresh.
  await supabase
    .from("ticket_cache")
    .delete()
    .eq("portal_id", portalId)
    .like("jira_key", "list:%");
}

// ─── Helpers ─────────────────────────────────────────────────

function extractSummary(request: JiraRequest): string {
  const summaryField = request.requestFieldValues?.find(
    (f) => f.fieldId === "summary"
  );
  return (summaryField?.value as string) ?? request.issueKey;
}

function extractDescription(request: JiraRequest): string {
  const descField = request.requestFieldValues?.find(
    (f) => f.fieldId === "description"
  );
  return (descField?.value as string) ?? "";
}

function mapRequestToListItem(req: JiraRequest): TicketListItem {
  return {
    issueKey: req.issueKey,
    summary: extractSummary(req),
    status: req.currentStatus.status,
    statusCategory: req.currentStatus.statusCategory,
    requestTypeId: req.requestTypeId,
    reporter: req.reporter.displayName,
    createdDate: req.createdDate.iso8601,
    createdFriendly: req.createdDate.friendly,
    updatedFriendly: req.currentStatus.statusDate.friendly,
  };
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object" && value !== null) {
    if ("name" in value) return (value as { name: string }).name;
    if ("value" in value) return (value as { value: string }).value;
    if (Array.isArray(value)) {
      return value.map((v) => formatFieldValue(v)).join(", ");
    }
  }
  return String(value);
}

/**
 * Check if a user can access a ticket.
 * - Admins and managers can see all tickets in their portal.
 * - Regular users can only see tickets they reported.
 */
function canAccessTicket(
  user: { email: string; role: string },
  reporterEmail: string | undefined | null
): boolean {
  if (user.role === "admin" || user.role === "manager") return true;
  // If reporter email is private/null, allow access if the ticket was
  // returned by the JSM API (which already enforces participant access)
  if (!reporterEmail) return true;
  return user.email.toLowerCase() === reporterEmail.toLowerCase();
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Get the current user's tickets.
 * Uses ticket_cache with 5-minute TTL.
 */
export async function getMyTickets(): Promise<TicketListItem[]> {
  const user = await getCurrentUser();
  const portalId = user?.portalId ?? "demo";

  // Try cache if authenticated
  if (user?.portalId && user.email) {
    const cacheKey = `list:user:${user.email.toLowerCase()}`;
    const cached = await getCachedTickets(user.portalId, cacheKey);
    if (cached) return cached;
  }

  const data = await getMyRequests(portalId);
  let requests = data.values;

  // Filter to user's own tickets when authenticated (skip for demo — show all)
  if (user?.email && !user.isDemo) {
    requests = requests.filter(
      (req) =>
        req.reporter.emailAddress?.toLowerCase() === user.email.toLowerCase()
    );
  }

  const tickets = requests.map(mapRequestToListItem);

  // Cache the result
  if (user?.portalId && user.email) {
    const cacheKey = `list:user:${user.email.toLowerCase()}`;
    setCachedTickets(user.portalId, cacheKey, tickets).catch(() => {
      /* swallow cache write errors */
    });
  }

  return tickets;
}

/**
 * Get all tickets for an organization (manager view).
 * Validates that the user's jiraOrgId matches the requested org.
 * Uses ticket_cache with 5-minute TTL.
 */
export async function getOrgTickets(
  organizationId: string
): Promise<TicketListItem[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  // Verify the user belongs to the requested org
  if (user.jiraOrgId !== organizationId) {
    throw new Error("You do not have access to this organization's tickets.");
  }

  // Try cache
  if (user?.portalId) {
    const cacheKey = `list:org:${organizationId}`;
    const cached = await getCachedTickets(user.portalId, cacheKey);
    if (cached) return cached;
  }

  const data = await getOrgRequests(user.portalId, organizationId);
  const tickets = data.values.map(mapRequestToListItem);

  // Cache the result
  if (user?.portalId) {
    const cacheKey = `list:org:${organizationId}`;
    setCachedTickets(user.portalId, cacheKey, tickets).catch(() => {
      /* swallow cache write errors */
    });
  }

  return tickets;
}

/**
 * Get full ticket detail including comments.
 * Verifies the ticket belongs to the user (reporter match) or their org (manager).
 * Uses ticket_cache with 5-minute TTL.
 */
export async function getTicketDetail(
  issueKey: string
): Promise<TicketDetail> {
  // Validate issue key format (e.g., PROJ-123)
  if (!/^[A-Z][A-Z0-9]+-\d+$/.test(issueKey)) {
    throw new Error("Invalid issue key format.");
  }

  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  // Try cache
  const cached = await getCachedDetail(user.portalId, issueKey);
  if (cached) {
    // Verify access even on cache hit (demo users can see all)
    if (!user.isDemo && !canAccessTicket(user, cached.reporterEmail)) {
      throw new Error("You do not have access to this ticket.");
    }
    return cached;
  }

  const [request, commentsData] = await Promise.all([
    getRequestByKey(user.portalId, issueKey),
    getRequestComments(user.portalId, issueKey),
  ]);

  // Verify the user can access this ticket (demo users can see all)
  if (!user.isDemo && !canAccessTicket(user, request.reporter.emailAddress)) {
    throw new Error("You do not have access to this ticket.");
  }

  const skipFields = new Set(["summary", "description", "attachment"]);
  const fields = (request.requestFieldValues ?? [])
    .filter((f) => !skipFields.has(f.fieldId))
    .map((f) => ({
      label: f.label,
      value: formatFieldValue(f.value),
    }));

  const comments = commentsData.values.map((c: JiraComment) => ({
    id: c.id,
    body: c.body,
    author: c.author.displayName,
    createdFriendly: c.created.friendly,
    isPublic: c.public,
  }));

  const detail: TicketDetail = {
    issueKey: request.issueKey,
    summary: extractSummary(request),
    description: extractDescription(request),
    status: request.currentStatus.status,
    statusCategory: request.currentStatus.statusCategory,
    reporter: request.reporter.displayName,
    reporterEmail: request.reporter.emailAddress,
    createdDate: request.createdDate.iso8601,
    createdFriendly: request.createdDate.friendly,
    fields,
    comments,
  };

  // Cache the result
  if (user?.portalId) {
    setCachedDetail(user.portalId, issueKey, detail).catch(() => {
      /* swallow cache write errors */
    });
  }

  return detail;
}

/**
 * Add a comment to a ticket.
 * Verifies the user has access before allowing the comment.
 * Invalidates the cache for the ticket so next load is fresh.
 */
export async function addComment(
  issueKey: string,
  body: string
): Promise<{ id: string; author: string; createdFriendly: string }> {
  if (!/^[A-Z][A-Z0-9]+-\d+$/.test(issueKey)) {
    throw new Error("Invalid issue key format.");
  }
  if (!body.trim()) {
    throw new Error("Comment body cannot be empty.");
  }

  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  // Verify the user can access this ticket before allowing a comment (demo users can access all)
  const request = await getRequestByKey(user.portalId, issueKey);
  if (!user.isDemo && !canAccessTicket(user, request.reporter.emailAddress)) {
    throw new Error("You do not have access to this ticket.");
  }

  const comment = await addRequestComment(user.portalId, issueKey, body);
  if (user?.portalId) {
    invalidateTicketCache(user.portalId, issueKey).catch(() => {
      /* swallow cache invalidation errors */
    });
  }

  return {
    id: comment.id,
    author: comment.author.displayName,
    createdFriendly: comment.created.friendly,
  };
}
