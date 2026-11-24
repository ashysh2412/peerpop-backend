import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";

/** The official account (the "Peerpop" profile), everyone it can't message because of a block, and everyone it already messaged. */
export async function officialSender(db: ReturnType<typeof createAdminClient>) {
  const { data } = await db.from("official_accounts").select("user_id").order("created_at").limit(1).maybeSingle();
  const id = (data?.user_id as string | undefined) ?? null;
  if (!id) return { id: null, blocked: new Set<string>(), messaged: new Set<string>() };
  const [{ data: blocks }, { data: sent }] = await Promise.all([
    db.from("blocks").select("blocker_id, blocked_id").or(`blocker_id.eq.${id},blocked_id.eq.${id}`),
    db.from("messages").select("recipient_id").eq("sender_id", id).limit(20000),
  ]);
  return {
    id,
    blocked: new Set((blocks ?? []).map((b) => (b.blocker_id === id ? b.blocked_id : b.blocker_id) as string)),
    // Everyone the Peerpop account has already written to, so "new members" skips them.
    messaged: new Set((sent ?? []).map((m) => m.recipient_id as string)),
  };
}
