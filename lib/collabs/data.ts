import "server-only";
import type { Language, Niche, Skill } from "@/lib/catalog";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export const COLLAB_PAGE = 20;

type Person = { user_id: string; handle: string; display_name: string; photo_path: string | null };

export type Collab = {
  id: string;
  author_id: string;
  title: string;
  description: string;
  city_slug: string | null;
  niches: Niche[];
  roles_needed: Skill[];
  languages: Language[];
  shoot_date: string | null;
  status: "open" | "closed";
  created_at: string;
  closes_at: string;
  author: Person | null;
};

export type Interest = {
  id: string;
  post_id: string;
  user_id: string;
  message: string | null;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  person?: Person | null;
};

const COLUMNS =
  "id, author_id, title, description, city_slug, niches, roles_needed, languages, shoot_date, status, created_at, closes_at, author:creator_profiles!collab_posts_author_id_fkey(user_id, handle, display_name, photo_path)";

export function isOpen(c: Pick<Collab, "status" | "closes_at">, now: number) {
  return c.status === "open" && Date.parse(c.closes_at) > now;
}

export type CollabFilters = { city: string | null; niche: Niche | null; role: Skill | null };

/** Open collabs, newest first. Posts by hidden or blocked authors are left out. */
export async function listCollabs(supabase: Client, f: CollabFilters, page: number, nowIso: string) {
  let q = supabase
    .from("collab_posts")
    .select(COLUMNS, { count: "exact" })
    .eq("status", "open")
    .gt("closes_at", nowIso)
    .order("created_at", { ascending: false })
    .range(page * COLLAB_PAGE, page * COLLAB_PAGE + COLLAB_PAGE - 1);
  if (f.city) q = q.eq("city_slug", f.city);
  if (f.niche) q = q.contains("niches", [f.niche]);
  if (f.role) q = q.contains("roles_needed", [f.role]);
  const { data, count } = await q;
  return { collabs: ((data ?? []) as unknown as Collab[]).filter((c) => c.author), total: count ?? 0 };
}

export async function getCollab(supabase: Client, id: string) {
  const { data } = await supabase.from("collab_posts").select(COLUMNS).eq("id", id).maybeSingle();
  const collab = data as unknown as Collab | null;
  return collab?.author ? collab : null;
}

/** Open collabs by one creator, for their profile. */
export async function getOpenCollabsBy(supabase: Client, authorId: string, nowIso: string) {
  const { data } = await supabase
    .from("collab_posts")
    .select("id, title, roles_needed, city_slug, shoot_date")
    .eq("author_id", authorId)
    .eq("status", "open")
    .gt("closes_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(10);
  return (data ?? []) as Pick<Collab, "id" | "title" | "roles_needed" | "city_slug" | "shoot_date">[];
}

/** Everyone who's interested, for the post's author (the database shows them only to the author). */
export async function getInterests(supabase: Client, postId: string) {
  const { data } = await supabase
    .from("collab_interests")
    .select(
      "id, post_id, user_id, message, status, created_at, person:creator_profiles!collab_interests_user_id_fkey(user_id, handle, display_name, photo_path)",
    )
    .eq("post_id", postId)
    .order("created_at");
  return ((data ?? []) as unknown as Interest[]).filter((i) => i.person);
}

export async function getMyInterest(supabase: Client, postId: string, me: string) {
  const { data } = await supabase
    .from("collab_interests")
    .select("id, post_id, user_id, message, status, created_at")
    .eq("post_id", postId)
    .eq("user_id", me)
    .maybeSingle();
  return data as Interest | null;
}

/** My collab posts (any status) with how many people are waiting on each. */
export async function getMyCollabs(supabase: Client, me: string) {
  const { data } = await supabase
    .from("collab_posts")
    .select("id, title, status, closes_at, created_at, collab_interests(status)")
    .eq("author_id", me)
    .order("created_at", { ascending: false })
    .limit(50);
  return ((data ?? []) as unknown as (Pick<Collab, "id" | "title" | "status" | "closes_at" | "created_at"> & {
    collab_interests: { status: string }[];
  })[]).map(({ collab_interests, ...c }) => ({
    ...c,
    waiting: collab_interests.filter((i) => i.status === "pending").length,
  }));
}
