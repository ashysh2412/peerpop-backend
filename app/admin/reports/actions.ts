"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { isConfirmedAdmin } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function admin() {
  if (!(await isConfirmedAdmin(await createClient()))) notFound();
  return createAdminClient();
}

/** Clears every open report about this person. */
export async function markHandled(form: FormData) {
  const db = await admin();
  const target = String(form.get("user_id") ?? "");
  if (!UUID.test(target)) return;
  await db.from("reports").update({ resolved_at: new Date().toISOString() }).eq("target_user", target).is("resolved_at", null);
  revalidatePath("/admin/reports");
}

/** Deletes the account and everything it posted. Needs the confirm box ticked. */
export async function deleteAccount(form: FormData) {
  const db = await admin();
  const target = String(form.get("user_id") ?? "");
  if (!UUID.test(target) || form.get("confirm") !== "on") return;
  const { error } = await db.auth.admin.deleteUser(target);
  if (error) console.error(`Deleting a reported account failed: ${error.status}`);
  revalidatePath("/admin/reports");
}
