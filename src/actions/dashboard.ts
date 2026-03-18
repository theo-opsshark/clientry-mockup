"use server";

import { getMyTickets, getOrgTickets, type TicketListItem } from "./tickets";
import { mapJiraStatus } from "@/lib/jira-field-mappers";
import { getJiraConfig } from "@/lib/config";
import { getRequestTypes } from "@/lib/jira";
import { getCurrentUser } from "./auth";

// ─── Status colors (match StatusBadge and existing chart colors) ─────

const STATUS_COLORS: Record<string, string> = {
  Open: "#3b82f6",
  "In Review": "#eab308",
  Answered: "#22c55e",
  "Pending Approval": "#a855f7",
  Resolved: "#22c55e",
  Closed: "#334155",
};

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? "#64748b";
}

// ─── Type colors (rotating palette for request types) ────────────────

const TYPE_COLORS = ["#f87171", "#c084fc", "#06b6d4", "#facc15", "#34d399", "#fb923c", "#60a5fa"];

// ─── Personal Dashboard ─────────────────────────────────────────────

export interface StatusCount {
  name: string;
  value: number;
  color: string;
}

export interface RecentTicket {
  issueKey: string;
  summary: string;
  displayStatus: string;
  updatedFriendly: string;
}

export interface PersonalDashboardData {
  statusCounts: StatusCount[];
  openCount: number;
  inReviewCount: number;
  resolvedThisWeek: number;
  totalCount: number;
  recentTickets: RecentTicket[];
}

export async function getPersonalDashboardData(): Promise<PersonalDashboardData> {
  const tickets = await getMyTickets();

  if (tickets.length === 0) {
    return {
      statusCounts: [],
      openCount: 0,
      inReviewCount: 0,
      resolvedThisWeek: 0,
      totalCount: 0,
      recentTickets: [],
    };
  }

  // Map display statuses and aggregate counts
  const statusMap = new Map<string, number>();
  let openCount = 0;
  let inReviewCount = 0;
  let resolvedThisWeek = 0;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  for (const ticket of tickets) {
    const displayStatus = mapJiraStatus(ticket.status, ticket.statusCategory);
    statusMap.set(displayStatus, (statusMap.get(displayStatus) ?? 0) + 1);

    if (displayStatus === "Open") openCount++;
    if (displayStatus === "In Review") inReviewCount++;

    // Resolved this week: DONE category tickets created or updated in last 7 days
    if (ticket.statusCategory === "DONE") {
      const created = new Date(ticket.createdDate);
      if (created >= oneWeekAgo) {
        resolvedThisWeek++;
      }
    }
  }

  const statusCounts: StatusCount[] = Array.from(statusMap.entries()).map(
    ([name, value]) => ({
      name,
      value,
      color: getStatusColor(name),
    })
  );

  // Recent tickets: sort by updated date (most recent first), take 5
  const sorted = [...tickets].sort((a, b) => {
    // updatedFriendly is human-readable, use createdDate as fallback for sorting
    return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
  });

  const recentTickets: RecentTicket[] = sorted.slice(0, 5).map((t) => ({
    issueKey: t.issueKey,
    summary: t.summary,
    displayStatus: mapJiraStatus(t.status, t.statusCategory),
    updatedFriendly: t.updatedFriendly,
  }));

  return {
    statusCounts,
    openCount,
    inReviewCount,
    resolvedThisWeek,
    totalCount: tickets.length,
    recentTickets,
  };
}

// ─── Manager Dashboard ──────────────────────────────────────────────

export interface TypeCount {
  name: string;
  value: number;
  color: string;
}

export interface DayVolume {
  day: string;
  tickets: number;
}

export interface TopSubmitter {
  name: string;
  tickets: number;
  open: number;
  closed: number;
}

export interface ManagerDashboardData {
  statusCounts: StatusCount[];
  typeCounts: TypeCount[];
  volumeByDay: DayVolume[];
  topSubmitters: TopSubmitter[];
  totalCount: number;
  openCount: number;
  resolvedCount: number;
  overdueCount: number;
}

export async function getManagerDashboardData(
  orgId: string
): Promise<ManagerDashboardData> {
  // Fetch tickets and request types in parallel
  // getRequestTypes() is called once per dashboard load, not per ticket
  const user = await getCurrentUser();
  const config = await getJiraConfig(user?.portalId);
  const [tickets, requestTypes] = await Promise.all([
    getOrgTickets(orgId),
    getRequestTypes(config),
  ]);

  if (tickets.length === 0) {
    return {
      statusCounts: [],
      typeCounts: [],
      volumeByDay: buildEmptyVolume(),
      topSubmitters: [],
      totalCount: 0,
      openCount: 0,
      resolvedCount: 0,
      overdueCount: 0,
    };
  }

  // Build request type ID → name map (cached for this request)
  const typeNameMap = new Map<string, string>();
  for (const rt of requestTypes) {
    typeNameMap.set(rt.id, rt.name);
  }

  // ─── Aggregate all stats in a single pass ───
  const statusMap = new Map<string, number>();
  const typeMap = new Map<string, number>();
  const reporterMap = new Map<string, { total: number; open: number; closed: number }>();
  const dayMap = new Map<string, number>();
  let openCount = 0;
  let resolvedCount = 0;
  let overdueCount = 0;

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  for (const ticket of tickets) {
    const displayStatus = mapJiraStatus(ticket.status, ticket.statusCategory);

    // Status counts
    statusMap.set(displayStatus, (statusMap.get(displayStatus) ?? 0) + 1);

    // Big stats
    if (ticket.statusCategory === "NEW") openCount++;
    if (ticket.statusCategory === "DONE") resolvedCount++;
    if (
      ticket.statusCategory === "INDETERMINATE" &&
      new Date(ticket.createdDate) < twentyFourHoursAgo
    ) {
      overdueCount++;
    }

    // Type counts
    const typeName = typeNameMap.get(ticket.requestTypeId) ?? "Other";
    typeMap.set(typeName, (typeMap.get(typeName) ?? 0) + 1);

    // Reporter (top submitters)
    const reporter = ticket.reporter;
    const existing = reporterMap.get(reporter) ?? { total: 0, open: 0, closed: 0 };
    existing.total++;
    if (ticket.statusCategory !== "DONE") existing.open++;
    else existing.closed++;
    reporterMap.set(reporter, existing);

    // Volume by day (last 14 days)
    const created = new Date(ticket.createdDate);
    const dayKey = created.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    dayMap.set(dayKey, (dayMap.get(dayKey) ?? 0) + 1);
  }

  // Status counts → chart data
  const statusCounts: StatusCount[] = Array.from(statusMap.entries()).map(
    ([name, value]) => ({ name, value, color: getStatusColor(name) })
  );

  // Type counts → chart data with rotating colors
  const typeCounts: TypeCount[] = Array.from(typeMap.entries())
    .map(([name, value], i) => ({
      name,
      value,
      color: TYPE_COLORS[i % TYPE_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);

  // Volume by day — fill in last 14 days (including days with 0 tickets)
  const volumeByDay = buildVolumeData(dayMap);

  // Top submitters — sort by total, take top 5
  const topSubmitters: TopSubmitter[] = Array.from(reporterMap.entries())
    .map(([name, counts]) => ({
      name,
      tickets: counts.total,
      open: counts.open,
      closed: counts.closed,
    }))
    .sort((a, b) => b.tickets - a.tickets)
    .slice(0, 5);

  return {
    statusCounts,
    typeCounts,
    volumeByDay,
    topSubmitters,
    totalCount: tickets.length,
    openCount,
    resolvedCount,
    overdueCount,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────

function buildVolumeData(dayMap: Map<string, number>): DayVolume[] {
  const result: DayVolume[] = [];
  const now = new Date();

  for (let i = 13; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayKey = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    result.push({
      day: dayKey,
      tickets: dayMap.get(dayKey) ?? 0,
    });
  }

  return result;
}

function buildEmptyVolume(): DayVolume[] {
  return buildVolumeData(new Map());
}
