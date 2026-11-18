"use server";

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { isConfirmedAdmin } from "@/lib/admin/access";
import { personalise, pickRecipients, type BroadcastAudience } from "@/lib/admin/broadcast";
import { getAdminOverview } from "@/lib/admin/data";
import { emailNewMessage } from "@/lib/email/messages";
import type { FormState } from "@/lib/profile/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Resend allows a couple of emails a second; space them out. */
const EMAIL_GAP_MS = 700;

/** The official account (the "Peerpop" profile), and everyone it can't message because of a block. */
export async function officialSender(db: ReturnType<typeof createAdminClient>) {
  const { data } = await db.from("official_accounts").select("user_id").order("created_at").limit(1).maybeSingle();
  const id = (data?.user_id as string | undefined) ?? null;
  if (!id) return { id: null, blocked: new Set<string>() };
  const { data: blocks } = await db.from("blocks").select("blocker_id, blocked_id").or(`blocker_id.eq.${id},blocked_id.eq.${id}`);
  return { id, blocked: new Set((blocks ?? []).map((b) => (b.blocker_id === id ? b.blocked_id : b.blocker_id) as string)) };
}

/** Sends one message from the official Peerpop account to each chosen member, as a personal chat. */
export async function sendBroadcast(_prev: FormState, form: FormData): Promise<FormState> {
  if (!(await isConfirmedAdmin(await createClient()))) notFound();
  const audience: BroadcastAudience = form.get("audience") === "everyone" ? "everyone" : "incomplete";
  const text = String(form.get("body") ?? "").trim();
  if (!text) return { message: "Write a message first." };
  if (text.length > 2000) return { message: "Keep it under 2,000 characters." };

  const db = createAdminClient();
  const official = await officialSender(db);
  if (!official.id) return { message: "No official Peerpop account is set up." };
  const { users } = await getAdminOverview(Date.now());
  const people = pickRecipients(users, audience, official.id, official.blocked);
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
