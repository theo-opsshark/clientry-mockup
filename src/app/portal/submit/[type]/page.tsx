"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import PortalSidebar from "@/components/PortalSidebar";
import DynamicFormRenderer from "@/components/DynamicFormRenderer";
import { Bug, Star, MessageCircle, RefreshCw, Upload, ChevronLeft } from "lucide-react";

const formConfig: Record<string, {
  title: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}> = {
  bug: { title: "UAT Bug Report", icon: Bug, color: "#f87171", bg: "rgba(239,68,68,0.1)" },
  feedback: { title: "Feature Feedback", icon: Star, color: "#facc15", bg: "rgba(234,179,8,0.1)" },
  question: { title: "Question / Clarification", icon: MessageCircle, color: "#06b6d4", bg: "rgba(6,182,212,0.1)" },
  change: { title: "Change Request", icon: RefreshCw, color: "#c084fc", bg: "rgba(168,85,247,0.1)" },
};

// ─── UAT Bug Report — Proforma Schema ──────────────────────────────────────────
// In production this would be fetched from the JSM Proforma API.
// Here it's hardcoded to simulate a real schema fetch.

const UAT_BUG_FORM_SCHEMA = {
  id: "form-uat-001",
  title: "UAT Bug Report",
  sections: [
    {
      id: "section-1",
      title: "Bug Details",
      fields: [
        {
          id: "summary",
          type: "short_text" as const,
          label: "Summary",
          description: "A brief one-line description of the bug",
          required: true,
          placeholder: "e.g. Login page not redirecting after SSO",
        },
        {
          id: "severity",
          type: "dropdown" as const,
          label: "Severity",
          required: true,
          options: [
            { value: "critical", label: "Critical — System unusable" },
            { value: "high", label: "High — Major feature broken" },
            { value: "medium", label: "Medium — Feature partially working" },
            { value: "low", label: "Low — Minor issue or cosmetic" },
          ],
        },
        {
          id: "blocker",
          type: "single_choice" as const,
          label: "Is this blocking your UAT progress?",
          required: true,
          options: [
            { value: "yes", label: "Yes — I cannot continue testing" },
            { value: "no", label: "No — I can work around it" },
          ],
          conditional: {
            fieldId: "severity",
            operator: "in" as const,
            values: ["critical", "high"],
          },
        },
        {
          id: "blocker_detail",
          type: "paragraph" as const,
          label: "What are you blocked on?",
          description: "Describe what you cannot do because of this bug",
          required: true,
          placeholder: "I cannot complete the checkout flow because...",
          conditional: {
            fieldId: "blocker",
            operator: "equals" as const,
            values: ["yes"],
          },
        },
      ],
    },
    {
      id: "section-2",
      title: "Reproduction",
      fields: [
        {
          id: "steps",
          type: "paragraph" as const,
          label: "Steps to Reproduce",
          description: "List the exact steps to reproduce this bug",
          required: true,
          placeholder: "1. Navigate to...\n2. Click on...\n3. Observe that...",
        },
        {
          id: "expected",
          type: "paragraph" as const,
          label: "Expected Behavior",
          required: true,
          placeholder: "What should have happened?",
        },
        {
          id: "actual",
          type: "paragraph" as const,
          label: "Actual Behavior",
          required: true,
          placeholder: "What actually happened?",
        },
        {
          id: "browser",
          type: "checkbox_group" as const,
          label: "Browser(s) affected",
          required: false,
          options: [
            { value: "chrome", label: "Chrome" },
            { value: "firefox", label: "Firefox" },
            { value: "safari", label: "Safari" },
            { value: "edge", label: "Edge" },
            { value: "other", label: "Other" },
          ],
        },
        {
          id: "browser_other",
          type: "short_text" as const,
          label: "Other browser",
          required: false,
          placeholder: "Specify browser and version",
          conditional: {
            fieldId: "browser",
            operator: "contains" as const,
            values: ["other"],
          },
        },
      ],
    },
    {
      id: "section-3",
      title: "Additional Information",
      fields: [
        {
          id: "environment",
          type: "dropdown" as const,
          label: "Environment",
          required: true,
          options: [
            { value: "staging", label: "Staging" },
            { value: "uat", label: "UAT" },
            { value: "production", label: "Production" },
          ],
        },
        {
          id: "attachment",
          type: "file_upload" as const,
          label: "Screenshots or attachments",
          description: "Attach screenshots, screen recordings, or log files",
          required: false,
          accept: "image/*,.pdf,.log,.txt",
          multiple: true,
        },
        {
          id: "additional_notes",
          type: "paragraph" as const,
          label: "Additional Notes",
          required: false,
          placeholder: "Anything else we should know?",
        },
      ],
    },
  ],
};

// ─── Static form for non-bug types ─────────────────────────────────────────────

function StaticForm({ type, onSubmit }: { type: string; onSubmit: () => void }) {
  const [form, setForm] = useState({
    summary: "",
    description: "",
    severity: "Medium",
    steps: "",
    expected: "",
    actual: "",
  });
  const [dragging, setDragging] = useState(false);

  const inputStyle = {
    backgroundColor: "#0f0f13",
    border: "1px solid #1e1e2a",
    color: "#e2e8f0",
    borderRadius: "8px",
    padding: "10px 14px",
    width: "100%",
    fontSize: "14px",
    outline: "none",
  };

  const labelStyle = {
    display: "block",
    fontSize: "13px",
    fontWeight: "500" as const,
    color: "#94a3b8",
    marginBottom: "6px",
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-6">
      <div className="rounded-xl p-6 border space-y-5"
        style={{ backgroundColor: "#141418", borderColor: "#1e1e2a" }}>
        <div>
          <label style={labelStyle}>Summary <span style={{ color: "#f87171" }}>*</span></label>
          <input type="text" placeholder="Brief description" value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            style={inputStyle} required />
        </div>
        <div>
          <label style={labelStyle}>Description <span style={{ color: "#f87171" }}>*</span></label>
          <textarea placeholder="Provide a detailed description..." value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4} style={{ ...inputStyle, resize: "vertical" as const }} required />
        </div>
        {(type === "change") && (
          <div>
            <label style={labelStyle}>Priority <span style={{ color: "#f87171" }}>*</span></label>
            <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}
              style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="Critical">🔴 Critical</option>
              <option value="High">🟠 High</option>
              <option value="Medium">🟡 Medium</option>
              <option value="Low">⚪ Low</option>
            </select>
          </div>
        )}
        <div>
          <label style={labelStyle}>Attachments</label>
          <div className="rounded-lg border-2 border-dashed p-8 text-center"
            style={{ borderColor: dragging ? "#06b6d4" : "#1e1e2a", cursor: "pointer" }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={() => setDragging(false)}>
            <Upload size={24} className="mx-auto mb-2" style={{ color: "#475569" }} />
            <p className="text-sm" style={{ color: "#64748b" }}>
              Drop files here or <span style={{ color: "#06b6d4" }}>browse</span>
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end">
        <button type="submit" className="px-6 py-2.5 rounded-lg text-sm font-medium"
          style={{ backgroundColor: "#06b6d4", color: "white" }}>
          Submit Request →
        </button>
      </div>
    </form>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SubmitFormPage() {
  const router = useRouter();
  const params = useParams();
  const type = (params?.type as string) || "bug";
  const config = formConfig[type] || formConfig.bug;
  const Icon = config.icon;

  const handleSubmit = () => {
    router.push("/portal/submit/confirmation");
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#0f0f13" }}>
      <PortalSidebar />

      <main className="flex-1 p-8">
        <div className="max-w-3xl">
          {/* Breadcrumb */}
          <button
            onClick={() => router.push("/portal")}
            className="flex items-center gap-1 text-sm mb-6 transition-colors"
            style={{ color: "#64748b" }}>
            <ChevronLeft size={16} />
            Back to request types
          </button>

          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: config.bg }}>
              <Icon size={24} style={{ color: config.color }} />
            </div>
            <div>
              <h1 className="text-xl font-bold">{config.title}</h1>
              <p className="text-sm" style={{ color: "#64748b" }}>Acme Corp Implementation Portal</p>
            </div>
          </div>

          {/* Dynamic renderer for bugs, static form for others */}
          {type === "bug" ? (
            <DynamicFormRenderer
              schema={UAT_BUG_FORM_SCHEMA}
              onSubmit={handleSubmit}
            />
          ) : (
            <StaticForm type={type} onSubmit={handleSubmit} />
          )}
        </div>
      </main>
    </div>
  );
}
