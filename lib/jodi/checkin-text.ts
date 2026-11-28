// Words and timing for the Jodi check-ins. Pure, so it can be tested.
export type CheckinAnswer = "done" | "talking" | "stuck" | "waiting" | "later";
export const CHECKIN_ANSWERS: CheckinAnswer[] = ["done", "talking", "stuck", "waiting", "later"];

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
/** Hours after two Jodis connect before asking how the collab is going. */
export const CONNECTED_AFTER_HOURS = 48;
/** Days after a Jodi list before nudging someone who hasn't connected with anyone. */
export const NUDGE_AFTER_DAYS = 3;
const SIGN = "– Team Peerpop\nEk reel. Do audience.";
const first = (name: string | null) => name?.trim().split(/\s+/)[0] || "there";

/** Ask once, 48 hours to 7 days after two Jodis connected. */
export function connectedCheckinDue(now: number, connectedAt: number, alreadyAsked: boolean) {
  const age = now - connectedAt;
  return !alreadyAsked && age >= CONNECTED_AFTER_HOURS * HOUR && age < 7 * DAY;
}

/** Nudge once per list, 3 to 7 days after it, if they haven't connected with any of their Jodis. */
export function nudgeDue(now: number, listAt: number, lastNudgeAt: number | null, connected: boolean) {
  const age = now - listAt;
  return !connected && age >= NUDGE_AFTER_DAYS * DAY && age < 7 * DAY && (lastNudgeAt === null || lastNudgeAt < listAt);
}

/** 48 hours after connecting with a Jodi. */
export function connectedCheckinMessage(name: string | null, partner: string | null) {
  return `Hi ${first(name)} 👋 Aap aur ${first(partner)} connect ho gaye! Collab aage badha?

✅ Reel ban gaya: www.peerpop.in/jodi/done
💬 Baat chal rahi hai: www.peerpop.in/jodi/talking
😕 Aage nahi badha: www.peerpop.in/jodi/stuck

${SIGN}`;
}

/** 3 days after a Jodi list, when they haven't connected with anyone yet. */
export function nudgeMessage(name: string | null) {
  return `Hi ${first(name)} 👋 Apni Jodis se connect hue?

⏳ Request bheji, reply nahi aaya: www.peerpop.in/jodi/waiting
🙈 Abhi nahi: www.peerpop.in/jodi/later

${SIGN}`;
}

/** Sent to a Jodi who hasn't accepted a request yet. */
export function waitingNudgeMessage(name: string | null, from: string | null) {
  return `Hi ${first(name)} 👋 ${first(from) === "there" ? "A creator" : first(from)} ne aapko collab request bheji hai.

Dekho aur accept karo: www.peerpop.in/network

${SIGN}`;
}
