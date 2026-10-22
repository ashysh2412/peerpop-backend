import type { SupabaseClient } from "@supabase/supabase-js";

/** Emails allowed into /admin, from the ADMIN_EMAILS setting (comma-separated). */
export function isAdminEmail(email: string | null | undefined, list = process.env.ADMIN_EMAILS ?? "") {
  if (!email) return false;
  const allowed = list
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

/**
 * True only for an admin email that Supabase has confirmed. Asks Supabase Auth
 * directly instead of trusting the session token, so a sign-up that merely
 * claims the admin's email never gets in.
 */
export async function isConfirmedAdmin(supabase: SupabaseClient) {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  return !!user?.email_confirmed_at && isAdminEmail(user.email);
}
