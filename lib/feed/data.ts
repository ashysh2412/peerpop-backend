import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export const POST_IMAGE_BUCKET = "post-images";
export const POST_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const FEED_PAGE = 20;

export type FeedPost = {
  id: string;
  author_id: string;
  body: string;
  link_url: string | null;
  image_path: string | null;
  created_at: string;
  author_handle: string;
  author_name: string;
  author_photo: string | null;
  author_city: string | null;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  is_connection: boolean;
};

export type Comment = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: { handle: string; display_name: string; photo_path: string | null } | null;
};

export async function getFeed(supabase: Client, before: string | null) {
  const { data } = await supabase.rpc("get_feed", { p_before: before, p_limit: FEED_PAGE });
  return ((data ?? []) as FeedPost[]).map((p) => ({ ...p, like_count: Number(p.like_count), comment_count: Number(p.comment_count) }));
}

/** One post in the same shape as the feed, or null if it's gone or hidden. */
export async function getPost(supabase: Client, me: string | null, id: string): Promise<FeedPost | null> {
  const { data: post } = await supabase
    .from("posts")
    .select("id, author_id, body, link_url, image_path, created_at, author:creator_profiles!posts_author_id_fkey(handle, display_name, photo_path, city_slug)")
    .eq("id", id)
    .maybeSingle();
  if (!post) return null;
  const author = post.author as unknown as { handle: string; display_name: string; photo_path: string | null; city_slug: string | null } | null;
  if (!author) return null;
  const [likes, comments, mine] = await Promise.all([
    supabase.from("post_likes").select("post_id", { count: "exact", head: true }).eq("post_id", id),
    supabase.from("post_comments").select("id", { count: "exact", head: true }).eq("post_id", id),
    me
      ? supabase.from("post_likes").select("post_id", { count: "exact", head: true }).eq("post_id", id).eq("user_id", me)
      : Promise.resolve({ count: 0 }),
  ]);
  return {
    id: post.id,
    author_id: post.author_id,
    body: post.body,
    link_url: post.link_url,
    image_path: post.image_path,
    created_at: post.created_at,
    author_handle: author.handle,
    author_name: author.display_name,
    author_photo: author.photo_path,
    author_city: author.city_slug,
    like_count: likes.count ?? 0,
    comment_count: comments.count ?? 0,
    liked_by_me: (mine.count ?? 0) > 0,
    is_connection: false,
  };
}

export async function getComments(supabase: Client, postId: string) {
  const { data } = await supabase
    .from("post_comments")
    .select("id, author_id, body, created_at, author:creator_profiles!post_comments_author_id_fkey(handle, display_name, photo_path)")
    .eq("post_id", postId)
    .order("created_at")
    .limit(200);
  return ((data ?? []) as unknown as Comment[]).filter((c) => c.author);
}

export type Suggestion = { user_id: string; handle: string; display_name: string; photo_path: string | null; city_slug: string | null };

/** Listed creators in your city or sharing a niche, that you aren't connected to or waiting on yet. */
export async function getSuggestions(
  supabase: Client,
  me: { user_id: string; city_slug: string | null; niches: string[] },
  limit = 5,
) {
  const { data: links } = await supabase
    .from("connections")
    .select("from_user, to_user")
    .or(`from_user.eq.${me.user_id},to_user.eq.${me.user_id}`)
    .in("status", ["pending", "accepted"]);
  const skip = new Set([me.user_id, ...(links ?? []).flatMap((l) => [l.from_user, l.to_user])]);

  const ors = [me.city_slug ? `city_slug.eq.${me.city_slug}` : null, me.niches.length ? `niches.ov.{${me.niches.join(",")}}` : null]
    .filter(Boolean)
    .join(",");
  let query = supabase.from("creator_profiles").select("user_id, handle, display_name, photo_path, city_slug").eq("is_listed", true);
  if (ors) query = query.or(ors);
  const { data } = await query.order("updated_at", { ascending: false }).limit(30);
  return ((data ?? []) as Suggestion[]).filter((s) => !skip.has(s.user_id)).slice(0, limit);
}

export type Photo = { id: string; image_path: string };

/** A creator's latest posts that have a photo, for the grid on their profile. */
export async function getPhotosBy(supabase: Client, authorId: string, limit = 12) {
  const { data } = await supabase
    .from("posts")
    .select("id, image_path")
    .eq("author_id", authorId)
    .not("image_path", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Photo[];
}

export type StarterSteps = { photo: boolean; video: boolean; post: boolean; connections: number };

/** How far a new creator is with setting up: the "Get started" card on Home. */
export async function getStarterSteps(supabase: Client, me: { user_id: string; photo_path: string | null }): Promise<StarterSteps> {
  const [{ count: videos }, { count: posts }, { count: connections }] = await Promise.all([
    supabase.from("profile_videos").select("id", { count: "exact", head: true }).eq("user_id", me.user_id),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", me.user_id),
    supabase
      .from("connections")
      .select("from_user", { count: "exact", head: true })
      .or(`from_user.eq.${me.user_id},to_user.eq.${me.user_id}`)
      .eq("status", "accepted"),
  ]);
  return { photo: !!me.photo_path, video: (videos ?? 0) > 0, post: (posts ?? 0) > 0, connections: connections ?? 0 };
}
