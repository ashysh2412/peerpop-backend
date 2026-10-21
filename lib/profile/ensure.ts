import "server-only";
import type { User } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/server";
import { getProfileById } from "./data";
import { importGooglePhoto, isGooglePhotoUrl } from "./google-photo";
import { handleFromName, withSuffix } from "./handle";

type Client = Awaited<ReturnType<typeof createClient>>;

/** A name to start with: the one Google gave us, or the part of the email before the @. */
export function startingName(user: Pick<User, "email" | "user_metadata">) {
  const fromGoogle = user.user_metadata?.full_name ?? user.user_metadata?.name;
  if (typeof fromGoogle === "string" && fromGoogle.trim()) return fromGoogle.trim().slice(0, 80);
  const local = (user.email ?? "").split("@")[0].replace(/[._\-+\d]+/g, " ").trim();
  if (!local) return "New creator";
  return local.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 80);
}

/**
 * Every signed-in person gets a profile straight away, so they can use the app
 * without filling anything in. Returns it, and whether it was just made.
 */
export async function ensureProfile(supabase: Client, user: User) {
  const existing = await getProfileById(supabase, user.id);
  if (existing) return { profile: existing, created: false };

  const display_name = startingName(user);
  const google = user.user_metadata?.avatar_url ?? user.user_metadata?.picture;
  const photo_path = isGooglePhotoUrl(google) ? await importGooglePhoto(supabase, user.id, google) : null;
  const base = handleFromName(display_name);
  for (let attempt = 0; attempt < 6; attempt++) {
    const handle = attempt === 0 ? base : withSuffix(base);
    const { error } = await supabase.from("creator_profiles").insert({ user_id: user.id, handle, display_name, photo_path, city_slug: "pune", open_to_collab: true });
    if (!error || error.code !== "23505") break;
  }
  // Read it back: this also covers another tab having made it at the same moment.
  const profile = await getProfileById(supabase, user.id);
  if (!profile) throw new Error("Couldn't create a profile");
  return { profile, created: true };
}
