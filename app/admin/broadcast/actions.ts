"use server";

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { isConfirmedAdmin } from "@/lib/admin/access";
import { personalise, pickRecipients, type BroadcastAudience } from "@/lib/admin/broadcast";
import { getAdminOverview } from "@/lib/admin/data";
import { officialSender } from "@/lib/admin/official";
import { emailNewMessage } from "@/lib/email/messages";
import type { FormState } from "@/lib/profile/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Resend allows a couple of emails a second; space them out. */
const EMAIL_GAP_MS = 700;

/** Sends one message from the official Peerpop account to each chosen member, as a personal chat. */
export async function sendBroadcast(_prev: FormState, form: FormData): Promise<FormState> {
  if (!(await isConfirmedAdmin(await createClient()))) notFound();
  const raw = form.get("audience");
  const audience: BroadcastAudience = raw === "everyone" ? "everyone" : raw === "new" ? "new" : raw === "basics" ? "basics" : "incomplete";
  const text = String(form.get("body") ?? "").trim();
  if (!text) return { message: "Write a message first." };
  if (text.length > 2000) return { message: "Keep it under 2,000 characters." };

  const db = createAdminClient();
  const official = await officialSender(db);
  if (!official.id) return { message: "No official Peerpop account is set up." };
  const { users } = await getAdminOverview(Date.now());
  const people = pickRecipients(users, audience, official.id, official.blocked, official.messaged);
  if (people.length === 0) return { message: "Nobody matches. No messages sent." };

  const rows = people.map((p) => ({ sender_id: official.id, recipient_id: p.id, body: personalise(text, p.name) }));
  const { data, error } = await db.from("messages").insert(rows).select("id, recipient_id");
  if (error) {
    console.error("sendBroadcast", error.code);
    return { message: "Couldn't send. Nothing went out. Please try again." };
  }

  const siteUrl = `https://${(await headers()).get("host")}`;
  const sent = (data ?? []) as { id: string; recipient_id: string }[];
  // Emails go after the reply, one at a time, skipping anyone who already read the chat.
  after(async () => {
    await new Promise((r) => setTimeout(r, 30_000));
    for (const m of sent) {
      await emailNewMessage(m.id, official.id!, m.recipient_id, siteUrl, {
        waitMs: 0,
        reason: "You're getting this because the Peerpop team sent you a message.",
      }).catch(() => console.error("Broadcast email failed"));
      await new Promise((r) => setTimeout(r, EMAIL_GAP_MS));
    }
  });
  return { ok: true, message: `Sent to ${sent.length} creator${sent.length === 1 ? "" : "s"}. They'll see it in Messages, and get an email.` };
}
