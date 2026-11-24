import { createClient } from "@/lib/supabase/client";
import { shrinkImage } from "./shrink";

export const POST_PHOTO_BUCKET = "post-images";
export const POST_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;
// Phone photos can be big; they get shrunk before upload.
const MAX_PICK_BYTES = 25 * 1024 * 1024;

/** Shrinks and uploads one post photo into the person's own folder; returns its storage path, or an error to show. */
export async function uploadPostPhoto(userId: string, picked: File): Promise<{ path: string } | { error: string }> {
  if (!POST_PHOTO_TYPES.includes(picked.type)) return { error: "Use JPG, PNG or WebP images." };
  if (picked.size > MAX_PICK_BYTES) return { error: "Use images under 25 MB." };
  const f = await shrinkImage(picked, 1600);
  if (f.size > MAX_BYTES) return { error: "One image is too big. Please try another one." };
  const ext = f.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await createClient().storage.from(POST_PHOTO_BUCKET).upload(path, f, { contentType: f.type, cacheControl: "31536000" });
  return error ? { error: "Upload failed. Please try again." } : { path };
}
