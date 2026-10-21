import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type Chat = {
  other_id: string;
  handle: string;
  display_name: string;
  photo_path: string | null;
  last_body: string;
  last_at: string;
  last_from_me: boolean;
  unread: number;
};

export type Message = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string };

export const MESSAGE_COLUMNS = "id, sender_id, recipient_id, body, created_at";
const THREAD_LIMIT = 200;

export async function getInbox(supabase: Client) {
  const { data } = await supabase.rpc("get_inbox");
  return (data ?? []) as Chat[];
}

/** The latest messages between me and `other`, oldest first. */
export async function getThread(supabase: Client, me: string, other: string) {
  const { data } = await supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .or(`and(sender_id.eq.${me},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${me})`)
    .order("created_at", { ascending: false })
    .limit(THREAD_LIMIT);
  return ((data ?? []) as Message[]).reverse();
}

export async function countUnreadMessages(supabase: Client, me: string) {
  const { count } = await supabase.from("messages").select("id", { count: "exact", head: true }).eq("recipient_id", me).is("read_at", null);
  return count ?? 0;
}
