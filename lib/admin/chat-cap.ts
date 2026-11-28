// The weekly limit on automatic chats from the Peerpop account, so members never feel spammed.
// Pure parts are exported for tests; recentChats reads the database.
import type { createAdminClient } from "@/lib/supabase/admin";

/** At most this many automatic Peerpop chats per member in any 7 days. */
export const WEEKLY_CHAT_CAP = 3;
const WEEK = 7 * 24 * 60 * 60 * 1000;
/** Messages sent to someone within this gap count as one chat (like the welcome and first Jodis). */
const SAME_CHAT = 10 * 60 * 1000;

/**
 * Most important first. Welcome + first Jodis always go out. The lowest kinds (nudges, collab-idea
 * matches) stop one chat early, so a check-in or a Jodi list can still get through that week.
 */
export type ChatKind = "welcome" | "checkin" | "list" | "nudge" | "idea";
const LIMIT: Record<ChatKind, number> = { welcome: Infinity, checkin: WEEKLY_CHAT_CAP, list: WEEKLY_CHAT_CAP, nudge: WEEKLY_CHAT_CAP - 1, idea: WEEKLY_CHAT_CAP - 1 };

export function canSendChat(chatsThisWeek: number, kind: ChatKind) {
  return chatsThisWeek < LIMIT[kind];
}

/** Counts chats per member from (recipient, time) pairs, joining messages sent minutes apart into one. */
export function countChats(sent: { recipient_id: string; created_at: string }[]) {
  const times = new Map<string, number[]>();
  for (const m of sent) times.set(m.recipient_id, [...(times.get(m.recipient_id) ?? []), Date.parse(m.created_at)]);
  const counts = new Map<string, number>();
  for (const [id, ts] of times) {
    ts.sort((a, b) => a - b);
    counts.set(id, ts.filter((t, i) => i === 0 || t - ts[i - 1] > SAME_CHAT).length);
  }
  return counts;
}

/** How many Peerpop chats each member got in the last 7 days (any message from the Peerpop account). */
export async function recentChats(db: ReturnType<typeof createAdminClient>, officialId: string, now: number) {
  const { data } = await db
    .from("messages")
    .select("recipient_id, created_at")
    .eq("sender_id", officialId)
    .gte("created_at", new Date(now - WEEK).toISOString())
    .limit(50000);
  return countChats((data ?? []) as { recipient_id: string; created_at: string }[]);
}
