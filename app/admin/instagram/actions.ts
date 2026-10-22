"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { isConfirmedAdmin } from "@/lib/admin/access";
import { publishApproved } from "@/lib/instagram/queue";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function admin() {
  if (!(await isConfirmedAdmin(await createClient()))) notFound();
  return createAdminClient();
}

function idFrom(form: FormData) {
  const id = String(form.get("id") ?? "");
  if (!UUID.test(id)) notFound();
  return id;
}

export async function approvePost(form: FormData) {
  const db = await admin();
  const caption = String(form.get("caption") ?? "")
    .trim()
    .slice(0, 2200);
  const update: Record<string, string> = { status: "approved", approved_at: new Date().toISOString() };
  if (caption) update.caption = caption;
  await db.from("ig_posts").update(update).eq("id", idFrom(form)).eq("status", "draft");
  revalidatePath("/admin/instagram");
}

export async function skipPost(form: FormData) {
  const db = await admin();
  await db.from("ig_posts").update({ status: "skipped" }).eq("id", idFrom(form)).in("status", ["draft", "approved", "failed"]);
  revalidatePath("/admin/instagram");
}

/** Sends a failed post back to the approved line so it is tried again. */
export async function retryPost(form: FormData) {
  const db = await admin();
  await db.from("ig_posts").update({ status: "approved", error: null, approved_at: new Date().toISOString() }).eq("id", idFrom(form)).eq("status", "failed");
  revalidatePath("/admin/instagram");
}

export async function postNow(form: FormData) {
  const db = await admin();
  const h = await headers();
  const origin = `https://${h.get("x-forwarded-host") ?? h.get("host")}`;
  await publishApproved(db, origin, Date.now(), idFrom(form));
  revalidatePath("/admin/instagram");
}
