import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AccountStats, Contacts, OwnYouTube, PlatformAccount, Profile, ProfileVideo } from "./types";

const PROFILE_COLUMNS =
  "user_id, handle, display_name, photo_path, bio, city_slug, niches, skills, languages, open_to_collab, is_listed";

/** The signed-in user, or a redirect to sign in. */
export async function requireUser(next = "/home") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return { supabase, user };
}

type Client = Awaited<ReturnType<typeof createClient>>;

export async function getProfileById(supabase: Client, userId: string) {
  const { data } = await supabase.from("creator_profiles").select(PROFILE_COLUMNS).eq("user_id", userId).maybeSingle();
  return data as Profile | null;
}

export async function getProfileByHandle(supabase: Client, handle: string) {
  const { data } = await supabase
    .from("creator_profiles")
    .select(PROFILE_COLUMNS)
    .eq("handle", handle.toLowerCase())
    .maybeSingle();
  return data as Profile | null;
}

const PLATFORM_COLUMNS = "id, user_id, platform, handle, url, source, self_followers, self_avg_views, self_updated_at";
const STATS_COLUMNS =
  "account_id, followers, followers_hidden, avg_views_last10, uploads_per_week, growth_30d_abs, growth_30d_pct, computed_at";

/** Attaches computed stats to verified accounts. */
async function withStats<T extends PlatformAccount>(supabase: Client, accounts: T[]): Promise<T[]> {
  const ids = accounts.filter((a) => a.source === "verified").map((a) => a.id);
  if (ids.length === 0) return accounts;
  const { data } = await supabase.from("account_stats").select(STATS_COLUMNS).in("account_id", ids);
  const byId = new Map((data ?? []).map(({ account_id, ...stats }) => [account_id as string, stats as AccountStats]));
  return accounts.map((a) => ({ ...a, stats: byId.get(a.id) ?? null }));
}

export async function getOwnPlatforms(supabase: Client, userId: string) {
  const { data } = await supabase
    .from("platform_accounts")
    .select(`${PLATFORM_COLUMNS}, verification_code`)
    .eq("user_id", userId);
  return withStats(supabase, (data ?? []) as OwnYouTube[]);
}

export async function getPublicPlatforms(supabase: Client, userId: string) {
  const { data } = await supabase.from("public_platform_accounts").select(PLATFORM_COLUMNS).eq("user_id", userId);
  return withStats(supabase, (data ?? []) as PlatformAccount[]);
}

export async function getVideos(supabase: Client, userId: string) {
  const { data } = await supabase
    .from("profile_videos")
    .select("id, platform, url, external_id, title, thumbnail_url, position")
    .eq("user_id", userId)
    .order("position");
  return (data ?? []) as ProfileVideo[];
}

export async function getOwnContacts(supabase: Client, userId: string) {
  const { data } = await supabase
    .from("creator_contacts")
    .select("contact_email, contact_whatsapp, contact_note")
    .eq("user_id", userId)
    .maybeSingle();
  return (data ?? { contact_email: null, contact_whatsapp: null, contact_note: null }) as Contacts;
}
