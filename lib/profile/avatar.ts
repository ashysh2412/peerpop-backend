export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function avatarUrl(path: string | null | undefined) {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`;
}

/** Avatar paths must live in the user's own folder: <user id>/<file>. */
export function isOwnAvatarPath(path: string, userId: string) {
  return path.startsWith(`${userId}/`) && !path.includes("..") && path.length < 200;
}
