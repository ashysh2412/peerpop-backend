import { autoApproveNext, getAccount, publishApproved, topUpDrafts } from "@/lib/instagram/queue";
import { createAdminClient } from "@/lib/supabase/admin";

// Vercel Cron calls this daily (see vercel.json): it posts the next approved post (picking one itself when auto-post is on) and makes new drafts.
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const admin = createAdminClient();
    const now = Date.now();
    if ((await getAccount(admin))?.auto_post) {
      await topUpDrafts(admin, now);
      await autoApproveNext(admin, now);
    }
    const result = await publishApproved(admin, new URL(request.url).origin, now);
    const drafted = await topUpDrafts(admin, now);
    return Response.json({ ...result, drafted });
  } catch (err) {
    console.error("instagram cron", err);
    return new Response("Instagram run failed", { status: 500 });
  }
}
