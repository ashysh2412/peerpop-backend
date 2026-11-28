// Words and timing for the 3-day Jodi check-in. Pure, so it can be tested.
export type CheckinAnswer = "done" | "waiting" | "later";
export const CHECKIN_ANSWERS: CheckinAnswer[] = ["done", "waiting", "later"];

const DAY = 24 * 60 * 60 * 1000;
export const CHECKIN_AFTER_DAYS = 3;
const SIGN = "– Team Peerpop\nEk reel. Do audience.";
const first = (name: string | null) => name?.trim().split(/\s+/)[0] || "there";

/** A check-in is due 3 to 7 days after a Jodi list, once per list. */
export function checkinDue(now: number, listAt: number, lastCheckinAt: number | null) {
  const age = now - listAt;
  return age >= CHECKIN_AFTER_DAYS * DAY && age < 7 * DAY && (lastCheckinAt === null || lastCheckinAt < listAt);
}

export function checkinMessage(name: string | null) {
  return `Hi ${first(name)} 👋 Jodi se baat hui?

✅ Collab ho gaya: www.peerpop.in/jodi/done
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
