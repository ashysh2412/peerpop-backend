import "server-only";
import { getAdminOverview } from "@/lib/admin/data";
import { officialSender } from "@/lib/admin/official";
import { createAdminClient } from "@/lib/supabase/admin";
import { jodiMessage, pairKey, pickJodiPairs, type JodiCandidate, type JodiPair } from "./match";

const DAY = 24 * 60 * 60 * 1000;
/** Pairs sent each evening, so replies stay easy to follow. */
export const JODI_PER_DAY = 10;
/** Days before someone can get their next Jodi. */
export const JODI_WAIT_DAYS = 7;
/** Members who haven't signed in for this long are skipped. */
const ACTIVE_DAYS = 30;
/** Only members who joined on or after this date get a Jodi; null means everyone. */
export const JODI_ONLY_JOINED_AFTER: string | null = null;

export type JodiPlan = {
  /** False until the jodi_suggestions table exists (SQL 23). Nothing is sent before that. */
  ready: boolean;
  pairs: (JodiPair & { messages: [string, string] })[];
  eligible: number;
  past: { a: string; b: string; at: string; connected: boolean }[];
};

/** Works out tonight's pairs without sending anything. */
export async function planJodis(now: number): Promise<JodiPlan> {
  const db = createAdminClient();
  const [official, { users }, rows, cities, links, blocks, past] = await Promise.all([
    officialSender(db),
    getAdminOverview(now),
    db.from("creator_search_rows").select("user_id, niches, max_followers").limit(20000),
    db.from("cities").select("slug, name"),
    db.from("connections").select("from_user, to_user, status").in("status", ["pending", "accepted"]).limit(50000),
    db.from("blocks").select("blocker_id, blocked_id").limit(20000),
    db.from("jodi_suggestions").select("user_a, user_b, created_at").order("created_at", { ascending: false }).limit(20000),
  ]);
  const ready = !past.error;
  const stats = new Map((rows.data ?? []).map((r) => [r.user_id as string, r]));
  const cityName = new Map((cities.data ?? []).map((c) => [c.slug as string, c.name as string]));
  const accepted = new Set((links.data ?? []).filter((l) => l.status === "accepted").map((l) => pairKey(l.from_user, l.to_user)));

  const avoid = new Set<string>([
    ...(links.data ?? []).map((l) => pairKey(l.from_user, l.to_user)),
    ...(blocks.data ?? []).map((b) => pairKey(b.blocker_id, b.blocked_id)),
    ...(past.data ?? []).map((s) => pairKey(s.user_a, s.user_b)),
  ]);
  const busy = new Set(
    (past.data ?? []).filter((s) => now - Date.parse(s.created_at) < JODI_WAIT_DAYS * DAY).flatMap((s) => [s.user_a as string, s.user_b as string]),
  );

  const people: JodiCandidate[] = users
    .filter(
      (u) =>
        u.id !== official.id &&
        !official.blocked.has(u.id) &&
        !!u.handle &&
        now - Date.parse(u.joined) > DAY &&
        !!u.lastSeen &&
        now - Date.parse(u.lastSeen) < ACTIVE_DAYS * DAY &&
        (!JODI_ONLY_JOINED_AFTER || Date.parse(u.joined) >= Date.parse(JODI_ONLY_JOINED_AFTER)) &&
        stats.has(u.id),
    )
    .map((u) => {
      const s = stats.get(u.id)!;
      return {
        id: u.id,
        name: u.name,
        handle: u.handle!,
        city: u.city,
        cityName: u.city ? (cityName.get(u.city) ?? null) : null,
        niches: (s.niches as string[] | null) ?? [],
        followers: Number(s.max_followers ?? 0),
        connections: u.connections,
        joined: u.joined,
      };
    });

  const pairs = pickJodiPairs(people, { busy, avoid, maxPairs: JODI_PER_DAY }).map((pair) => ({
    ...pair,
    messages: [jodiMessage(pair, pair.a.id), jodiMessage(pair, pair.b.id)] as [string, string],
  }));
  const handle = new Map(users.map((u) => [u.id, u.handle ?? u.name ?? "?"]));
  return {
    ready,
    pairs,
    eligible: people.filter((p) => p.niches.length && p.followers > 0).length,
    past: (past.data ?? []).slice(0, 50).map((s) => ({
      a: handle.get(s.user_a) ?? "?",
      b: handle.get(s.user_b) ?? "?",
      at: s.created_at,
      connected: accepted.has(pairKey(s.user_a, s.user_b)),
    })),
  };
}

/** Daily: saves tonight's pairs and sends both people a chat from the Peerpop account. */
export async function sendAutoJodis(now: number): Promise<number> {
  const plan = await planJodis(now);
  if (!plan.ready || plan.pairs.length === 0) return 0;
  const db = createAdminClient();
  const official = await officialSender(db);
  if (!official.id) return 0;
  let sent = 0;
  for (const pair of plan.pairs) {
    // Saving the pair first means a retry can never message the same pair twice.
    const { error } = await db.from("jodi_suggestions").insert({ user_a: pair.a.id, user_b: pair.b.id });
    if (error) {
      console.error("jodi save", error);
      continue;
    }
    const { error: msgError } = await db.from("messages").insert([
      { sender_id: official.id, recipient_id: pair.a.id, body: pair.messages[0] },
      { sender_id: official.id, recipient_id: pair.b.id, body: pair.messages[1] },
    ]);
    if (msgError) console.error("jodi message", msgError);
    else sent++;
  }
  return sent;
}
