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

type Supabase = Awaited<ReturnType<typeof requireUser>>["supabase"];

/** Sends (or, if they asked first, accepts) one connection request. Shared by Connect and "Say hi to your top 3". */
async function connectWith(supabase: Supabase, me: string, other: string, message: string | null, siteUrl: string): Promise<FormState> {
  // The id is used inside a query filter, so accept only a well-formed uuid.
  if (!UUID.test(other) || other === me) return { message: TRY_AGAIN };

  const existing = await getConnection(supabase, me, other);
  if (existing?.status === "accepted") return { ok: true, message: "You're already connected." };
  if (existing?.status === "pending") {
    if (existing.from_user === me) return { ok: true, message: "Request already sent." };
    // They asked first, so connecting means accepting their request.
    const { error } = await supabase.from("connections").update({ status: "accepted" }).eq("id", existing.id);
    if (error) return { message: TRY_AGAIN };
    after(() => emailConnectionAccepted(me, other, siteUrl).catch(() => console.error("Accepted email failed")));
    return { ok: true, message: "You're connected." };
  }
  if (existing?.status === "declined") {
    // Only allowed for the person who declined, or the sender after 30 days (enforced by the database).
    const { data: removed } = await supabase.from("connections").delete().eq("id", existing.id).select("id");
    if (!removed?.length) return { message: "You can send another request 30 days after it was declined." };
  }

  const { error } = await supabase.from("connections").insert({ from_user: me, to_user: other, message });
  if (error) {
    if (error.message.includes("daily connection request limit")) {
      return { message: "You've sent 30 requests today. Try again tomorrow." };
    }
    if (error.message.includes("listed profile")) return { message: "Turn on \"Show my profile in search\" to connect." };
    if (error.message.includes("cannot connect")) return { message: "You can't connect with this creator." };
    return { message: TRY_AGAIN };
  }
  // Sent once the response is out, so a slow or failing email never blocks the request.
  after(() => emailConnectionRequest(me, other, message, siteUrl).catch(() => console.error("Connection email failed")));
  return { ok: true, message: "Request sent." };
}

export async function sendConnectionRequest(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser("/creators");
  const message = str(form, "message").slice(0, 300) || null;
  const result = await connectWith(supabase, user.id, str(form, "to_user"), message, `https://${(await headers()).get("host")}`);
  if (result.ok) refresh();
  return result;
}

/** "Say hi to your top 3 Jodi": sends up to 3 requests at once, each with its own ready-made note. */
export async function sayHiToJodi(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser("/home");
  const ids = form.getAll("to_user").filter((v): v is string => typeof v === "string").slice(0, 3);
  const notes = form.getAll("message").map((v) => (typeof v === "string" ? v.trim().slice(0, 300) : ""));
  if (ids.length === 0) return { message: TRY_AGAIN };
  const siteUrl = `https://${(await headers()).get("host")}`;
  let sent = 0;
  let firstError: string | undefined;
  for (const [i, id] of ids.entries()) {
    const r = await connectWith(supabase, user.id, id, notes[i] || null, siteUrl);
    if (r.ok) sent++;
    else firstError ??= r.message;
  }
  if (sent > 0) refresh();
  if (sent === 0) return { message: firstError ?? TRY_AGAIN };
  return { ok: true, message: `Said hi to ${sent} creator${sent === 1 ? "" : "s"}. We'll tell you when they reply.` };
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
