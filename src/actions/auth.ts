"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";


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
  // Use server-configured URL, never trust the client's Origin header
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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
  await supabase.auth.signOut({ scope: "global" });
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
  firstName: string | null;
  lastName: string | null;
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
    .select("role, portal_id, jira_org_id, first_name, last_name")
    .eq("email", user.email.toLowerCase())
    .single();

  if (!portalUser) return null;

  return {
    email: user.email,
    role: portalUser.role,
    portalId: portalUser.portal_id,
    jiraOrgId: portalUser.jira_org_id,
    firstName: portalUser.first_name,
    lastName: portalUser.last_name,
  };
}

/**
 * Update the current user's name (used during welcome flow on first login).
 */
export async function updateUserName(
  firstName: string,
  lastName: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { success: false, error: "Not authenticated." };
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Update name in Supabase
  const { error } = await service
    .from("portal_users")
    .update({ first_name: firstName.trim(), last_name: lastName.trim() })
    .eq("email", user.email.toLowerCase());

  if (error) {
    return { success: false, error: "Failed to update name." };
  }

  // Also create/update the customer in Jira so raiseOnBehalfOf shows their real name
  try {
    const { getJiraConfig } = await import("@/lib/config");
    const { createOrFindCustomer } = await import("@/lib/jira");

    // Look up the user's portal to get Jira config
    const { data: portalUser } = await service
      .from("portal_users")
      .select("portal_id")
      .eq("email", user.email.toLowerCase())
      .single();

    if (portalUser?.portal_id) {
      const config = await getJiraConfig(portalUser.portal_id);
      if (config) {
        const displayName = `${firstName.trim()} ${lastName.trim()}`;
        await createOrFindCustomer(config, user.email, displayName);
        // Non-blocking — if Jira customer creation fails, we still saved the name
      }
    }
  } catch {
    // Jira customer creation is best-effort — don't fail the welcome flow
    console.error("Failed to create Jira customer (non-blocking)");
  }

  return { success: true };
}
