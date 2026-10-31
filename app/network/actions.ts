"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { getConnection } from "@/lib/connections/data";
import { emailConnectionAccepted, emailConnectionRequest } from "@/lib/email/connection";
import { requireUser } from "@/lib/profile/data";
import type { FormState } from "@/lib/profile/types";

const TRY_AGAIN = "Something went wrong. Please try again.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function str(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function sendConnectionRequest(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser("/creators");
  const other = str(form, "to_user");
  const message = str(form, "message").slice(0, 300) || null;
  // The id is used inside a query filter, so accept only a well-formed uuid.
  if (!UUID.test(other) || other === user.id) return { message: TRY_AGAIN };

  const existing = await getConnection(supabase, user.id, other);
  if (existing?.status === "accepted") return { ok: true, message: "You're already connected." };
  if (existing?.status === "pending") {
    if (existing.from_user === user.id) return { ok: true, message: "Request already sent." };
    // They asked first, so connecting means accepting their request.
    const { error } = await supabase.from("connections").update({ status: "accepted" }).eq("id", existing.id);
    if (error) return { message: TRY_AGAIN };
    const site = `https://${(await headers()).get("host")}`;
    after(() => emailConnectionAccepted(user.id, other, site).catch(() => console.error("Accepted email failed")));
    refresh();
    return { ok: true, message: "You're connected." };
  }
  if (existing?.status === "declined") {
    // Only allowed for the person who declined, or the sender after 30 days (enforced by the database).
    const { data: removed } = await supabase.from("connections").delete().eq("id", existing.id).select("id");
    if (!removed?.length) return { message: "You can send another request 30 days after it was declined." };
  }

  const { error } = await supabase.from("connections").insert({ from_user: user.id, to_user: other, message });
  if (error) {
    if (error.message.includes("daily connection request limit")) {
      return { message: "You've sent 30 requests today. Try again tomorrow." };
    }
    if (error.message.includes("listed profile")) return { message: "Turn on \"Show my profile in search\" to connect." };
    if (error.message.includes("cannot connect")) return { message: "You can't connect with this creator." };
    return { message: TRY_AGAIN };
  }
  const host = (await headers()).get("host");
  const siteUrl = `https://${host}`;
  // Sent once the response is out, so a slow or failing email never blocks the request.
  after(() =>
    emailConnectionRequest(user.id, other, message, siteUrl).catch(() => console.error("Connection email failed")),
  );
  refresh();
  return { ok: true, message: "Request sent." };
}

async function answer(form: FormData, status: "accepted" | "declined") {
  const { supabase, user } = await requireUser("/network");
  const id = str(form, "id");
  if (!id) return;
  const { data } = await supabase.from("connections").update({ status }).eq("id", id).eq("to_user", user.id).select("from_user");
  const requester = data?.[0]?.from_user as string | undefined;
  if (status === "accepted" && requester) {
    const site = `https://${(await headers()).get("host")}`;
    after(() => emailConnectionAccepted(user.id, requester, site).catch(() => console.error("Accepted email failed")));
  }
  refresh();
}

export async function acceptConnection(form: FormData) {
  await answer(form, "accepted");
}

export async function declineConnection(form: FormData) {
  await answer(form, "declined");
}

/** Withdraws a request you sent, or removes an existing connection. */
export async function removeConnection(form: FormData) {
  const { supabase, user } = await requireUser("/network");
  const id = str(form, "id");
  if (!id) return;
  await supabase
    .from("connections")
    .delete()
    .eq("id", id)
    .or(`from_user.eq.${user.id},to_user.eq.${user.id}`);
  refresh();
}
