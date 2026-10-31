import { EMAIL_TOPICS, type EmailTopic } from "./topic-list";
import type { createClient } from "@/lib/supabase/server";

/** Everything on until the member says otherwise. */
export async function getEmailSettings(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from("email_settings").select("messages, network, collabs, digest").eq("user_id", userId).maybeSingle();
  return Object.fromEntries(EMAIL_TOPICS.map((t) => [t, data?.[t] ?? true])) as Record<EmailTopic, boolean>;
}
