import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

/**
 * Server-only client with the secret key. It bypasses row-level security, so
 * use it only for writes the database reserves for the server, such as
 * marking a channel verified, and always scope queries to the signed-in user.
 */
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("Missing SUPABASE_SECRET_KEY.");
  return createClient(supabaseEnv().url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
