import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Contacts, PlatformAccount, Profile, ProfileVideo } from "./types";

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

export async function getOwnPlatforms(supabase: Client, userId: string) {
  const { data } = await supabase
    .from("platform_accounts")
    .select("id, user_id, platform, handle, url, source, self_followers, self_avg_views, self_updated_at")
    .eq("user_id", userId);
  return (data ?? []) as PlatformAccount[];
}

export async function getPublicPlatforms(supabase: Client, userId: string) {
  const { data } = await supabase
    .from("public_platform_accounts")
    .select("id, user_id, platform, handle, url, source, self_followers, self_avg_views, self_updated_at")
    .eq("user_id", userId);
  return (data ?? []) as PlatformAccount[];
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
