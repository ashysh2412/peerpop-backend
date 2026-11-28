import "server-only";
import { canSendChat, recentChats } from "@/lib/admin/chat-cap";
import { officialSender } from "@/lib/admin/official";
import { createAdminClient } from "@/lib/supabase/admin";
import { LISTS_FROM } from "./auto";
import { pairKey } from "./match";
import {
  connectedCheckinDue,
  connectedCheckinMessage,
  nudgeDue,
  nudgeMessage,
  waitingNudgeMessage,
  type CheckinAnswer,
} from "./checkin-text";

/** The Jodi check-ins (48 hours after connecting, and a nudge 3 days after a list). Off until checked on Admin. */
export const CHECKIN_ON = false;

type Due = { id: string; partnerId: string | null; name: string | null; handle: string | null; message: string };

export type CheckinPlan = {
  /** False until the jodi_checkins table exists (SQL 24). */
  ready: boolean;
  connected: Due[];
  nudges: Due[];
  /** Check-ins held back this run by the weekly chat limit. */
  capped: number;
  answers: { name: string; handle: string; partner: string | null; answer: CheckinAnswer; reel: string | null; at: string }[];
};

/** Who gets a check-in next, and how members answered so far. Sends nothing. */
export async function planCheckins(now: number): Promise<CheckinPlan> {
  const db = createAdminClient();
  const weekAgo = new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString();
  const [official, jodis, links, checkins] = await Promise.all([
    officialSender(db),
    db.from("jodi_suggestions").select("user_a, user_b, created_at").limit(20000),
    db.from("connections").select("from_user, to_user, responded_at").eq("status", "accepted").gte("responded_at", weekAgo).limit(20000),
    db.from("jodi_checkins").select("user_id, partner_id, sent_at, answer, answered_at, reel_url").order("sent_at", { ascending: false }).limit(20000),
  ]);
  const ready = !checkins.error;
  const skip = (id: string) => id === official.id || official.blocked.has(id);
  const rows = checkins.data ?? [];
  const asked = new Set(rows.filter((c) => c.partner_id).map((c) => `${c.user_id}>${c.partner_id}`));
  const lastNudge = new Map<string, number>();
  for (const c of rows) if (!c.partner_id) lastNudge.set(c.user_id, Math.max(lastNudge.get(c.user_id) ?? 0, Date.parse(c.sent_at)));

  // 48 hours after two Jodis connected: ask each of them how it's going.
  const jodiPairs = new Set((jodis.data ?? []).map((j) => pairKey(j.user_a, j.user_b)));
  const connected: { id: string; partnerId: string }[] = [];
  for (const l of links.data ?? []) {
    if (!l.responded_at || !jodiPairs.has(pairKey(l.from_user, l.to_user))) continue;
    for (const [me, them] of [
      [l.from_user, l.to_user],
      [l.to_user, l.from_user],
    ] as [string, string][]) {
      if (!skip(me) && connectedCheckinDue(now, Date.parse(l.responded_at), asked.has(`${me}>${them}`))) connected.push({ id: me, partnerId: them });
    }
  }

  // 3 days after a list, nobody connected yet: a gentle nudge.
  const { data: allLinks } = await db.from("connections").select("from_user, to_user").eq("status", "accepted").limit(50000);
  const accepted = new Set((allLinks ?? []).map((l) => pairKey(l.from_user, l.to_user)));
  const lists = new Map<string, { at: number; partners: string[] }>();
  for (const j of jodis.data ?? []) {
    const at = Date.parse(j.created_at);
    if (at < LISTS_FROM) continue;
    const l = lists.get(j.user_a) ?? { at: 0, partners: [] };
    lists.set(j.user_a, { at: Math.max(l.at, at), partners: [...l.partners, j.user_b] });
  }
  const nudgeIds = [...lists]
    .filter(([id, l]) => !skip(id) && nudgeDue(now, l.at, lastNudge.get(id) ?? null, l.partners.some((b) => accepted.has(pairKey(id, b)))))
    .map(([id]) => id);

  // The weekly limit on Peerpop chats: check-ins come before nudges.
  const chats = official.id ? await recentChats(db, official.id, now) : new Map<string, number>();
  const used = (id: string) => chats.get(id) ?? 0;
  const connectedOk = connected.filter((c) => canSendChat(used(c.id), "checkin"));
  const nudgeOk = nudgeIds.filter((id) => canSendChat(used(id) + (connectedOk.some((c) => c.id === id) ? 1 : 0), "nudge"));
  const capped = connected.length - connectedOk.length + nudgeIds.length - nudgeOk.length;

  const answered = rows.filter((c) => c.answer);
  const ids = [...new Set([...connected.flatMap((c) => [c.id, c.partnerId]), ...nudgeIds, ...answered.flatMap((c) => [c.user_id, c.partner_id].filter(Boolean))])];
  const { data: profiles } = ids.length ? await db.from("creator_profiles").select("user_id, display_name, handle").in("user_id", ids) : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.user_id as string, p]));
  const nameOf = (id: string | null) => (id ? ((byId.get(id)?.display_name as string | undefined) ?? null) : null);
  const handleOf = (id: string) => (byId.get(id)?.handle as string | undefined) ?? null;

  return {
    ready,
    capped,
    connected: connectedOk.map((c) => ({
      id: c.id,
      partnerId: c.partnerId,
      name: nameOf(c.id),
      handle: handleOf(c.id),
      message: connectedCheckinMessage(nameOf(c.id), nameOf(c.partnerId)),
    })),
    nudges: nudgeOk.map((id) => ({ id, partnerId: null, name: nameOf(id), handle: handleOf(id), message: nudgeMessage(nameOf(id)) })),
    answers: answered.slice(0, 50).map((c) => ({
      name: nameOf(c.user_id) ?? "?",
      handle: handleOf(c.user_id) ?? "",
      partner: c.partner_id ? handleOf(c.partner_id) : null,
      answer: c.answer as CheckinAnswer,
      reel: c.reel_url,
      at: c.answered_at ?? c.sent_at,
    })),
  };
}

/** Daily: sends the due check-ins from the Peerpop account. */
export async function sendCheckins(now: number): Promise<number> {
  if (!CHECKIN_ON) return 0;
  const plan = await planCheckins(now);
  if (!plan.ready) return 0;
  const db = createAdminClient();
  const official = await officialSender(db);
  if (!official.id) return 0;
  let sent = 0;
  for (const p of [...plan.connected, ...plan.nudges]) {
    // Saving first means a retry never asks twice.
    const { error } = await db.from("jodi_checkins").insert({ user_id: p.id, partner_id: p.partnerId });
    if (error) continue;
    const { error: msgError } = await db.from("messages").insert({ sender_id: official.id, recipient_id: p.id, body: p.message });
    if (!msgError) sent++;
  }
  return sent;
}

/** Saves a member's tap on one of the check-in links. Returns the Jodis they were sent, for the page. */
export async function recordCheckinAnswer(userId: string, answer: CheckinAnswer) {
  const db = createAdminClient();
  const { data: latest } = await db
    .from("jodi_checkins")
    .select("id, answer")
    .eq("user_id", userId)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const first = latest && latest.answer !== answer;
  if (latest) await db.from("jodi_checkins").update({ answer, answered_at: new Date().toISOString() }).eq("id", latest.id);
  const nudged = answer === "waiting" && (first || !latest) ? await nudgeWaiting(userId) : 0;
  return { found: !!latest, nudged };
}

export async function saveReelLink(userId: string, url: string) {
  const db = createAdminClient();
  const { data: latest } = await db.from("jodi_checkins").select("id").eq("user_id", userId).order("sent_at", { ascending: false }).limit(1).maybeSingle();
  if (!latest) return false;
  const { error } = await db.from("jodi_checkins").update({ answer: "done", answered_at: new Date().toISOString(), reel_url: url }).eq("id", latest.id);
  return !error;
}

/** "Request sent, no reply": Peerpop reminds each Jodi who hasn't accepted their request yet. */
async function nudgeWaiting(userId: string) {
  const db = createAdminClient();
  const official = await officialSender(db);
  if (!official.id) return 0;
  const [{ data: jodis }, { data: pending }, { data: me }] = await Promise.all([
    db.from("jodi_suggestions").select("user_b").eq("user_a", userId).limit(200),
    db.from("connections").select("to_user").eq("from_user", userId).eq("status", "pending").limit(200),
    db.from("creator_profiles").select("display_name").eq("user_id", userId).maybeSingle(),
  ]);
  const mine = new Set((jodis ?? []).map((j) => j.user_b as string));
  const chats = await recentChats(db, official.id, Date.now());
  const targets = (pending ?? [])
    .map((p) => p.to_user as string)
    .filter((id) => mine.has(id) && !official.blocked.has(id) && canSendChat(chats.get(id) ?? 0, "nudge"));
  if (!targets.length) return 0;
  const { data: names } = await db.from("creator_profiles").select("user_id, display_name").in("user_id", targets);
  const { error } = await db.from("messages").insert(
    (names ?? []).map((n) => ({
      sender_id: official.id,
      recipient_id: n.user_id,
      body: waitingNudgeMessage(n.display_name as string | null, (me?.display_name as string | undefined) ?? null),
    })),
  );
  return error ? 0 : (names ?? []).length;
}
