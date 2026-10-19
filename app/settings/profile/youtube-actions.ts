"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/profile/data";
import type { FormState } from "@/lib/profile/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { MANUAL_REFRESH_MS, refreshAccount } from "@/lib/youtube/refresh";
import { checkVerification, startVerification } from "@/lib/youtube/verify";

// Error text can echo request headers, so hide anything shaped like a key.
const redact = (text: string) =>
  text.replace(/sb_(secret|publishable)_\S+/g, "[key hidden]").replace(/AIza\S+/g, "[key hidden]").replace(/"[^"]{20,}"/g, "[hidden]");

/** A short, non-secret hint about what failed, so problems can be diagnosed from a screenshot. */
function failure(err: unknown): FormState {
  let hint = "unknown";
  if (err instanceof Error) hint = err.message;
  else if (err && typeof err === "object") {
    // Supabase errors are plain objects with a code and a message.
    const { code, message } = err as { code?: string; message?: string };
    hint = `database ${code || ""} ${message || ""}`.trim();
  }
  return { message: `Something went wrong. Please try again. (${redact(hint).slice(0, 120)})` };
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

export async function refreshYouTubeNow(): Promise<FormState> {
  const { user } = await requireUser("/settings/profile");
  try {
    const admin = createAdminClient();
    const { data: account } = await admin
      .from("platform_accounts")
      .select("id, external_id, last_fetch_at")
      .eq("user_id", user.id)
      .eq("platform", "youtube")
      .eq("source", "verified")
      .maybeSingle();
    if (!account?.external_id) return { message: "Verify your channel first." };
    if (account.last_fetch_at && Date.now() - Date.parse(account.last_fetch_at) < MANUAL_REFRESH_MS) {
      return { message: "Your numbers were updated in the last 6 hours. Try again later." };
    }
    const ok = await refreshAccount(admin, account);
    refresh();
    return ok ? { ok: true, message: "Numbers updated." } : { message: "Couldn't reach YouTube. Try again later." };
  } catch (err) {
    console.error("refreshYouTubeNow", err);
    return failure(err);
  }
}
