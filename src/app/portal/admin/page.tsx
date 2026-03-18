import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { getJiraConnectionStatus, getPortalBranding } from "@/actions/admin";
import AdminSettings from "./AdminSettings";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    redirect("/portal");
  }

  const [connectionStatus, branding] = await Promise.all([
    getJiraConnectionStatus(),
    getPortalBranding(),
  ]);

  return (
    <div className="max-w-4xl">
      <AdminSettings
        connectionStatus={connectionStatus}
        branding={branding}
      />
    </div>
  );
}
