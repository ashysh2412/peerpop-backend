import "server-only";
import { officialSender } from "@/lib/admin/official";
import { createAdminClient } from "@/lib/supabase/admin";
import { LISTS_FROM } from "./auto";
import { checkinDue, checkinMessage, waitingNudgeMessage, type CheckinAnswer } from "./checkin-text";

/** The 3-day check-in after a Jodi list. Off until checked on Admin. */
export const CHECKIN_ON = false;

export type CheckinPlan = {
  /** False until the jodi_checkins table exists (SQL 24). */
  ready: boolean;
  due: { id: string; name: string | null; handle: string | null; message: string }[];
  answers: { name: string; handle: string; answer: CheckinAnswer; reel: string | null; at: string }[];
};

/** Who gets a check-in next, and how members answered so far. Sends nothing. */
export async function planCheckins(now: number): Promise<CheckinPlan> {
  const db = createAdminClient();
  const [official, lists, checkins] = await Promise.all([
    officialSender(db),
    db.from("jodi_suggestions").select("user_a, created_at").gte("created_at", new Date(LISTS_FROM).toISOString()).limit(20000),
    db.from("jodi_checkins").select("user_id, sent_at, answer, answered_at, reel_url").order("sent_at", { ascending: false }).limit(20000),
  ]);
  const ready = !checkins.error;
  const lastList = new Map<string, number>();
  for (const r of lists.data ?? []) lastList.set(r.user_a, Math.max(lastList.get(r.user_a) ?? 0, Date.parse(r.created_at)));
  const lastCheckin = new Map<string, number>();
  for (const c of checkins.data ?? []) lastCheckin.set(c.user_id, Math.max(lastCheckin.get(c.user_id) ?? 0, Date.parse(c.sent_at)));

  const dueIds = [...lastList]
    .filter(([id, listAt]) => id !== official.id && !official.blocked.has(id) && checkinDue(now, listAt, lastCheckin.get(id) ?? null))
    .map(([id]) => id);
  const answered = (checkins.data ?? []).filter((c) => c.answer);
  const ids = [...new Set([...dueIds, ...answered.map((c) => c.user_id as string)])];
  const { data: profiles } = ids.length
    ? await db.from("creator_profiles").select("user_id, display_name, handle").in("user_id", ids)
    : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.user_id as string, p]));

  return {
    ready,
    due: dueIds.map((id) => {
      const p = byId.get(id);
      return { id, name: (p?.display_name as string) ?? null, handle: (p?.handle as string) ?? null, message: checkinMessage((p?.display_name as string) ?? null) };
    }),
    answers: answered.slice(0, 50).map((c) => ({
      name: (byId.get(c.user_id)?.display_name as string) ?? "?",
      handle: (byId.get(c.user_id)?.handle as string) ?? "",
      answer: c.answer as CheckinAnswer,
      reel: c.reel_url,
      at: c.answered_at ?? c.sent_at,
    })),
  };
}

/** Daily: sends the check-in to members whose Jodi list is 3 days old. */
export async function sendCheckins(now: number): Promise<number> {
  if (!CHECKIN_ON) return 0;
  const plan = await planCheckins(now);
  if (!plan.ready || !plan.due.length) return 0;
  const db = createAdminClient();
  const official = await officialSender(db);
  if (!official.id) return 0;
  let sent = 0;
  for (const p of plan.due) {
    // Saving first means a retry never asks twice.
    const { error } = await db.from("jodi_checkins").insert({ user_id: p.id });
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
  const targets = (pending ?? []).map((p) => p.to_user as string).filter((id) => mine.has(id) && !official.blocked.has(id));
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
