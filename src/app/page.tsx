"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Layers, ArrowRight, Building2, Loader2 } from "lucide-react";
import { sendMagicLink } from "@/actions/auth";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Handle hash-based auth tokens (implicit flow fallback)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      const supabase = createClient();
      // Supabase client auto-detects hash tokens and sets session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          router.push("/portal");
          router.refresh();
        }
      });
    }
  }, [router]);

  async function handleSendLink() {
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    const result = await sendMagicLink(email);

    if (result.success) {
      setSent(true);
    } else {
      setError(result.error ?? "Something went wrong");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: '#0f0f13' }}>

      {/* Clientry branding */}
      <div className="flex flex-col items-center mb-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: '#06b6d4' }}>
            <Layers size={22} color="white" />
          </div>
          <span className="text-2xl font-bold tracking-tight" style={{ color: '#e2e8f0' }}>
            Clientry
          </span>
        </div>
        <p className="text-sm" style={{ color: '#64748b' }}>Your client portal</p>
      </div>

      {/* Main card */}
      <div className="w-full max-w-md rounded-2xl p-8 border"
        style={{ backgroundColor: '#141418', borderColor: '#1e1e2a' }}>

        {/* Client branding */}
        <div className="flex items-center gap-3 mb-8 pb-6 border-b" style={{ borderColor: '#1e1e2a' }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#1e1e2a' }}>
            <Building2 size={20} style={{ color: '#06b6d4' }} />
          </div>
          <div>
            <div className="font-semibold text-sm">Acme Corp</div>
            <div className="text-xs" style={{ color: '#64748b' }}>Implementation Portal</div>
          </div>
        </div>

        <h1 className="text-xl font-semibold mb-1">Sign in to your portal</h1>
        <p className="text-sm mb-6" style={{ color: '#64748b' }}>
          We&apos;ll send you a secure magic link to your email
        </p>

        {!sent ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#94a3b8' }}>
                Email address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#64748b' }} />
                <input
                  type="email"
                  placeholder="you@acmecorp.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendLink()}
                  className="w-full pl-10 pr-4 py-3 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    backgroundColor: '#0f0f13',
                    border: '1px solid #1e1e2a',
                    color: '#e2e8f0',
                  }}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>
            )}

            <button
              onClick={handleSendLink}
              disabled={loading || !email.trim()}
              className="w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all"
              style={{
                backgroundColor: loading || !email.trim() ? '#1e1e2a' : '#06b6d4',
                color: loading || !email.trim() ? '#475569' : 'white',
              }}>
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  Send magic link
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'rgba(6,182,212,0.15)' }}>
              <Mail size={24} style={{ color: '#06b6d4' }} />
            </div>
            <p className="font-medium mb-1">Check your inbox</p>
            <p className="text-sm" style={{ color: '#64748b' }}>
              We sent a link to <span style={{ color: '#06b6d4' }}>{email}</span>
            </p>
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              className="mt-4 text-xs"
              style={{ color: '#64748b' }}>
              Use a different email
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ backgroundColor: '#1e1e2a' }} />
          <span className="text-xs" style={{ color: '#475569' }}>or jump straight in</span>
          <div className="flex-1 h-px" style={{ backgroundColor: '#1e1e2a' }} />
        </div>

        {/* Demo shortcuts */}
        <div className="space-y-3">
          <button
            onClick={() => router.push('/portal')}
            className="w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all border"
            style={{
              backgroundColor: 'rgba(6,182,212,0.08)',
              borderColor: 'rgba(6,182,212,0.25)',
              color: '#06b6d4'
            }}>
            Demo: Enter as End User
          </button>
          <button
            onClick={() => router.push('/portal/manager')}
            className="w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all border"
            style={{
              backgroundColor: 'rgba(148,163,184,0.06)',
              borderColor: '#1e1e2a',
              color: '#94a3b8'
            }}>
            Demo: Enter as Manager
          </button>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs" style={{ color: '#334155' }}>
        Powered by Clientry
      </p>
    </div>
  );
}
