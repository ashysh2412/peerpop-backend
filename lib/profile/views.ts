import type { Skill } from "@/lib/catalog";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type ProfileViewer = {
  user_id: string;
  handle: string;
  display_name: string;
  photo_path: string | null;
  city_slug: string | null;
  skills: Skill[];
  viewed_at: string;
  /** On how many days they opened the profile in the last 30. */
  times: number;
};

/** Saves that the signed-in member opened this profile. The database skips self-views, blocked pairs and private browsing. */
export async function recordProfileView(supabase: Supabase, target: string) {
  await supabase.rpc("record_profile_view", { target });
}

/** How many people viewed my profile in the last 30 days. 0 if the views SQL hasn't been run yet. */
export async function getProfileViewCount(supabase: Supabase) {
  const { data } = await supabase.rpc("my_profile_view_count");
  return typeof data === "number" ? data : 0;
}

/** Who viewed my profile in the last 30 days, newest first. Empty while I browse privately. */
export async function getProfileViewers(supabase: Supabase) {
  const { data } = await supabase.rpc("my_profile_views");
  return (data ?? []) as ProfileViewer[];
}

export async function getBrowsePrivately(supabase: Supabase, userId: string) {
  const { data } = await supabase.from("view_settings").select("browse_privately").eq("user_id", userId).maybeSingle();
  return !!data?.browse_privately;
}
