import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import ManagerDashboardContent from "./DashboardContent";

export const dynamic = "force-dynamic";

export default async function ManagerDashboardPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "manager") {
    redirect("/portal");
  }

  return <ManagerDashboardContent />;
}
