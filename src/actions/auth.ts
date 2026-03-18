"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { headers } from "next/headers";

/**
 * Send a magic link to the given email.
 * First verifies the email exists in portal_users (only invited users can log in).
 */
export async function sendMagicLink(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  // Use service role to check portal_users (RLS may block anon)
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: portalUser, error: lookupError } = await service
    .from("portal_users")
    .select("id, role, portal_id")
    .eq("email", normalizedEmail)
    .single();

  if (lookupError || !portalUser) {
    return {
      success: false,
      error: "This email is not registered for any portal. Contact your administrator.",
    };
  }

  // Send OTP via Supabase Auth
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin") ?? "http://localhost:3000";

  const { error: otpError } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (otpError) {
    return { success: false, error: otpError.message };
  }

  return { success: true };
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

/**
 * Get the current authenticated user's portal info.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<{
  email: string;
  role: "user" | "manager" | "admin";
  portalId: string;
  jiraOrgId: string | null;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  // Look up portal_users with service role
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: portalUser } = await service
    .from("portal_users")
    .select("role, portal_id, jira_org_id")
    .eq("email", user.email.toLowerCase())
    .single();

  if (!portalUser) return null;

  return {
    email: user.email,
    role: portalUser.role,
    portalId: portalUser.portal_id,
    jiraOrgId: portalUser.jira_org_id,
  };
}
