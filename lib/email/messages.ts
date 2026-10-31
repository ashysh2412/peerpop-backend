import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { markSent, recipientFor, sentRecently } from "./prefs";
import { sendEmail } from "./send";
import { simpleEmail } from "./templates";

/** Busy chats get one email, then nothing more about that person for this long. */
const QUIET_HOURS = 3;
/** Someone with the chat open reads the message within seconds, so wait before deciding to email. */
const WAIT_MS = 30_000;

/** Emails the recipient about a new message, unless they've already read it or heard about this chat recently. */
export async function emailNewMessage(messageId: string, senderId: string, recipientId: string, siteUrl: string) {
  await new Promise((r) => setTimeout(r, WAIT_MS));
  const admin = createAdminClient();
  const topic = `message:${senderId}`;
  if (await sentRecently(admin, recipientId, topic, QUIET_HOURS)) return;
  const [{ data: message }, { data: sender }, recipient] = await Promise.all([
    admin.from("messages").select("body, read_at").eq("id", messageId).maybeSingle(),
    admin.from("creator_profiles").select("display_name, handle").eq("user_id", senderId).maybeSingle(),
    recipientFor(admin, recipientId, "messages", siteUrl),
  ]);
  if (!message || message.read_at || !sender || !recipient) return;
  const text = message.body as string;
  const preview = text.length > 140 ? `${text.slice(0, 140)}…` : text;
  const body = simpleEmail({
    lead: `${sender.display_name} sent you a message on Peerpop.`,
    note: preview,
    button: { text: "Reply", url: `${siteUrl}/messages/${encodeURIComponent(sender.handle)}` },
    reason: "You're getting this because a connection messaged you on Peerpop. We email at most once every few hours per chat.",
    unsubscribe: recipient.unsubscribe,
  });
  await markSent(admin, recipientId, topic);
  await sendEmail({ to: recipient.to, subject: `${sender.display_name} sent you a message`, ...body });
}
