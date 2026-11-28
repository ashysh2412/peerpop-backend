import { sendAutoJodis } from "@/lib/jodi/auto";
import { sendCheckins } from "@/lib/jodi/checkin";

// Vercel Cron calls this every morning (see vercel.json) for a second Auto Jodi run.
// The evening run is part of the email-digest cron. Also sends the 3-day "Jodi se baat hui?" check-ins.
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const now = Date.now();
    const checkins = await sendCheckins(now).catch((err) => {
      console.error("jodi checkin", err);
      return 0;
    });
    return Response.json({ jodis: await sendAutoJodis(now), checkins });
  } catch (err) {
    console.error("auto jodi cron", err);
    return new Response("Auto Jodi run failed", { status: 500 });
  }
}
