import { sendAutoJodis } from "@/lib/jodi/auto";

// Vercel Cron calls this every morning (see vercel.json) for a second Auto Jodi run.
// The evening run is part of the email-digest cron.
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    return Response.json({ jodis: await sendAutoJodis(Date.now()) });
  } catch (err) {
    console.error("auto jodi cron", err);
    return new Response("Auto Jodi run failed", { status: 500 });
  }
}
