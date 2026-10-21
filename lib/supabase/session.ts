import type { SupabaseClient, User } from "@supabase/supabase-js";

export type SessionUser = Pick<User, "id" | "email" | "user_metadata">;

/**
 * The signed-in user, checked from the session token itself (getClaims) rather
 * than with a call to Supabase Auth on every page. Same shape as auth.getUser().
 */
export async function getSessionUser(supabase: SupabaseClient): Promise<{ data: { user: SessionUser | null } }> {
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return { data: { user: null } };
  return { data: { user: { id: claims.sub, email: claims.email, user_metadata: claims.user_metadata ?? {} } } };
}
