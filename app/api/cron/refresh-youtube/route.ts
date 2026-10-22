import { createAdminClient } from "@/lib/supabase/admin";
import { runDailyRefresh } from "@/lib/youtube/refresh";

// Vercel Cron calls this daily (see vercel.json) with the CRON_SECRET as a bearer token.
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  // Deleted accounts are kept for 180 days (IT Rules 2021), then removed here.
  const { data: purged, error } = await createAdminClient().rpc("purge_deleted_accounts");
  if (error) console.error(`purge_deleted_accounts failed: ${error.code}`);
  try {
    return Response.json({ ...(await runDailyRefresh()), purged: purged ?? 0 });
  } catch (err) {
    console.error("refresh-youtube", err);
    return new Response("Refresh failed", { status: 500 });
  }
}
