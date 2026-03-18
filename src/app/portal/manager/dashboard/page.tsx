import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { getManagerDashboardData } from "@/actions/dashboard";
import { getOrgName } from "@/actions/org";
import ManagerDashboardContent from "./DashboardContent";

export const dynamic = "force-dynamic";

export default async function ManagerDashboardPage() {
  const user = await getCurrentUser();

  if (!user || (user.role !== "manager" && user.role !== "admin")) {
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

  const [data, orgName] = await Promise.all([
    getManagerDashboardData(user.jiraOrgId),
    getOrgName(user.jiraOrgId),
  ]);

  return <ManagerDashboardContent data={data} orgName={orgName} />;
}
