"use server";

import { redirect } from "next/navigation";
import { EMAIL_TOPICS, type EmailTopic } from "@/lib/email/topic-list";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Turns one kind of email off for whoever the link was sent to. Works without signing in. */
export async function unsubscribe(form: FormData) {
  const token = String(form.get("t") ?? "");
  const topic = String(form.get("topic") ?? "") as EmailTopic;
  if (!UUID.test(token) || !EMAIL_TOPICS.includes(topic)) redirect("/email/unsubscribe?error=1");
  const { data } = await createAdminClient()
    .from("email_settings")
    .update({ [topic]: false, updated_at: new Date().toISOString() })
    .eq("unsub_token", token)
    .select("user_id");
  redirect(data?.length ? `/email/unsubscribe?done=${topic}` : "/email/unsubscribe?error=1");
}
