import "server-only";
import { getAdminOverview } from "@/lib/admin/data";
import { welcomeRecipients } from "@/lib/admin/auto-welcome";
import { personalise, WELCOME_TEXT } from "@/lib/admin/broadcast";
import { canSendChat, recentChats } from "@/lib/admin/chat-cap";
import { officialSender } from "@/lib/admin/official";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMatchable, jodiOfferMessage, lockedJodiMessage, pairKey, pickJodiOffers, pickStarterJodis, starterJodiMessage, type JodiCandidate, type JodiOffer } from "./match";

const DAY = 24 * 60 * 60 * 1000;
/** Members who get a Jodi list each run (twice a day), so replies stay easy to follow. */
export const JODI_PER_DAY = 20;
/** Partner options in one message; more are always on Home. */
export const JODI_OPTIONS = 5;
/** Times one creator can be shown as an option in a night, so nobody is flooded. */
const MAX_SHOWN = 4;
/** Rows saved before this were two-way pairs (both people messaged); after it, user_a is the person messaged. */
export const LISTS_FROM = Date.parse("2026-11-28T00:00:00Z");
/** Days before someone can get their next Jodi. */
export const JODI_WAIT_DAYS = 7;
/** New members get their first Jodis right after the welcome chat. Off until checked on Admin. */
export const STARTER_JODI_ON = true;
/** The welcome and first Jodis go out the moment someone signs up, instead of at 7:30 PM. Off until checked on Admin. */
export const INSTANT_WELCOME_ON = true;
/** Jodis in a new member's first message. */
const STARTER_OPTIONS = 3;
/** Members who haven't signed in for this long are skipped. */
const ACTIVE_DAYS = 30;
/** Only members who joined on or after this date get a Jodi; null means everyone. */
export const JODI_ONLY_JOINED_AFTER: string | null = null;

export type JodiPlan = {
  /** False until the jodi_suggestions table exists (SQL 23). Nothing is sent before that. */
  ready: boolean;
  offers: (JodiOffer & { message: string })[];
  /** New members getting the welcome tonight, with their first Jodis. */
  starters: (JodiOffer & { message: string })[];
  /** What someone signing up right now (nothing filled in yet) would get. */
  sample: string | null;
  eligible: number;
  past: { a: string; b: string; at: string; connected: boolean }[];
  /** Every Jodi suggested so far: how many pairs connected, and how many have a request waiting. */
  stats: { suggested: number; connected: number; requested: number };
  /** Members held back from a list this run because they hit the weekly chat limit. */
  capped: number;
};

/** Works out the next run's Jodi lists without sending anything. `newIds` are tonight's welcome recipients. */
export async function planJodis(now: number, newIds?: string[]): Promise<JodiPlan> {
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
  const requested = new Set((links.data ?? []).filter((l) => l.status === "pending").map((l) => pairKey(l.from_user, l.to_user)));
  const suggestedPairs = new Set((past.data ?? []).map((s) => pairKey(s.user_a, s.user_b)));
  const jodiStats = {
    suggested: suggestedPairs.size,
    connected: [...suggestedPairs].filter((k) => accepted.has(k)).length,
    requested: [...suggestedPairs].filter((k) => requested.has(k)).length,
  };

  const avoid = new Set<string>([
    ...(links.data ?? []).map((l) => pairKey(l.from_user, l.to_user)),
    ...(blocks.data ?? []).map((b) => pairKey(b.blocker_id, b.blocked_id)),
    ...(past.data ?? []).map((s) => pairKey(s.user_a, s.user_b)),
  ]);
  // Whoever was messaged in the last week waits for their next list.
  const busy = new Set(
    (past.data ?? [])
      .filter((s) => now - Date.parse(s.created_at) < JODI_WAIT_DAYS * DAY)
      .flatMap((s) => (Date.parse(s.created_at) < LISTS_FROM ? [s.user_a as string, s.user_b as string] : [s.user_a as string])),
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

  // The weekly limit on Peerpop chats: people at it wait for next week's list.
  const chats = official.id ? await recentChats(db, official.id, now) : new Map<string, number>();
  const capped = people.filter((p) => !busy.has(p.id) && !canSendChat(chats.get(p.id) ?? 0, "list")).map((p) => p.id);
  const offers = pickJodiOffers(people, { busy: new Set([...busy, ...capped]), avoid, maxPairs: JODI_PER_DAY, perPerson: JODI_OPTIONS, maxShown: MAX_SHOWN }).map((offer) => ({
    ...offer,
    message: jodiOfferMessage(offer),
  }));
  // A new member's own details, even before they appear in search.
  const asCandidate = (id: string): JodiCandidate | null => {
    const u = users.find((x) => x.id === id);
    if (!u?.handle) return null;
    const s = stats.get(id);
    return {
      id,
      name: u.name,
      handle: u.handle,
      city: u.city,
      cityName: u.city ? (cityName.get(u.city) ?? null) : null,
      niches: (s?.niches as string[] | null) ?? [],
      followers: Number(s?.max_followers ?? 0),
      connections: u.connections,
      joined: u.joined,
    };
  };
  const welcomeIds = newIds ?? welcomeRecipients(users, official, now).map((p) => p.id);
  // Without a niche and a follower count we can't match well, so their Jodis stay locked until they add them.
  const waiting = Math.min(STARTER_OPTIONS, people.filter((p) => p.niches.length && p.followers > 0).length);
  const firstJodis = (me: JodiCandidate): (JodiOffer & { message: string }) | null => {
    if (!isMatchable(me)) return waiting ? { to: me, options: [], message: lockedJodiMessage(me.name, waiting) } : null;
    const offer = pickStarterJodis(me, people, avoid, STARTER_OPTIONS);
    return offer ? { ...offer, message: starterJodiMessage(offer) } : null;
  };
  const starters = welcomeIds
    .map(asCandidate)
    .map((me) => (me ? firstJodis(me) : null))
    .filter((o) => o !== null);
  const fresh: JodiCandidate = { id: "sample", name: "Riya", handle: "riya", city: null, cityName: null, niches: [], followers: 0, connections: 0, joined: new Date(now).toISOString() };
  const sampleOffer = firstJodis(fresh);
  const handle = new Map(users.map((u) => [u.id, u.handle ?? u.name ?? "?"]));
  return {
    ready,
    offers,
    stats: jodiStats,
    capped: capped.length,
    starters,
    sample: sampleOffer?.message ?? null,
    eligible: people.filter((p) => p.niches.length && p.followers > 0).length,
    past: (past.data ?? []).slice(0, 50).map((s) => ({
      a: handle.get(s.user_a) ?? "?",
      b: handle.get(s.user_b) ?? "?",
      at: s.created_at,
      connected: accepted.has(pairKey(s.user_a, s.user_b)),
    })),
  };
}

/** Twice a day: saves this run's Jodi lists and sends each member theirs as a chat from the Peerpop account. */
export async function sendAutoJodis(now: number): Promise<number> {
  const plan = await planJodis(now);
  if (!plan.ready || plan.offers.length === 0) return 0;
  const db = createAdminClient();
  const official = await officialSender(db);
  if (!official.id) return 0;
  let sent = 0;
  for (const offer of plan.offers) {
    // Saving first means a retry can never suggest the same two people twice.
    const { data: saved, error } = await db
      .from("jodi_suggestions")
      .insert(offer.options.map((o) => ({ user_a: offer.to.id, user_b: o.b.id })))
      .select("id");
    if (error || !saved?.length) {
      console.error("jodi save", error);
      continue;
    }
    const { error: msgError } = await db.from("messages").insert({ sender_id: official.id, recipient_id: offer.to.id, body: offer.message });
    if (msgError) console.error("jodi message", msgError);
    else sent++;
  }
  return sent;
}

/** A new member's first Jodis, worked out before their welcome goes out. */
export async function planStarterJodis(now: number, ids: string[]) {
  const plan = await planJodis(now, ids);
  return plan.ready ? plan.starters : [];
}

/** Sends each new member their first Jodis, right after the welcome chat. */
export async function sendStarterJodis(starters: JodiPlan["starters"]): Promise<number> {
  const db = createAdminClient();
  const official = await officialSender(db);
  if (!official.id) return 0;
  let sent = 0;
  for (const offer of starters) {
    // A locked teaser has no options to remember.
    const { error } = offer.options.length
      ? await db.from("jodi_suggestions").insert(offer.options.map((o) => ({ user_a: offer.to.id, user_b: o.b.id })))
      : { error: null };
    if (error) {
      console.error("starter jodi save", error);
      continue;
    }
    const { error: msgError } = await db.from("messages").insert({ sender_id: official.id, recipient_id: offer.to.id, body: offer.message });
    if (msgError) console.error("starter jodi message", msgError);
    else sent++;
  }
  return sent;
}

/**
 * Right after someone signs up: the Peerpop welcome chat, then their first Jodis.
 * Skips anyone Peerpop already wrote to, so the evening run never repeats it.
 */
export async function welcomeNewMember(userId: string, now: number) {
  if (!INSTANT_WELCOME_ON) return;
  const db = createAdminClient();
  const official = await officialSender(db);
  if (!official.id || official.id === userId || official.blocked.has(userId) || official.messaged.has(userId)) return;
  const { data: me } = await db.from("creator_profiles").select("display_name").eq("user_id", userId).maybeSingle();
  const starters = await planStarterJodis(now, [userId]);
  const { error } = await db
    .from("messages")
    .insert({ sender_id: official.id, recipient_id: userId, body: personalise(WELCOME_TEXT, (me?.display_name as string | undefined) ?? null) });
  if (error) throw error;
  if (starters.length) await sendStarterJodis(starters);
}
