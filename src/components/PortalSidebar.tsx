"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Send,
  Ticket,
  LayoutDashboard,
  Building2,
  Users,
  LogOut,
  ChevronRight,
  Layers
} from "lucide-react";
import { signOut } from "@/actions/auth";

const navItems = [
  { label: "Submit", href: "/portal", icon: Send },
  { label: "My Tickets", href: "/portal/tickets", icon: Ticket },
  { label: "Dashboard", href: "/portal/dashboard", icon: LayoutDashboard },
];

const managerItems = [
  { label: "Org Tickets", href: "/portal/manager", icon: Users },
  { label: "Manager Dashboard", href: "/portal/manager/dashboard", icon: LayoutDashboard },
];

interface PortalSidebarProps {
  isManager?: boolean;
  userEmail?: string | null;
  userName?: string | null;
  portalName?: string | null;
  portalLogoUrl?: string | null;
  primaryColor?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getDisplayName(email: string): string {
  // Extract name from email: "theo@opsshark.com" → "Theo"
  const local = email.split("@")[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export default function PortalSidebar({ isManager, userEmail, userName, portalName, portalLogoUrl, primaryColor = "#06b6d4" }: PortalSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const displayName = userName ?? (userEmail ? getDisplayName(userEmail) : (isManager ? "Mike Ross" : "Alex Johnson"));
  const brandName = portalName ?? "Client Portal";
  const displayRole = isManager ? "Manager" : "End User";
  const initials = getInitials(displayName);

  const isActive = (href: string) => {
    if (href === "/portal") return pathname === "/portal";
    return pathname.startsWith(href);
  };

  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="w-64 min-h-screen flex flex-col border-r"
      style={{ backgroundColor: '#141418', borderColor: '#1e1e2a' }}>

      {/* Company branding */}
      <div className="p-5 border-b" style={{ borderColor: '#1e1e2a' }}>
        <div className="flex items-center gap-3">
          {portalLogoUrl ? (
            <img src={portalLogoUrl} alt={brandName} className="w-9 h-9 rounded-lg object-contain" />
          ) : (
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#1e1e2a' }}>
              <Building2 size={18} style={{ color: primaryColor }} />
            </div>
          )}
          <div>
            <div className="font-semibold text-sm">{brandName}</div>
            <div className="text-xs" style={{ color: '#64748b' }}>Client Portal</div>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b" style={{ borderColor: '#1e1e2a' }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: `${primaryColor}33`, color: primaryColor }}>
            {initials}
          </div>
          <div>
            <div className="text-xs font-medium">{displayName}</div>
            <div className="text-xs" style={{ color: '#475569' }}>{displayRole}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        <div className="text-xs font-medium mb-2 px-2" style={{ color: '#475569' }}>PORTAL</div>
        {navItems.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all"
            style={{
              backgroundColor: isActive(href) ? `${primaryColor}1F` : 'transparent',
              color: isActive(href) ? primaryColor : '#94a3b8',
            }}>
            <Icon size={16} />
            <span className="flex-1">{label}</span>
            {isActive(href) && <ChevronRight size={14} />}
          </Link>
        ))}

        {isManager && (
          <>
            <div className="text-xs font-medium mt-4 mb-2 px-2" style={{ color: '#475569' }}>MANAGER</div>
            {managerItems.map(({ label, href, icon: Icon }) => (
              <Link key={href} href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all"
                style={{
                  backgroundColor: isActive(href) ? 'rgba(6,182,212,0.12)' : 'transparent',
                  color: isActive(href) ? '#06b6d4' : '#94a3b8',
                }}>
                <Icon size={16} />
                <span className="flex-1">{label}</span>
                {isActive(href) && <ChevronRight size={14} />}
              </Link>
            ))}
          </>
        )}

        {!isManager && (
          <div className="mt-4">
            <Link href="/portal/manager"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all border"
              style={{
                borderColor: '#1e1e2a',
                color: '#475569',
              }}>
              <Users size={16} />
              <span className="flex-1">Manager View</span>
            </Link>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t" style={{ borderColor: '#1e1e2a' }}>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-xs w-full px-2 py-1.5 rounded"
          style={{ color: '#475569' }}>
          <LogOut size={14} />
          Sign out
        </button>
        <div className="flex items-center gap-1 mt-3 px-2">
          <Layers size={10} style={{ color: '#334155' }} />
          <span className="text-xs" style={{ color: '#334155' }}>Powered by Clientry</span>
        </div>
      </div>
    </aside>
  );
}
