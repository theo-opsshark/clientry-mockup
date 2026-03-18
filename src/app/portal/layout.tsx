import PortalSidebar from "@/components/PortalSidebar";
import { getCurrentUser } from "@/actions/auth";
import { getPortalData } from "@/actions/portal";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const portal = user?.portalId
    ? await getPortalData(user.portalId)
    : null;

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#0f0f13" }}>
      <PortalSidebar
        isManager={user?.role === "manager"}
        userEmail={user?.email ?? null}
        portalName={portal?.name ?? null}
        portalLogoUrl={portal?.logoUrl ?? null}
        primaryColor={portal?.primaryColor ?? "#06b6d4"}
      />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
