import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { AVATAR_BUCKET, AVATAR_MAX_BYTES, AVATAR_TYPES } from "./avatar";

type Client = Awaited<ReturnType<typeof createClient>>;

/** True for the profile photo links Google sign-in gives us. Nothing else is fetched. */
export function isGooglePhotoUrl(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && u.hostname.endsWith(".googleusercontent.com");
  } catch {
    return false;
  }
}

/** Copies the user's Google photo into their avatars folder. Returns the stored path, or null if anything fails. */
export async function importGooglePhoto(supabase: Client, userId: string, url: string) {
  if (!isGooglePhotoUrl(url)) return null;
  try {
    // Google serves small thumbnails by default ("=s96-c"); ask for a bigger one.
    const res = await fetch(url.replace(/=s\d+(-c)?$/, "=s400-c"), { redirect: "error", signal: AbortSignal.timeout(5000) });
    const type = res.headers.get("content-type")?.split(";")[0] ?? "";
    if (!res.ok || !AVATAR_TYPES.includes(type)) return null;
    const body = await res.arrayBuffer();
    if (body.byteLength > AVATAR_MAX_BYTES) return null;
    const path = `${userId}/google-${Date.now()}.${type.split("/")[1].replace("jpeg", "jpg")}`;
    const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, body, { contentType: type, cacheControl: "31536000" });
    return error ? null : path;
  } catch {
    return null;
  }
}
