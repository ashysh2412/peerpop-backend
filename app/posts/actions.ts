"use server";

import { refresh } from "next/cache";
import { POST_IMAGE_BUCKET, POST_MAX_PHOTOS } from "@/lib/feed/data";
import { isOwnAvatarPath } from "@/lib/profile/avatar";
import { requireUser } from "@/lib/profile/data";
import type { FormState } from "@/lib/profile/types";
import { parseVideoUrl } from "@/lib/videos/parse";
import { fetchVideoTitle } from "@/lib/videos/title";

const TRY_AGAIN = "Something went wrong. Please try again.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function str(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function normaliseLink(raw: string) {
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return ["http:", "https:"].includes(url.protocol) && url.href.length <= 500 ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/** For the post box: the title of a pasted YouTube or Vimeo link, to fill in while the person writes. */
export async function lookupVideoTitle(link: string): Promise<string | null> {
  await requireUser("/home");
  return typeof link === "string" && link.length <= 500 ? fetchVideoTitle(link) : null;
}

export async function createPost(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser("/home");
  let body = str(form, "body");
  // Photos come in the order the person arranged them; the first one leads the post.
  const images = form
    .getAll("image_path")
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
  if (images.length > POST_MAX_PHOTOS) return { message: `Add up to ${POST_MAX_PHOTOS} photos.` };
  const image = images[0] ?? null;
  const moreImages = images.slice(1);
  const group = str(form, "group_id") || null;
  if (group && !UUID.test(group)) return { message: TRY_AGAIN };
  let linkRaw = str(form, "link_url");
  // A link pasted into the text becomes the post's link, so a video plays without an extra tap.
  const pasted = !linkRaw ? body.match(/https?:\/\/\S+/i)?.[0] : undefined;
  if (pasted) {
    linkRaw = pasted;
    body = body.replace(pasted, "").trim();
  }
  const link = normaliseLink(linkRaw);
  // Just a link is enough: the video's own title becomes the text.
  if (!body && link) body = (await fetchVideoTitle(link)) ?? (parseVideoUrl(link) ? "Shared a video 🎬" : "Shared a link");
  if (!body) return { message: "Write something first." };
  if (body.length > 3000) return { message: "Keep posts under 3,000 characters." };
  if (link === undefined) return { message: "That link doesn't look right." };
  // Post photos follow the same <user id>/<file> layout as profile photos.
  if (images.some((path) => !isOwnAvatarPath(path, user.id))) return { message: "That upload isn't yours." };

  const row: Record<string, unknown> = { author_id: user.id, body, link_url: link, image_path: image, group_id: group };
  // more_images is only sent when there is more than one photo, so one-photo posts work the same as before.
  const { error } = await supabase.from("posts").insert(moreImages.length ? { ...row, more_images: moreImages } : row);
  if (error) {
    if (error.message.includes("join the group")) return { message: "Join the group to post here." };
    if (error.message.includes("daily post limit")) return { message: "You've posted 20 times today. Try again tomorrow." };
    return { message: TRY_AGAIN };
  }
  refresh();
  return { ok: true, message: "Posted." };
}

/** The author changes their post's text. */
export async function updatePost(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser("/home");
  const id = str(form, "id");
  const body = str(form, "body");
  if (!UUID.test(id)) return { message: TRY_AGAIN };
  if (!body) return { message: "Write something first." };
  if (body.length > 3000) return { message: "Keep posts under 3,000 characters." };
  const { data, error } = await supabase.from("posts").update({ body }).eq("id", id).eq("author_id", user.id).select("id");
  if (error || !data?.length) return { message: TRY_AGAIN };
  refresh();
  return { ok: true, message: "Saved." };
}

export async function deletePost(form: FormData) {
  const { supabase, user } = await requireUser("/home");
  const id = str(form, "id");
  if (!UUID.test(id)) return;
  // The database decides who may delete: the author, or an admin of the post's group.
  const { data: extra } = await supabase.from("posts").select("more_images").eq("id", id).maybeSingle();
  const { data } = await supabase.from("posts").delete().eq("id", id).select("author_id, image_path");
  const post = data?.[0];
  // Storage only lets people remove their own files.
  if (post && post.author_id === user.id) {
    const files = [post.image_path, ...((extra?.more_images as string[] | null) ?? [])].filter((f): f is string => !!f);
    if (files.length) await supabase.storage.from(POST_IMAGE_BUCKET).remove(files);
  }
  refresh();
}

/** Likes or unlikes; returns the new state so the button can settle. */
export async function toggleLike(postId: string, like: boolean) {
  const { supabase, user } = await requireUser("/home");
  if (!UUID.test(postId)) return false;
  if (like) {
    const { error } = await supabase.from("post_likes").upsert({ post_id: postId, user_id: user.id }, { ignoreDuplicates: true });
    return !error;
  }
  await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
  return false;
}

export async function addComment(_prev: FormState, form: FormData): Promise<FormState> {
  const postId = str(form, "post_id");
  const { supabase, user } = await requireUser(`/posts/${postId}`);
  const body = str(form, "body");
  if (!UUID.test(postId)) return { message: TRY_AGAIN };
  if (!body) return { message: "Write a comment first." };
  if (body.length > 1000) return { message: "Keep comments under 1,000 characters." };
  const { error } = await supabase.from("post_comments").insert({ post_id: postId, author_id: user.id, body });
  if (error) {
    if (error.message.includes("daily comment limit")) return { message: "You've commented a lot today. Try again tomorrow." };
    if (error.message.includes("cannot comment")) return { message: "You can't comment on this post." };
    return { message: TRY_AGAIN };
  }
  refresh();
  return { ok: true };
}

export async function deleteComment(form: FormData) {
  const { supabase } = await requireUser("/home");
  const id = str(form, "id");
  if (!UUID.test(id)) return;
  // The database lets only the commenter or the post's author delete it.
  await supabase.from("post_comments").delete().eq("id", id);
  refresh();
}
