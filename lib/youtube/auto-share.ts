import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { pickUploadsToShare } from "./auto-share-pick";
import type { VideoFacts } from "./stats";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Posts a verified channel's new uploads to its owner's feed, so creators
 * don't paste the same link on Peerpop. Runs after each stats refresh.
 */
export async function shareNewUploads(admin: Admin, accountId: string, videos: VideoFacts[]): Promise<number> {
  const { data: account } = await admin
    .from("platform_accounts")
    .select("user_id, source, auto_share, auto_share_since")
    .eq("id", accountId)
    .maybeSingle();
  if (!account || account.source !== "verified" || !account.auto_share) return 0;

  const fresh = pickUploadsToShare(videos, account.auto_share_since as string);
  if (fresh.length === 0) return 0;
  const { data: existing } = await admin
    .from("posts")
    .select("link_url")
    .eq("author_id", account.user_id)
    .in(
      "link_url",
      fresh.map((v) => v.url),
    );
  const posted = new Set((existing ?? []).map((p) => p.link_url as string));
  const rows = fresh.filter((v) => !posted.has(v.url)).map((v) => ({ author_id: account.user_id, body: v.body, link_url: v.url }));
  if (rows.length === 0) return 0;
  const { error } = await admin.from("posts").insert(rows);
  if (error) throw error;
  return rows.length;
}
