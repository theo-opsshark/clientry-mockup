"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Layers } from "lucide-react";
import { updateUserName } from "@/actions/auth";

export default function WelcomePage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;

    setSaving(true);
    setError("");
    const result = await updateUserName(firstName, lastName);

    if (result.success) {
      router.push("/portal");
      router.refresh();
    } else {
      setError(result.error ?? "Something went wrong.");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0f0f13" }}>
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: "#141418", border: "1px solid #1e1e2a" }}>
            <Layers size={20} style={{ color: "#06b6d4" }} />
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome!</h1>
          <p className="text-sm" style={{ color: "#64748b" }}>
            Let&apos;s get your profile set up. This will only take a moment.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#94a3b8" }}>
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Enter your first name"
              autoFocus
              className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-colors"
              style={{
                backgroundColor: "#141418",
                border: "1px solid #1e1e2a",
                color: "#e2e8f0",
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#94a3b8" }}>
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Enter your last name"
              className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-colors"
              style={{
                backgroundColor: "#141418",
                border: "1px solid #1e1e2a",
                color: "#e2e8f0",
              }}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={saving || !firstName.trim() || !lastName.trim()}
            className="w-full py-3 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: saving || !firstName.trim() || !lastName.trim() ? "#1e1e2a" : "#06b6d4",
              color: saving || !firstName.trim() || !lastName.trim() ? "#475569" : "white",
            }}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Setting up...
              </span>
            ) : (
              "Continue to Portal"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
