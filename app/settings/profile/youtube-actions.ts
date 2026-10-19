"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/profile/data";
import type { FormState } from "@/lib/profile/types";
import { checkVerification, startVerification } from "@/lib/youtube/verify";

const TRY_AGAIN = "Something went wrong talking to YouTube. Please try again.";

export async function startYouTubeVerification(_prev: FormState, form: FormData): Promise<FormState> {
  const { user } = await requireUser("/settings/profile");
  const link = form.get("channel_url");
  if (typeof link !== "string" || !link.trim()) return { errors: { channel_url: "Paste your channel link." } };
  try {
    const result = await startVerification(user.id, link);
    if (!result.ok) return { errors: { channel_url: result.message } };
    refresh();
    return { ok: true, message: result.message };
  } catch (err) {
    console.error("startYouTubeVerification", err);
    return { message: TRY_AGAIN };
  }
}

export async function checkYouTubeVerification(): Promise<FormState> {
  const { user } = await requireUser("/settings/profile");
  try {
    const result = await checkVerification(user.id);
    if (result.ok) refresh();
    return result;
  } catch (err) {
    console.error("checkYouTubeVerification", err);
    return { message: TRY_AGAIN };
  }
}

export async function removeYouTubeChannel() {
  const { supabase, user } = await requireUser("/settings/profile");
  await supabase.from("platform_accounts").delete().eq("user_id", user.id).eq("platform", "youtube");
  refresh();
}
