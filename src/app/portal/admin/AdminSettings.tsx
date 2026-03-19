"use client";

import { useState, useEffect } from "react";
import { Link2, Palette, LayoutList, Users, CheckCircle2, AlertCircle, Loader2, Trash2, Plus } from "lucide-react";
import {
  testJiraConnection,
  updateJiraConfig,
  getAvailableServiceDesks,
  updateBranding,
  getAdminRequestTypes,
  updateRequestTypeVisibility,
  updateRequestTypeOrder,
  getPortalUsers,
  inviteUser,
  removeUser,
  updateUserRole,
  type JiraConnectionStatus,
  type PortalBranding,
  type AdminRequestType,
  type PortalUserInfo,
} from "@/actions/admin";

// ─── Tab definitions ─────────────────────────────────────────

const tabs = [
  { id: "connection", label: "Jira Connection", icon: Link2 },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "request-types", label: "Request Types", icon: LayoutList },
  { id: "users", label: "Users", icon: Users },
] as const;

type TabId = (typeof tabs)[number]["id"];

// ─── Main Component ──────────────────────────────────────────

interface Props {
  connectionStatus: JiraConnectionStatus;
  branding: PortalBranding;
}

export default function AdminSettings({ connectionStatus, branding }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("connection");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Portal Settings</h1>
        <p className="text-sm" style={{ color: "#64748b" }}>
          Configure your portal&apos;s Jira connection, branding, and users.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ backgroundColor: "#141418" }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all flex-1 justify-center"
            style={{
              backgroundColor: activeTab === id ? "#1e1e2a" : "transparent",
              color: activeTab === id ? "#e2e8f0" : "#64748b",
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "connection" && <ConnectionTab initial={connectionStatus} />}
      {activeTab === "branding" && <BrandingTab initial={branding} />}
      {activeTab === "request-types" && <RequestTypesTab />}
      {activeTab === "users" && <UsersTab />}
    </div>
  );
}

// ─── Connection Tab ──────────────────────────────────────────

function ConnectionTab({ initial }: { initial: JiraConnectionStatus }) {
  const [siteUrl, setSiteUrl] = useState(initial.siteUrl ?? "");
  const [email, setEmail] = useState(initial.email ?? "");
  const [apiToken, setApiToken] = useState("");
  const [serviceDeskId, setServiceDeskId] = useState(initial.serviceDeskId ?? "");
  const [serviceDesks, setServiceDesks] = useState<Array<{ id: string; name: string }>>([]);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [saveResult, setSaveResult] = useState<{ success: boolean; error?: string } | null>(null);

  async function handleTest() {
    if (!siteUrl || !email || !apiToken) return;
    setTesting(true);
    setTestResult(null);

    const result = await testJiraConnection(siteUrl.replace(/\/$/, ""), email, apiToken);
    setTestResult(result);

    if (result.success) {
      const desks = await getAvailableServiceDesks(siteUrl.replace(/\/$/, ""), email, apiToken);
      setServiceDesks(desks);
      if (desks.length === 1 && !serviceDeskId) {
        setServiceDeskId(desks[0].id);
      }
    }
    setTesting(false);
  }

  async function handleSave() {
    if (!siteUrl || !email || !serviceDeskId) return;
    const token = apiToken || undefined;
    if (!token && !initial.hasToken) return;

    setSaving(true);
    setSaveResult(null);

    const result = await updateJiraConfig(
      siteUrl.replace(/\/$/, ""),
      email,
      token!,
      serviceDeskId
    );
    setSaveResult(result);
    setSaving(false);
  }

  return (
    <div className="rounded-xl border p-6" style={{ backgroundColor: "#141418", borderColor: "#1e1e2a" }}>
      <h2 className="text-lg font-semibold mb-1">Jira Connection</h2>
      <p className="text-sm mb-6" style={{ color: "#64748b" }}>
        Connect your Atlassian Jira Service Management instance.
      </p>

      <div className="space-y-4">
        <SettingsField label="Jira Site URL" description="e.g. https://yoursite.atlassian.net">
          <input
            type="url"
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            placeholder="https://yoursite.atlassian.net"
            className="settings-input"
          />
        </SettingsField>

        <SettingsField label="Email" description="The email associated with your API token">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@yourcompany.com"
            className="settings-input"
          />
        </SettingsField>

        <SettingsField label="API Token" description={initial.hasToken ? "Token is set. Enter a new one to update." : "Generate one at id.atlassian.com/manage-profile/security/api-tokens"}>
          <input
            type="password"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            placeholder={initial.hasToken ? "••••••••••••" : "Paste your API token"}
            className="settings-input"
          />
        </SettingsField>

        {/* Test connection button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTest}
            disabled={testing || !siteUrl || !email || !apiToken}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all border"
            style={{
              borderColor: "#1e1e2a",
              backgroundColor: testing ? "#1e1e2a" : "transparent",
              color: testing ? "#475569" : "#94a3b8",
            }}
          >
            {testing ? (
              <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Testing...</span>
            ) : (
              "Test Connection"
            )}
          </button>
          {testResult && (
            <span className="flex items-center gap-1.5 text-sm" style={{ color: testResult.success ? "#4ade80" : "#f87171" }}>
              {testResult.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {testResult.success ? "Connection successful" : testResult.error}
            </span>
          )}
        </div>

        {/* Service desk selector */}
        {serviceDesks.length > 0 && (
          <SettingsField label="Service Desk" description="Select which service desk to use">
            <select
              value={serviceDeskId}
              onChange={(e) => setServiceDeskId(e.target.value)}
              className="settings-input"
            >
              <option value="">Select a service desk...</option>
              {serviceDesks.map((sd) => (
                <option key={sd.id} value={sd.id}>{sd.name} (ID: {sd.id})</option>
              ))}
            </select>
          </SettingsField>
        )}

        {!serviceDesks.length && serviceDeskId && (
          <SettingsField label="Service Desk ID" description="The ID of your Jira service desk">
            <input
              type="text"
              value={serviceDeskId}
              onChange={(e) => setServiceDeskId(e.target.value)}
              placeholder="e.g. 7"
              className="settings-input"
            />
          </SettingsField>
        )}

        {/* Save button */}
        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !siteUrl || !email || !serviceDeskId || (!apiToken && !initial.hasToken)}
            className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: saving ? "#1e1e2a" : "#06b6d4",
              color: saving ? "#475569" : "white",
            }}
          >
            {saving ? (
              <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Saving...</span>
            ) : (
              "Save Connection"
            )}
          </button>
          {saveResult && (
            <span className="flex items-center gap-1.5 text-sm" style={{ color: saveResult.success ? "#4ade80" : "#f87171" }}>
              {saveResult.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {saveResult.success ? "✅ Portal is ready" : saveResult.error}
            </span>
          )}
        </div>
      </div>

      <style jsx>{`
        .settings-input {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          outline: none;
          background-color: #0f0f13;
          border: 1px solid #1e1e2a;
          color: #e2e8f0;
          transition: border-color 0.15s;
        }
        .settings-input:focus {
          border-color: #06b6d4;
        }
        .settings-input::placeholder {
          color: #475569;
        }
      `}</style>
    </div>
  );
}

// ─── Branding Tab ────────────────────────────────────────────

function BrandingTab({ initial }: { initial: PortalBranding }) {
  const [name, setName] = useState(initial.name);
  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  async function handleSave() {
    setSaving(true);
    setResult(null);
    const res = await updateBranding(name, primaryColor, logoUrl || null);
    setResult(res);
    setSaving(false);
  }

  return (
    <div className="rounded-xl border p-6" style={{ backgroundColor: "#141418", borderColor: "#1e1e2a" }}>
      <h2 className="text-lg font-semibold mb-1">Branding</h2>
      <p className="text-sm mb-6" style={{ color: "#64748b" }}>
        Customize your portal&apos;s appearance.
      </p>

      <div className="space-y-4">
        <SettingsField label="Portal Name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="settings-input"
          />
        </SettingsField>

        <SettingsField label="Accent Color">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer border-0"
              style={{ backgroundColor: "#0f0f13" }}
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="settings-input flex-1"
              placeholder="#06b6d4"
            />
          </div>
        </SettingsField>

        <SettingsField label="Logo URL" description="Link to your company logo (optional)">
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://yoursite.com/logo.png"
            className="settings-input"
          />
          {logoUrl && (
            <div className="mt-3 p-3 rounded-lg border flex items-center gap-3" style={{ borderColor: "#1e1e2a", backgroundColor: "#0f0f13" }}>
              <img src={logoUrl} alt="Logo preview" className="w-10 h-10 rounded object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <span className="text-xs" style={{ color: "#64748b" }}>Logo preview</span>
            </div>
          )}
        </SettingsField>

        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !name}
            className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{ backgroundColor: saving ? "#1e1e2a" : "#06b6d4", color: saving ? "#475569" : "white" }}
          >
            {saving ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Saving...</span> : "Save Branding"}
          </button>
          {result && (
            <span className="flex items-center gap-1.5 text-sm" style={{ color: result.success ? "#4ade80" : "#f87171" }}>
              {result.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {result.success ? "Saved! Refresh to see changes." : result.error}
            </span>
          )}
        </div>
      </div>

      <style jsx>{`
        .settings-input {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          outline: none;
          background-color: #0f0f13;
          border: 1px solid #1e1e2a;
          color: #e2e8f0;
          transition: border-color 0.15s;
        }
        .settings-input:focus { border-color: #06b6d4; }
        .settings-input::placeholder { color: #475569; }
      `}</style>
    </div>
  );
}

// ─── Request Types Tab ───────────────────────────────────────

function RequestTypesTab() {
  const [types, setTypes] = useState<AdminRequestType[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  async function loadTypes() {
    setLoading(true);
    const data = await getAdminRequestTypes();
    // Sort by displayOrder
    data.sort((a, b) => a.displayOrder - b.displayOrder);
    setTypes(data);
    setLoading(false);
  }

  async function handleToggle(rt: AdminRequestType) {
    setUpdating(rt.jiraId);
    await updateRequestTypeVisibility(rt.jiraId, !rt.enabled, rt.displayName, rt.displayOrder);
    setTypes((prev) =>
      prev?.map((t) => (t.jiraId === rt.jiraId ? { ...t, enabled: !t.enabled } : t)) ?? null
    );
    setUpdating(null);
  }

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  async function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex || !types) return;

    const updated = [...types];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(targetIndex, 0, moved);

    // Update displayOrder to match new positions
    const reordered = updated.map((t, i) => ({ ...t, displayOrder: i }));
    setTypes(reordered);
    setDragIndex(null);
    setDragOverIndex(null);

    // Persist to DB
    setSavingOrder(true);
    await updateRequestTypeOrder(
      reordered.map((t) => ({ jiraId: t.jiraId, displayOrder: t.displayOrder }))
    );
    setSavingOrder(false);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  // Load on first render
  useEffect(() => {
    loadTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-xl border p-6" style={{ backgroundColor: "#141418", borderColor: "#1e1e2a" }}>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold">Request Types</h2>
        {savingOrder && (
          <span className="flex items-center gap-1.5 text-xs" style={{ color: "#64748b" }}>
            <Loader2 size={12} className="animate-spin" /> Saving order...
          </span>
        )}
      </div>
      <p className="text-sm mb-6" style={{ color: "#64748b" }}>
        Drag to reorder. Toggle to show/hide on your portal.
      </p>

      {loading && (
        <div className="flex items-center gap-2 py-8 justify-center" style={{ color: "#64748b" }}>
          <Loader2 size={16} className="animate-spin" /> Loading request types from Jira...
        </div>
      )}

      {types && types.length === 0 && (
        <p className="text-sm py-8 text-center" style={{ color: "#64748b" }}>
          No request types found. Make sure your Jira connection is configured.
        </p>
      )}

      {types && types.length > 0 && (
        <div className="space-y-2">
          {types.map((rt, index) => (
            <div
              key={rt.jiraId}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              className="flex items-center gap-3 p-4 rounded-lg border transition-all"
              style={{
                borderColor: dragOverIndex === index ? "#06b6d4" : "#1e1e2a",
                backgroundColor: dragIndex === index
                  ? "rgba(6,182,212,0.08)"
                  : rt.enabled
                    ? "rgba(6,182,212,0.04)"
                    : "#0f0f13",
                opacity: dragIndex === index ? 0.5 : rt.enabled ? 1 : 0.6,
                cursor: "grab",
              }}
            >
              {/* Drag handle */}
              <div className="flex flex-col gap-0.5" style={{ color: "#475569" }}>
                <div className="w-4 flex flex-col items-center gap-[3px]">
                  <div className="w-3 h-[2px] rounded" style={{ backgroundColor: "#475569" }} />
                  <div className="w-3 h-[2px] rounded" style={{ backgroundColor: "#475569" }} />
                  <div className="w-3 h-[2px] rounded" style={{ backgroundColor: "#475569" }} />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{rt.name}</div>
                {rt.description && (
                  <div className="text-xs mt-0.5 truncate" style={{ color: "#64748b" }}>{rt.description}</div>
                )}
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); handleToggle(rt); }}
                disabled={updating === rt.jiraId}
                className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
                style={{ backgroundColor: rt.enabled ? "#06b6d4" : "#1e1e2a" }}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 rounded-full transition-transform"
                  style={{
                    backgroundColor: "white",
                    transform: rt.enabled ? "translateX(22px)" : "translateX(2px)",
                  }}
                />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Users Tab ───────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<PortalUserInfo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"user" | "manager" | "admin">("user");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  async function loadUsers() {
    setLoading(true);
    const data = await getPortalUsers();
    setUsers(data);
    setLoading(false);
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError("");
    const result = await inviteUser(inviteEmail, inviteRole);
    if (result.success) {
      setInviteEmail("");
      loadUsers();
    } else {
      setInviteError(result.error ?? "Failed to invite user.");
    }
    setInviting(false);
  }

  async function handleRemove(userId: string) {
    const result = await removeUser(userId);
    if (result.success) {
      setUsers((prev) => prev?.filter((u) => u.id !== userId) ?? null);
    }
  }

  async function handleRoleChange(userId: string, role: "user" | "manager" | "admin") {
    const result = await updateUserRole(userId, role);
    if (result.success) {
      setUsers((prev) =>
        prev?.map((u) => (u.id === userId ? { ...u, role } : u)) ?? null
      );
    }
  }

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-xl border p-6" style={{ backgroundColor: "#141418", borderColor: "#1e1e2a" }}>
      <h2 className="text-lg font-semibold mb-1">Portal Users</h2>
      <p className="text-sm mb-6" style={{ color: "#64748b" }}>
        Invite users and manage their roles.
      </p>

      {/* Invite form */}
      <div className="flex gap-2 mb-6">
        <input
          type="email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleInvite()}
          placeholder="email@company.com"
          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
          style={{ backgroundColor: "#0f0f13", border: "1px solid #1e1e2a", color: "#e2e8f0" }}
        />
        <select
          value={inviteRole}
          onChange={(e) => setInviteRole(e.target.value as "user" | "manager" | "admin")}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ backgroundColor: "#0f0f13", border: "1px solid #1e1e2a", color: "#e2e8f0" }}
        >
          <option value="user">User</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
        <button
          onClick={handleInvite}
          disabled={inviting || !inviteEmail.trim()}
          className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5"
          style={{ backgroundColor: "#06b6d4", color: "white" }}
        >
          {inviting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Invite
        </button>
      </div>
      {inviteError && (
        <p className="text-sm mb-4" style={{ color: "#f87171" }}>{inviteError}</p>
      )}

      {/* User list */}
      {loading && (
        <div className="flex items-center gap-2 py-8 justify-center" style={{ color: "#64748b" }}>
          <Loader2 size={16} className="animate-spin" /> Loading users...
        </div>
      )}

      {users && users.length > 0 && (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: "#1e1e2a" }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid #1e1e2a" }}>
                {["User", "Role", "Invited", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium" style={{ color: "#475569" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? "1px solid #1a1a22" : "none" }}>
                  <td className="px-4 py-3">
                    <div className="text-sm">{u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email}</div>
                    {u.firstName && <div className="text-xs mt-0.5" style={{ color: "#475569" }}>{u.email}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as "user" | "manager" | "admin")}
                      className="px-2 py-1 rounded text-xs outline-none"
                      style={{ backgroundColor: "#0f0f13", border: "1px solid #1e1e2a", color: "#94a3b8" }}
                    >
                      <option value="user">User</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#64748b" }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleRemove(u.id)}
                      className="p-1.5 rounded hover:bg-white/5 transition-colors"
                      style={{ color: "#475569" }}
                      title="Remove user"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Shared Components ───────────────────────────────────────

function SettingsField({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: "#94a3b8" }}>
        {label}
      </label>
      {description && (
        <p className="text-xs mb-2" style={{ color: "#475569" }}>
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
