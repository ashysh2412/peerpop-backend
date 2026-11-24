import { createClient } from "@/lib/supabase/client";

export const POST_VIDEO_BUCKET = "post-videos";
export const POST_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_BYTES = 50 * 1024 * 1024;

export function postVideoUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${POST_VIDEO_BUCKET}/${path}`;
}

/** Uploads one post video into the person's own folder (Peerpop account only); returns its path, or an error to show. */
export async function uploadPostVideo(userId: string, picked: File): Promise<{ path: string } | { error: string }> {
  if (!POST_VIDEO_TYPES.includes(picked.type)) return { error: "Use an MP4 or MOV video." };
  if (picked.size > MAX_BYTES) return { error: "Use a video under 50 MB. A 30 second reel is usually 5 to 15 MB." };
  const ext = picked.type === "video/quicktime" ? "mov" : picked.type === "video/webm" ? "webm" : "mp4";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await createClient().storage.from(POST_VIDEO_BUCKET).upload(path, picked, { contentType: picked.type, cacheControl: "31536000" });
  return error ? { error: "Video upload failed. Please try again." } : { path };
}
