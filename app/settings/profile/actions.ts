"use server";

import { refresh } from "next/cache";
import { isOwnAvatarPath } from "@/lib/profile/avatar";
import { requireUser } from "@/lib/profile/data";
import { saveLinks } from "@/lib/profile/save-links";
import type { FormState } from "@/lib/profile/types";
import { validateContacts, validateLinks, validateProfile } from "@/lib/profile/validate";
import { parseVideoUrl } from "@/lib/videos/parse";

const HANDLE_TAKEN = { handle: "That handle is taken. Try another one." };
const MAX_VIDEOS = 6;

function isUniqueViolation(error: { code?: string } | null) {
  return error?.code === "23505";
}

export async function saveProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser("/settings/profile");
  const result = validateProfile(form, { nichesOptional: true });
  if (!result.ok) return { errors: result.errors };

  const { error } = await supabase.from("creator_profiles").update(result.data).eq("user_id", user.id);
  if (isUniqueViolation(error)) return { errors: HANDLE_TAKEN };
  if (error) return { message: "Couldn't save. Please try again." };
  refresh();
  return { ok: true, message: "Profile saved." };
}

export async function setPhoto(path: string | null): Promise<FormState> {
  const { supabase, user } = await requireUser("/settings/profile");
  if (path !== null && !isOwnAvatarPath(path, user.id)) return { message: "That upload isn't yours." };

  const { data: current } = await supabase.from("creator_profiles").select("photo_path").eq("user_id", user.id).single();
  const { error } = await supabase.from("creator_profiles").update({ photo_path: path }).eq("user_id", user.id);
  if (error) return { message: "Couldn't save your photo. Please try again." };
  if (current?.photo_path && current.photo_path !== path) {
    await supabase.storage.from("avatars").remove([current.photo_path]);
  }
  refresh();
  return { ok: true, message: path ? "Photo updated." : "Photo removed." };
}

export async function saveProfileLinks(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser("/settings/profile");
  const result = validateLinks(form);
  if (!result.ok) return { errors: result.errors };
  const error = await saveLinks(supabase, user.id, result.data);
  if (error) return { message: "Couldn't save your links. Please try again." };
  refresh();
  return { ok: true, message: "Links saved." };
}

export async function saveContacts(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser("/settings/profile");
  const result = validateContacts(form);
  if (!result.ok) return { errors: result.errors };
  const { error } = await supabase.from("creator_contacts").upsert({ user_id: user.id, ...result.data });
  if (error) return { message: "Couldn't save. Please try again." };
  refresh();
  return { ok: true, message: "Contact details saved." };
}

export async function addVideo(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser("/settings/profile");
  const url = form.get("video_url");
  const parsed = typeof url === "string" ? parseVideoUrl(url) : null;
  if (!parsed) return { errors: { video_url: "Paste a YouTube video, Short, or Instagram Reel link." } };
  const titleRaw = form.get("title");
  const title = typeof titleRaw === "string" && titleRaw.trim() ? titleRaw.trim().slice(0, 200) : null;

  const { data: existing } = await supabase.from("profile_videos").select("position").eq("user_id", user.id);
  const used = new Set((existing ?? []).map((v) => v.position as number));
  if (used.size >= MAX_VIDEOS) return { errors: { video_url: "You can pin up to 6 videos. Remove one first." } };
  let position = 1;
  while (used.has(position)) position++;

  const { error } = await supabase.from("profile_videos").insert({
    user_id: user.id,
    platform: parsed.platform,
    url: parsed.url,
    external_id: parsed.externalId,
    thumbnail_url: parsed.thumbnailUrl,
    title,
    position,
  });
  if (isUniqueViolation(error)) return { errors: { video_url: "That video is already pinned." } };
  if (error) return { message: "Couldn't add the video. Please try again." };
  refresh();
  return { ok: true, message: "Video pinned." };
}

export async function removeVideo(form: FormData) {
  const { supabase, user } = await requireUser("/settings/profile");
  const id = form.get("id");
  if (typeof id !== "string") return;
  const { data: removed } = await supabase
    .from("profile_videos")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("position")
    .maybeSingle();
  if (removed) {
    // Close the gap so positions stay 1..n.
    const { data: rest } = await supabase
      .from("profile_videos")
      .select("id, position")
      .eq("user_id", user.id)
      .gt("position", removed.position)
      .order("position");
    for (const v of rest ?? []) {
      await supabase.rpc("move_profile_video", { video_id: v.id, new_position: v.position - 1 });
    }
  }
  refresh();
}

export async function moveVideo(form: FormData) {
  const { supabase } = await requireUser("/settings/profile");
  const id = form.get("id");
  const to = Number(form.get("to"));
  if (typeof id !== "string" || !Number.isInteger(to)) return;
  await supabase.rpc("move_profile_video", { video_id: id, new_position: to });
  refresh();
}
