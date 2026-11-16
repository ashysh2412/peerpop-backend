import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreatorRow } from "@/components/creator-card";
import { FOLLOWER_BUCKETS, PAGE_SIZE, type SearchFilters } from "./params";

const COLUMNS =
  "user_id, handle, display_name, photo_path, city_slug, niches, open_to_collab, max_followers, max_followers_verified, has_verified, avg_views, avg_views_verified";

/**
 * Name search on the Creators page. It reads the same creator_search_rows view as the
 * search_creators function, so hidden profiles ("Show my profile in search" off) and
 * blocked people stay out, and it applies the same filters. No database change needed.
 */
export async function searchByName(supabase: SupabaseClient, f: SearchFilters & { q: string }) {
  const bucket = FOLLOWER_BUCKETS.find(([b]) => b === f.followers);
  let query = supabase
    .from("creator_search_rows")
    .select(COLUMNS, { count: "exact" })
    .ilike("display_name", `%${f.q}%`);
  if (f.city) query = query.eq("city_slug", f.city);
  if (f.niches.length) query = query.overlaps("niches", f.niches);
  if (f.skills.length) query = query.overlaps("skills", f.skills);
  if (f.langs.length) query = query.overlaps("languages", f.langs);
  if (bucket?.[2] != null) query = query.gte("max_followers", bucket[2]);
  if (bucket?.[3] != null) query = query.lt("max_followers", bucket[3]);
  if (f.collab) query = query.eq("open_to_collab", true);
  if (f.verified) query = query.eq("has_verified", true);
  if (f.sort === "views") query = query.order("avg_views", { ascending: false, nullsFirst: false });
  const from = (f.page - 1) * PAGE_SIZE;
  const { data, count, error } = await query
    .order("has_verified", { ascending: false })
    .order("max_followers", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  const total = count ?? 0;
  const rows = ((data ?? []) as Omit<CreatorRow, "total_count">[]).map((r) => ({ ...r, total_count: total }));
  return { data: rows, error };
}
