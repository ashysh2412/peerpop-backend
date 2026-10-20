"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { validateCollab } from "@/lib/collabs/validate";
import { emailCollabAccepted, emailCollabInterest } from "@/lib/email/collab";
import { requireUser } from "@/lib/profile/data";
import type { FormState } from "@/lib/profile/types";

const TRY_AGAIN = "Something went wrong. Please try again.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function str(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

async function siteUrl() {
  return `https://${(await headers()).get("host")}`;
}

function todayInIndia() {
  return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

export async function createCollab(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser("/collabs/new");
  const result = validateCollab(form, todayInIndia());
  if (!result.ok) return { errors: result.errors, message: "Please fix the highlighted fields." };
  const { data, error } = await supabase
    .from("collab_posts")
    .insert({ ...result.data, author_id: user.id })
    .select("id")
    .single();
  if (error || !data) {
    // The database only lets listed creators post.
    if (error?.code === "42501") return { message: "Turn on \"Show my profile in search\" in Edit profile to post a collab." };
    return { message: TRY_AGAIN };
  }
  redirect(`/collabs/${data.id}`);
}

export async function closeCollab(form: FormData) {
  const { supabase, user } = await requireUser("/collabs");
  const id = str(form, "id");
  if (!UUID.test(id)) return;
  await supabase.from("collab_posts").update({ status: "closed" }).eq("id", id).eq("author_id", user.id);
  refresh();
}

export async function deleteCollab(form: FormData) {
  const { supabase, user } = await requireUser("/collabs");
  const id = str(form, "id");
  if (!UUID.test(id)) return;
  await supabase.from("collab_posts").delete().eq("id", id).eq("author_id", user.id);
  redirect("/collabs?mine=1");
}

export async function expressInterest(_prev: FormState, form: FormData): Promise<FormState> {
  const postId = str(form, "post_id");
  const { supabase, user } = await requireUser(`/collabs/${postId}`);
  if (!UUID.test(postId)) return { message: TRY_AGAIN };
  const message = str(form, "message").slice(0, 300) || null;
  const { error } = await supabase.from("collab_interests").insert({ post_id: postId, user_id: user.id, message });
  if (error) {
    if (error.code === "23505") return { ok: true, message: "You've already shown interest." };
    if (error.message.includes("closed")) return { message: "This collab is closed." };
    if (error.message.includes("own post")) return { message: "This is your own collab." };
    if (error.message.includes("cannot respond")) return { message: "You can't respond to this collab." };
    return { message: TRY_AGAIN };
  }
  const { data: post } = await supabase.from("collab_posts").select("author_id").eq("id", postId).maybeSingle();
  const url = await siteUrl();
  if (post) {
    after(() =>
      emailCollabInterest(postId, post.author_id, user.id, message, url).catch(() => console.error("Collab email failed")),
    );
  }
  refresh();
  return { ok: true, message: "Sent! You'll hear back if they accept." };
}

export async function withdrawInterest(form: FormData) {
  const { supabase, user } = await requireUser("/collabs");
  const id = str(form, "id");
  if (!UUID.test(id)) return;
  await supabase.from("collab_interests").delete().eq("id", id).eq("user_id", user.id);
  refresh();
}

async function answer(form: FormData, status: "accepted" | "declined") {
  const { supabase, user } = await requireUser("/collabs");
  const id = str(form, "id");
  if (!UUID.test(id)) return;
  // The database lets only the post's author answer, and only once.
  const { data } = await supabase.from("collab_interests").update({ status }).eq("id", id).select("post_id, user_id");
  const row = data?.[0];
  if (row && status === "accepted") {
    const url = await siteUrl();
    after(() => emailCollabAccepted(row.post_id, user.id, row.user_id, url).catch(() => console.error("Collab email failed")));
  }
  refresh();
}

export async function acceptInterest(form: FormData) {
  await answer(form, "accepted");
}

export async function declineInterest(form: FormData) {
  await answer(form, "declined");
}
