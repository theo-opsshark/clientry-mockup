import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { getOrgTickets } from "@/actions/tickets";
import { getOrgName } from "@/actions/org";
import { mapJiraStatus } from "@/lib/jira-field-mappers";
import ManagerClient from "./ManagerClient";

export const dynamic = "force-dynamic";

export default async function ManagerPage() {
  const user = await getCurrentUser();

  // Role gate: only managers can access this page
  if (!user || user.role !== "manager") {
    redirect("/portal");
  }

  if (!user.jiraOrgId) {
    return (
      <div className="max-w-6xl">
        <p className="text-sm" style={{ color: "#94a3b8" }}>
          No organization is linked to your account. Contact your administrator.
        </p>
      </div>
    );
  }

  const [tickets, orgName] = await Promise.all([
    getOrgTickets(user.jiraOrgId),
    getOrgName(user.jiraOrgId),
  ]);

  const mapped = tickets.map((t) => ({
    ...t,
    displayStatus: mapJiraStatus(t.status, t.statusCategory),
  }));

  return (
    <div className="max-w-6xl">
      <ManagerClient tickets={mapped} orgName={orgName} />
    </div>
  );
}
