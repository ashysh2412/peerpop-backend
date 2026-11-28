"use server";

import { redirect } from "next/navigation";
import { recordCheckinAnswer, saveReelLink } from "@/lib/jodi/checkin";
import { CHECKIN_ANSWERS, type CheckinAnswer } from "@/lib/jodi/checkin-text";
import { requireUser } from "@/lib/profile/data";

/** Saves the member's answer to "Jodi se baat hui?" (and the reel link, if they add one). */
export async function answerCheckin(form: FormData) {
  const answer = String(form.get("answer")) as CheckinAnswer;
  if (!CHECKIN_ANSWERS.includes(answer)) redirect("/home");
  const { user } = await requireUser(`/jodi/${answer}`);
  const reel = String(form.get("reel") ?? "").trim().slice(0, 400);
  if (answer === "done" && reel) {
    const url = /^https?:\/\//i.test(reel) ? reel : `https://${reel}`;
    await saveReelLink(user.id, url);
    redirect(`/jodi/done?saved=1`);
  }
  const { nudged } = await recordCheckinAnswer(user.id, answer);
  redirect(`/jodi/${answer}?saved=1${answer === "waiting" ? `&nudged=${nudged}` : ""}`);
}
