"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/profile/data";
import { REPORT_REASONS } from "@/lib/safety/reasons";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function str(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/** Files a report about a creator, and blocks them too when asked. */
export async function reportCreator(form: FormData) {
  const { supabase, user } = await requireUser("/home");
  const target = str(form, "user_id");
  const handle = str(form, "handle");
  if (!UUID.test(target) || target === user.id) redirect("/home");
  const reason = REPORT_REASONS.includes(str(form, "reason")) ? str(form, "reason") : "Something else";
  const details = str(form, "details").slice(0, 900);
  const { error } = await supabase
    .from("reports")
    .insert({ reporter_id: user.id, target_user: target, reason: details ? `${reason}: ${details}` : reason });
  if (error) redirect(`/creators/${encodeURIComponent(handle)}/report?note=failed`);
  if (form.get("block") === "on") await block(target, user.id);
  redirect(form.get("block") === "on" ? "/home?note=reported-blocked" : `/creators/${encodeURIComponent(handle)}?note=reported`);
}

async function block(target: string, me: string) {
  const { supabase } = await requireUser("/home");
  await supabase.from("blocks").upsert({ blocker_id: me, blocked_id: target }, { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true });
  revalidatePath("/", "layout");
}

export async function blockCreator(form: FormData) {
  const { user } = await requireUser("/home");
  const target = str(form, "user_id");
  if (!UUID.test(target) || target === user.id) redirect("/home");
  await block(target, user.id);
  redirect("/home?note=blocked");
}

export async function unblockCreator(form: FormData) {
  const { supabase, user } = await requireUser("/settings/profile");
  const target = str(form, "user_id");
  if (!UUID.test(target)) return;
  await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", target);
  revalidatePath("/", "layout");
}
