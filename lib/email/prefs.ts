import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EmailTopic } from "./topic-list";

/** Where emails link to. Always the real site, since the daily summary runs from a cron. */
export const SITE_URL = "https://www.peerpop.in";

type Admin = ReturnType<typeof createAdminClient>;
export type Recipient = { to: string; unsubscribe: string };

/**
 * The member's email address and a link that turns this topic off, or null when they
 * turned it off or have no email. Members without saved settings get every email.
 */
export async function recipientFor(admin: Admin, userId: string, topic: EmailTopic, siteUrl = SITE_URL): Promise<Recipient | null> {
  await admin.from("email_settings").upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  const [{ data: settings }, { data: auth }] = await Promise.all([
    admin.from("email_settings").select("messages, network, collabs, digest, unsub_token").eq("user_id", userId).maybeSingle(),
    admin.auth.admin.getUserById(userId),
  ]);
  const to = auth?.user?.email;
  if (!to || !settings || settings[topic] === false) return null;
  return { to, unsubscribe: `${siteUrl}/email/unsubscribe?t=${settings.unsub_token}&topic=${topic}` };
}

/** True when this member was emailed about `topic` less than `hours` ago. */
export async function sentRecently(admin: Admin, userId: string, topic: string, hours: number) {
  const { data } = await admin.from("email_log").select("sent_at").eq("user_id", userId).eq("topic", topic).maybeSingle();
  return !!data && Date.now() - Date.parse(data.sent_at as string) < hours * 3600 * 1000;
}

export async function markSent(admin: Admin, userId: string, topic: string) {
  await admin.from("email_log").upsert({ user_id: userId, topic, sent_at: new Date().toISOString() });
}
