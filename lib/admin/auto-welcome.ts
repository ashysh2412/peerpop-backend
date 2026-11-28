import "server-only";
import { officialSender } from "@/lib/admin/official";
import { createAdminClient } from "@/lib/supabase/admin";
import { personalise, pickRecipients, WELCOME_TEXT } from "./broadcast";
import { planStarterJodis, sendStarterJodis, STARTER_JODI_ON } from "@/lib/jodi/auto";
import { getAdminOverview, type AdminUser } from "./data";

/** Gives new members a few hours to finish their profile first, so tonight's sign-ups still get it tonight. */
const SETTLE = 3 * 60 * 60 * 1000;

/**
 * Daily: the Peerpop account sends the welcome message to members who joined at least 3 hours before the evening run,
 * still have gaps in their profile and never heard from Peerpop. No email: the
 * one-time "finish your profile" email already covers that.
 */
export function welcomeRecipients(users: AdminUser[], official: Awaited<ReturnType<typeof officialSender>>, now: number) {
  if (!official.id) return [];
  const joinedBefore = new Map(users.map((u) => [u.id, now - Date.parse(u.joined) > SETTLE]));
  return pickRecipients(users, "new", official.id, official.blocked, official.messaged).filter((p) => joinedBefore.get(p.id));
}

export async function sendAutoWelcomes(now: number): Promise<number> {
  const db = createAdminClient();
  const official = await officialSender(db);
  if (!official.id) return 0;
  const { users } = await getAdminOverview(now);
  const people = welcomeRecipients(users, official, now);
  if (people.length === 0) return 0;
  // Worked out before the welcome goes out, since the welcome changes who "never heard from Peerpop".
  const starters = STARTER_JODI_ON ? await planStarterJodis(now, people.map((p) => p.id)) : [];
  const { error } = await db
    .from("messages")
    .insert(people.map((p) => ({ sender_id: official.id, recipient_id: p.id, body: personalise(WELCOME_TEXT, p.name) })));
  if (error) throw error;
  if (starters.length) await sendStarterJodis(starters).catch((err) => console.error("starter jodi", err));
  return people.length;
}
