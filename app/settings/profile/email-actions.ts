"use server";

import { refresh } from "next/cache";
import { EMAIL_TOPICS } from "@/lib/email/topic-list";
import { requireUser } from "@/lib/profile/data";
import type { FormState } from "@/lib/profile/types";

export async function saveEmailSettings(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser("/settings/profile");
  const values = Object.fromEntries(EMAIL_TOPICS.map((t) => [t, form.get(t) === "on"]));
  const { error } = await supabase
    .from("email_settings")
    .upsert({ user_id: user.id, ...values, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return { message: "Couldn't save. Please try again." };
  refresh();
  return { ok: true, message: "Email settings saved." };
}
