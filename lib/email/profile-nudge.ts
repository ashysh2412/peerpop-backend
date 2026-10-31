import "server-only";
import { getAdminOverview } from "@/lib/admin/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { markSent, recipientFor, sentRecently, SITE_URL } from "./prefs";
import { sendEmails, type Email } from "./send";
import { escapeHtml } from "./templates";

const DAY_MS = 24 * 3600 * 1000;
/** Each member gets this email once, ever. */
const TOPIC = "profile-nudge";

/** The "finish your profile" email, listing only what this member is missing. Pure, so it can be tested. */
export function profileNudgeEmail({ name, gaps, unsubscribe }: { name: string | null; gaps: string[]; unsubscribe: string }) {
  const first = name?.trim().split(/\s+/)[0];
  const hi = first ? `Hi ${first},` : "Hi,";
  const missing = gaps[0] === "Profile" ? ["Photo", "City", "Skills", "Niches"] : gaps;
  const url = `${SITE_URL}/settings/profile`;
  const lines = [
    "Thanks for joining Peerpop! Right now your profile is missing a few things, so other creators can't find you yet.",
    "It takes 1 minute to add:",
  ];
  const after = "Creators search by city and skill, so a filled-in profile is how you get collab requests.";
  const sign = "See you on Peerpop,\nAshish, founder of Peerpop";
  const text = [hi, "", ...lines, ...missing.map((m) => `- ${m}`), "", after, "", `Finish my profile: ${url}`, "", sign, "", `Turn off these emails: ${unsubscribe}`].join("\n");
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#18181b;max-width:480px">
<p>${escapeHtml(hi)}</p>
${lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("\n")}
<p style="border-left:3px solid #f0b100;padding-left:12px">${missing.map(escapeHtml).join("<br>")}</p>
<p>${escapeHtml(after)}</p>
<p><a href="${url}" style="display:inline-block;background:#111111;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">Finish my profile</a></p>
<p>See you on Peerpop,<br>Ashish, founder of Peerpop</p>
<p style="font-size:12px;color:#71717a">You're getting this once because your Peerpop profile isn't finished. <a href="${unsubscribe}" style="color:#71717a">Turn off these emails</a></p>
</div>`;
  return { subject: "Your Peerpop profile is almost there", text, html };
}

/**
 * Emails members whose profile is unfinished, a day after they join, once each.
 * Runs with the daily summary; respects the "Daily summary" email setting.
 */
export async function sendProfileNudges(now: number) {
  const admin = createAdminClient();
  const { users } = await getAdminOverview(now);
  const emails: Email[] = [];
  const sentTo: string[] = [];
  for (const u of users) {
    if (!u.gaps.length || now - Date.parse(u.joined) < DAY_MS) continue;
    if (await sentRecently(admin, u.id, TOPIC, 24 * 365 * 10)) continue;
    const recipient = await recipientFor(admin, u.id, "digest");
    if (!recipient) continue;
    emails.push({ to: recipient.to, ...profileNudgeEmail({ name: u.name, gaps: u.gaps, unsubscribe: recipient.unsubscribe }) });
    sentTo.push(u.id);
  }
  for (let i = 0; i < emails.length; i += 100) {
    if (await sendEmails(emails.slice(i, i + 100))) for (const id of sentTo.slice(i, i + 100)) await markSent(admin, id, TOPIC);
  }
  return emails.length;
}
