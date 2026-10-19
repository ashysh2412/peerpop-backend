import { runDailyRefresh } from "@/lib/youtube/refresh";

// Vercel Cron calls this daily (see vercel.json) with the CRON_SECRET as a bearer token.
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    return Response.json(await runDailyRefresh());
  } catch (err) {
    console.error("refresh-youtube", err);
    return new Response("Refresh failed", { status: 500 });
  }
}
