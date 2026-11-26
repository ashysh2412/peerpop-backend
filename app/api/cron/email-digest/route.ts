import { sendAutoWelcomes } from "@/lib/admin/auto-welcome";
import { sendAutoJodis } from "@/lib/jodi/auto";
import { sendDailyDigest } from "@/lib/email/digest";
import { sendProfileNudges } from "@/lib/email/profile-nudge";

// Vercel Cron calls this once a day (see vercel.json) to send each member a summary of what they missed,
// a one-time "finish your profile" email to members who joined over a day ago and left it unfinished,
// and the same members get the Peerpop welcome as a chat message. Up to 10 pairs of creators also get
// an automatic collab Jodi suggestion from the Peerpop account.
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const now = Date.now();
    const welcomes = await sendAutoWelcomes(now).catch((err) => {
      console.error("auto welcome", err);
      return 0;
    });
    const jodis = await sendAutoJodis(now).catch((err) => {
      console.error("auto jodi", err);
      return 0;
    });
    return Response.json({ digests: await sendDailyDigest(now), nudges: await sendProfileNudges(now), welcomes, jodis });
  } catch (err) {
    console.error("email digest cron", err);
    return new Response("Digest run failed", { status: 500 });
  }
}
