"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

function LoadingSpinner() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#0f0f13" }}
    >
      <div className="flex items-center gap-3">
        <Loader2 className="animate-spin" size={20} style={{ color: "#06b6d4" }} />
        <span className="text-sm" style={{ color: "#94a3b8" }}>
          Signing you in...
        </span>
      </div>
    </div>
  );
}

/**
 * Auth callback — handles both PKCE (code) and implicit (hash) flows.
 */
function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = createClient();

    async function handleAuth() {
      // 1. Try PKCE flow (code in query params)
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          router.push("/portal");
          router.refresh();
          return;
        }
      }

      // 2. Try implicit flow (tokens in hash fragment)
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!error) {
            router.push("/portal");
            router.refresh();
            return;
          }
        }
      }

      // 3. Check if session already exists
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push("/portal");
        router.refresh();
        return;
      }

      // No valid auth
      router.push("/?error=auth");
    }

    handleAuth();
  }, [router, searchParams]);

  return <LoadingSpinner />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AuthCallbackHandler />
    </Suspense>
  );
}
