import "server-only";
import { getAdminOverview } from "@/lib/admin/data";
import { officialSender } from "@/lib/admin/official";
import { pairKey, type JodiCandidate } from "@/lib/jodi/match";
import { createAdminClient } from "@/lib/supabase/admin";
import { IDEA_CHATS_PER_WEEK, IDEA_MATCHES, ideaMatchMessage, pickIdeaMatches } from "./match";

/** Matched creators get a short chat from the Peerpop account. Off until checked on preview. */
export const IDEA_CHATS_ON = false;

const DAY = 24 * 60 * 60 * 1000;
/** Members who haven't signed in for this long aren't matched. */
const ACTIVE_DAYS = 30;

export type IdeaMatchView = {
  user_id: string;
  handle: string;
  name: string;
  photo_path: string | null;
  city: string | null;
  niche: string | null;
  followers: number;
};

type Db = ReturnType<typeof createAdminClient>;

/** Everyone who could be matched (listed, active, with a niche and follower count), plus the author's own details. */
async function load(db: Db, now: number, authorId: string) {
  const [{ users }, rows, cities, blocks, official] = await Promise.all([
    getAdminOverview(now),
    db.from("creator_search_rows").select("user_id, niches, max_followers").limit(20000),
    db.from("cities").select("slug, name"),
    db.from("blocks").select("blocker_id, blocked_id").or(`blocker_id.eq.${authorId},blocked_id.eq.${authorId}`),
    officialSender(db),
  ]);
  const stats = new Map((rows.data ?? []).map((r) => [r.user_id as string, r]));
  const cityName = new Map((cities.data ?? []).map((c) => [c.slug as string, c.name as string]));
  const toCandidate = (u: (typeof users)[number]): JodiCandidate => {
    const s = stats.get(u.id);
    return {
      id: u.id,
      name: u.name,
      handle: u.handle ?? "",
      city: u.city,
      cityName: u.city ? (cityName.get(u.city) ?? null) : null,
      niches: (s?.niches as string[] | null) ?? [],
      followers: Number(s?.max_followers ?? 0),
      connections: u.connections,
      joined: u.joined,
    };
  };
  const author = users.find((u) => u.id === authorId);
  const pool = users
    .filter((u) => u.id !== official.id && !!u.handle && stats.has(u.id) && !!u.lastSeen && now - Date.parse(u.lastSeen) < ACTIVE_DAYS * DAY)
    .map(toCandidate);
  const avoid = new Set((blocks.data ?? []).map((b) => pairKey(b.blocker_id, b.blocked_id)));
  return { author: author ? toCandidate(author) : null, pool, avoid, official };
}

async function ideaPost(db: Db, postId: string) {
  const { data } = await db.from("collab_posts").select("id, title, author_id, niches, city_slug").eq("id", postId).maybeSingle();
  return data as { id: string; title: string; author_id: string; niches: string[]; city_slug: string | null } | null;
}

/** Works out the best creators for an idea, without saving or sending anything. */
async function computeMatches(db: Db, postId: string, now: number) {
  const post = await ideaPost(db, postId);
  if (!post) return null;
  const { author, pool, avoid, official } = await load(db, now, post.author_id);
  if (!author) return null;
  const matches = pickIdeaMatches(author, { niches: post.niches, city: post.city_slug }, pool, avoid, IDEA_MATCHES);
  return { post, author, matches, official };
}

/**
 * Right after an idea is posted: saves its matched creators (so the idea page and their
 * Home show them) and, when switched on, sends each a short chat from the Peerpop account.
 * Nobody gets more than a couple of these a week. Does nothing until SQL 24 has been run.
 */
export async function matchCollabIdea(postId: string, now: number) {
  const db = createAdminClient();
  const found = await computeMatches(db, postId, now);
  if (!found || !found.matches.length) return 0;
  const { post, author, matches, official } = found;
  const { error } = await db
    .from("collab_matches")
    .upsert(matches.map((m) => ({ post_id: post.id, user_id: m.b.id })), { onConflict: "post_id,user_id", ignoreDuplicates: true });
  if (error) return 0; // Table not there yet (SQL 24), or a hiccup: nothing is sent.
  if (!IDEA_CHATS_ON || !official.id) return 0;

  const since = new Date(now - 7 * DAY).toISOString();
  const { data: recent } = await db
    .from("collab_matches")
    .select("user_id")
    .eq("messaged", true)
    .gt("created_at", since)
    .in("user_id", matches.map((m) => m.b.id));
  const count = new Map<string, number>();
  for (const r of recent ?? []) count.set(r.user_id as string, (count.get(r.user_id as string) ?? 0) + 1);

  let sent = 0;
  for (const m of matches) {
    if ((count.get(m.b.id) ?? 0) >= IDEA_CHATS_PER_WEEK || official.blocked.has(m.b.id)) continue;
    // Mark first, so a retry can never send the same chat twice.
    const { data: marked } = await db
      .from("collab_matches")
      .update({ messaged: true })
      .eq("post_id", post.id)
      .eq("user_id", m.b.id)
      .eq("messaged", false)
      .select("id");
    if (!marked?.length) continue;
    const body = ideaMatchMessage({ name: m.b.name }, post, { name: author.name });
    const { error: msgError } = await db.from("messages").insert({ sender_id: official.id, recipient_id: m.b.id, body });
    if (msgError) console.error("idea match message", msgError);
    else sent++;
  }
  return sent;
}

/**
 * The matched creators for the idea page (only its author sees them). Uses the saved
 * matches; for older ideas, or before SQL 24, works them out on the spot.
 */
export async function getIdeaMatches(postId: string, now: number): Promise<IdeaMatchView[]> {
  const db = createAdminClient();
  const { data: saved, error } = await db.from("collab_matches").select("user_id").eq("post_id", postId).order("id");
  let ids = (saved ?? []).map((r) => r.user_id as string);
  let extra = new Map<string, { niche: string | null; followers: number; city: string | null }>();
  if (error || !ids.length) {
    const found = await computeMatches(db, postId, now);
    if (!found) return [];
    ids = found.matches.map((m) => m.b.id);
    extra = new Map(found.matches.map((m) => [m.b.id, { niche: m.shared[0] ?? m.b.niches[0] ?? null, followers: m.b.followers, city: m.b.cityName }]));
  }
  if (!ids.length) return [];
  const [{ data: people }, { data: rows }, { data: cities }] = await Promise.all([
    db.from("creator_profiles").select("user_id, handle, display_name, photo_path, city_slug").in("user_id", ids),
    db.from("creator_search_rows").select("user_id, niches, max_followers").in("user_id", ids),
    db.from("cities").select("slug, name"),
  ]);
  const cityName = new Map((cities ?? []).map((c) => [c.slug as string, c.name as string]));
  const stats = new Map((rows ?? []).map((r) => [r.user_id as string, r]));
  const byId = new Map((people ?? []).map((p) => [p.user_id as string, p]));
  return ids
    .map((id): IdeaMatchView | null => {
      const p = byId.get(id);
      if (!p) return null;
      const s = stats.get(id);
      const e = extra.get(id);
      return {
        user_id: id,
        handle: p.handle as string,
        name: p.display_name as string,
        photo_path: (p.photo_path as string | null) ?? null,
        city: e?.city ?? (p.city_slug ? (cityName.get(p.city_slug as string) ?? null) : null),
        niche: e?.niche ?? ((s?.niches as string[] | null)?.[0] ?? null),
        followers: e?.followers ?? Number(s?.max_followers ?? 0),
      };
    })
    .filter((m) => m !== null);
}

/** Open ideas this member was matched to, for "Matched for you" on Home. Empty before SQL 24. */
export async function getMyIdeaMatches(userId: string): Promise<Set<string>> {
  const db = createAdminClient();
  const { data, error } = await db.from("collab_matches").select("post_id").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
  return new Set(error ? [] : (data ?? []).map((r) => r.post_id as string));
}
