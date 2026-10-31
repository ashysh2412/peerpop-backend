import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { DIGEST_KINDS, digestLines } from "./digest-lines";
import { markSent, recipientFor, sentRecently, SITE_URL } from "./prefs";
import { sendEmails, type Email } from "./send";
import { escapeHtml, simpleEmail } from "./templates";

const DAY_MS = 24 * 3600 * 1000;

/**
 * Once a day: one email per member listing what they missed in the last day (likes, comments,
 * new collab calls, new creators, group news, unread messages). Nobody gets more than one a day,
 * and members with nothing new get nothing.
 */
export async function sendDailyDigest(now: number) {
  const admin = createAdminClient();
  const since = new Date(now - DAY_MS).toISOString();
  const [{ data: notes }, { data: unread }] = await Promise.all([
    admin.from("notifications").select("user_id, kind").in("kind", DIGEST_KINDS).is("read_at", null).gte("created_at", since).limit(20000),
    admin.from("messages").select("user_id:recipient_id").is("read_at", null).gte("created_at", since).limit(20000),
  ]);
  const counts = new Map<string, Record<string, number>>();
  const bump = (user: string, kind: string) => {
    const c = counts.get(user) ?? {};
    c[kind] = (c[kind] ?? 0) + 1;
    counts.set(user, c);
  };
  for (const n of notes ?? []) bump(n.user_id as string, n.kind as string);
  for (const m of unread ?? []) bump(m.user_id as string, "messages");

  const emails: Email[] = [];
  const sentTo: string[] = [];
  for (const [userId, c] of counts) {
    const lines = digestLines(c);
    if (!lines.length || (await sentRecently(admin, userId, "digest", 20))) continue;
    const recipient = await recipientFor(admin, userId, "digest");
    if (!recipient) continue;
    const body = simpleEmail({
      lead: "Here's what you missed on Peerpop today:",
      note: lines.join("\n"),
      button: { text: "See what's new", url: `${SITE_URL}/notifications` },
      reason: "You're getting this daily summary because things happened on Peerpop while you were away.",
      unsubscribe: recipient.unsubscribe,
    });
    // The summary reads better as a list than one quoted paragraph.
    const html = body.html.replace(escapeHtml(lines.join("\n")), lines.map(escapeHtml).join("<br>"));
    emails.push({ to: recipient.to, subject: lines.length === 1 ? `Peerpop: ${lines[0]}` : `Peerpop: ${lines[0]} and more`, text: body.text, html });
    sentTo.push(userId);
  }
  for (let i = 0; i < emails.length; i += 100) {
    if (await sendEmails(emails.slice(i, i + 100))) for (const id of sentTo.slice(i, i + 100)) await markSent(admin, id, "digest");
  }
  return emails.length;
}
