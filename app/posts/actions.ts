"use server";

import { refresh } from "next/cache";
import { POST_IMAGE_BUCKET } from "@/lib/feed/data";
import { isOwnAvatarPath } from "@/lib/profile/avatar";
import { requireUser } from "@/lib/profile/data";
import type { FormState } from "@/lib/profile/types";

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

export async function createPost(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser("/home");
  let body = str(form, "body");
  const image = str(form, "image_path") || null;
  let linkRaw = str(form, "link_url");
  // A link pasted into the text becomes the post's link, so a video plays without an extra tap.
  const pasted = !linkRaw ? body.match(/https?:\/\/\S+/i)?.[0] : undefined;
  if (pasted) {
    linkRaw = pasted;
    body = body.replace(pasted, "").trim();
  }
  const link = normaliseLink(linkRaw);
  if (!body && link) return { message: "Add a title or a line about your video." };
  if (!body) return { message: "Write something first." };
  if (body.length > 3000) return { message: "Keep posts under 3,000 characters." };
  if (link === undefined) return { message: "That link doesn't look right." };
  // Post photos follow the same <user id>/<file> layout as profile photos.
  if (image && !isOwnAvatarPath(image, user.id)) return { message: "That upload isn't yours." };

  const { error } = await supabase.from("posts").insert({ author_id: user.id, body, link_url: link, image_path: image });
  if (error) {
    if (error.message.includes("daily post limit")) return { message: "You've posted 20 times today. Try again tomorrow." };
    return { message: TRY_AGAIN };
  }
  refresh();
  return { ok: true, message: "Posted." };
}

export async function deletePost(form: FormData) {
  const { supabase, user } = await requireUser("/home");
  const id = str(form, "id");
  if (!UUID.test(id)) return;
  const { data } = await supabase.from("posts").delete().eq("id", id).eq("author_id", user.id).select("image_path");
  const image = data?.[0]?.image_path;
  if (image) await supabase.storage.from(POST_IMAGE_BUCKET).remove([image]);
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
