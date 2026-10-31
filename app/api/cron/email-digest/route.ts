import { sendDailyDigest } from "@/lib/email/digest";
import { sendProfileNudges } from "@/lib/email/profile-nudge";

// Vercel Cron calls this once a day (see vercel.json) to send each member a summary of what they missed,
// and a one-time "finish your profile" email to members who joined over a day ago and left it unfinished.
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const now = Date.now();
    return Response.json({ digests: await sendDailyDigest(now), nudges: await sendProfileNudges(now) });
  } catch (err) {
    console.error("email digest cron", err);
    return new Response("Digest run failed", { status: 500 });
  }
}
