"use client";

import { useState } from "react";
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
  Layers,
  Settings,
  Menu,
  X,
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
  isAdmin?: boolean;
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
  const local = email.split("@")[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export default function PortalSidebar({ isManager, isAdmin, userEmail, userName, portalName, portalLogoUrl, primaryColor = "#06b6d4" }: PortalSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName = userName ?? (userEmail ? getDisplayName(userEmail) : (isManager ? "Mike Ross" : "Alex Johnson"));
  const brandName = portalName ?? "Client Portal";
  const displayRole = isAdmin ? "Admin" : isManager ? "Manager" : "End User";
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

  function handleNavClick() {
    setMobileOpen(false);
  }

  const sidebarContent = (
    <>
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
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{brandName}</div>
            <div className="text-xs" style={{ color: '#64748b' }}>Client Portal</div>
          </div>
          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 rounded"
            style={{ color: '#64748b' }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b" style={{ borderColor: '#1e1e2a' }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: `${primaryColor}33`, color: primaryColor }}>
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium truncate">{displayName}</div>
            <div className="text-xs" style={{ color: '#475569' }}>{displayRole}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-xs font-medium mb-2 px-2" style={{ color: '#475569' }}>PORTAL</div>
        {navItems.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href} onClick={handleNavClick}
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
              <Link key={href} href={href} onClick={handleNavClick}
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
          </>
        )}

        {!isManager && (
          <div className="mt-4">
            <Link href="/portal/manager" onClick={handleNavClick}
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

        {isAdmin && (
          <>
            <div className="text-xs font-medium mt-4 mb-2 px-2" style={{ color: '#475569' }}>ADMIN</div>
            <Link href="/portal/admin" onClick={handleNavClick}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all"
              style={{
                backgroundColor: isActive("/portal/admin") ? `${primaryColor}1F` : 'transparent',
                color: isActive("/portal/admin") ? primaryColor : '#94a3b8',
              }}>
              <Settings size={16} />
              <span className="flex-1">Settings</span>
              {isActive("/portal/admin") && <ChevronRight size={14} />}
            </Link>
          </>
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
    </>
  );

  return (
    <>
      {/* Mobile header bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 py-3 border-b"
        style={{ backgroundColor: '#141418', borderColor: '#1e1e2a' }}
      >
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 rounded-lg"
          style={{ color: '#94a3b8' }}
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          {portalLogoUrl ? (
            <img src={portalLogoUrl} alt={brandName} className="w-6 h-6 rounded object-contain" />
          ) : (
            <Building2 size={16} style={{ color: primaryColor }} />
          )}
          <span className="text-sm font-medium">{brandName}</span>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop: static, mobile: slide-in drawer */}
      <aside
        className={`
          fixed md:static z-50 md:z-auto
          w-64 min-h-screen flex flex-col border-r
          transition-transform duration-200 ease-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={{ backgroundColor: '#141418', borderColor: '#1e1e2a' }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
