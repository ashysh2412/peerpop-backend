"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { emailNewMessage } from "@/lib/email/messages";
import { requireUser } from "@/lib/profile/data";
import { MESSAGE_COLUMNS, type Message } from "@/lib/messages/data";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function sendMessage(to: string, body: string): Promise<{ message?: Message; error?: string }> {
  const { supabase, user } = await requireUser("/messages");
  const text = body.trim();
  if (!UUID.test(to) || !text) return { error: "Write a message first." };
  if (text.length > 2000) return { error: "Keep messages under 2,000 characters." };
  const { data, error } = await supabase.from("messages").insert({ sender_id: user.id, recipient_id: to, body: text }).select(MESSAGE_COLUMNS).single();
  if (error) {
    if (error.message.includes("only message your connections")) return { error: "You can only message your connections." };
    if (error.message.includes("daily message limit")) return { error: "You've sent a lot of messages today. Try again tomorrow." };
    return { error: "Couldn't send. Please try again." };
  }
  const message = data as Message;
  const siteUrl = `https://${(await headers()).get("host")}`;
  // Sent after the reply, so email never slows down or breaks sending a message.
  after(() => emailNewMessage(message.id, user.id, to, siteUrl).catch(() => console.error("Message email failed")));
  return { message };
}

export async function markRead(other: string) {
  const { supabase } = await requireUser("/messages");
  if (UUID.test(other)) await supabase.rpc("mark_messages_read", { other });
}
