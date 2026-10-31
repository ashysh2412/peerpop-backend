import { sendDailyDigest } from "@/lib/email/digest";

// Vercel Cron calls this once a day (see vercel.json) to send each member a summary of what they missed.
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    return Response.json({ sent: await sendDailyDigest(Date.now()) });
  } catch (err) {
    console.error("email digest cron", err);
    return new Response("Digest run failed", { status: 500 });
  }
}
