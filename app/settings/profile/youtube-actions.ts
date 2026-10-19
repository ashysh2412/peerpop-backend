"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/profile/data";
import type { FormState } from "@/lib/profile/types";
import { checkVerification, startVerification } from "@/lib/youtube/verify";

/** A short, non-secret hint about what failed, so problems can be diagnosed from a screenshot. */
function failure(err: unknown): FormState {
  let hint = "unknown";
  if (err instanceof Error) hint = err.message;
  else if (err && typeof err === "object" && "code" in err) hint = `database ${String(err.code)}`;
  return { message: `Something went wrong. Please try again. (${hint.slice(0, 120)})` };
}

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
    return failure(err);
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
    return failure(err);
  }
}

export async function removeYouTubeChannel() {
  const { supabase, user } = await requireUser("/settings/profile");
  await supabase.from("platform_accounts").delete().eq("user_id", user.id).eq("platform", "youtube");
  refresh();
}
