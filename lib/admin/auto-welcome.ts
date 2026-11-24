import "server-only";
import { officialSender } from "@/lib/admin/official";
import { createAdminClient } from "@/lib/supabase/admin";
import { personalise, pickRecipients, WELCOME_TEXT } from "./broadcast";
import { getAdminOverview } from "./data";

const DAY = 24 * 60 * 60 * 1000;

/**
 * Daily: the Peerpop account sends the welcome message to members who joined over a day ago,
 * still have gaps in their profile and never heard from Peerpop. No email: the
 * one-time "finish your profile" email already covers that.
 */
export async function sendAutoWelcomes(now: number): Promise<number> {
  const db = createAdminClient();
  const official = await officialSender(db);
  if (!official.id) return 0;
  const { users } = await getAdminOverview(now);
  const joinedBefore = new Map(users.map((u) => [u.id, now - Date.parse(u.joined) > DAY]));
  const people = pickRecipients(users, "new", official.id, official.blocked, official.messaged).filter((p) => joinedBefore.get(p.id));
  if (people.length === 0) return 0;
  const { error } = await db
    .from("messages")
    .insert(people.map((p) => ({ sender_id: official.id, recipient_id: p.id, body: personalise(WELCOME_TEXT, p.name) })));
  if (error) throw error;
  return people.length;
}
