import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { FEED_PAGE, type FeedPost } from "@/lib/feed/data";

type Client = Awaited<ReturnType<typeof createClient>>;

export type GroupSummary = {
  id: string;
  slug: string;
  name: string;
  about: string | null;
  join_type: "open" | "approval";
  member_count: number;
  my_status: "member" | "pending" | null;
  my_role: "admin" | "member" | null;
};

export type GroupPerson = {
  user_id: string;
  role: "admin" | "member";
  profile: { handle: string; display_name: string; photo_path: string | null; city_slug: string | null } | null;
};

export async function getGroups(supabase: Client) {
  const { data } = await supabase.rpc("get_groups");
  return (data ?? []) as GroupSummary[];
}

export async function getGroup(supabase: Client, slug: string) {
  const { data } = await supabase.rpc("get_group", { p_slug: slug });
  return ((data ?? []) as GroupSummary[])[0] ?? null;
}

export async function getGroupFeed(supabase: Client, groupId: string, before: string | null) {
  const { data } = await supabase.rpc("get_group_feed", { g: groupId, p_before: before, p_limit: FEED_PAGE });
  return ((data ?? []) as FeedPost[]).map((p) => ({ ...p, like_count: Number(p.like_count), comment_count: Number(p.comment_count) }));
}

const PERSON = "user_id, role, profile:creator_profiles!group_members_user_id_fkey(handle, display_name, photo_path, city_slug)";

export async function getMembers(supabase: Client, groupId: string) {
  const { data } = await supabase.from("group_members").select(PERSON).eq("group_id", groupId).eq("status", "member").order("created_at").limit(200);
  return ((data ?? []) as unknown as GroupPerson[]).filter((m) => m.profile);
}

export async function getRequests(supabase: Client, groupId: string) {
  const { data } = await supabase.from("group_members").select(PERSON).eq("group_id", groupId).eq("status", "pending").order("created_at").limit(100);
  return ((data ?? []) as unknown as GroupPerson[]).filter((m) => m.profile);
}
