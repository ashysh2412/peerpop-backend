import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { LinksInput } from "./validate";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Saves the creator's YouTube link and self-reported Instagram numbers.
 * Verified accounts are left alone: only the server may change those.
 */
export async function saveLinks(supabase: Client, userId: string, input: LinksInput) {
  const { data: existing, error: readError } = await supabase
    .from("platform_accounts")
    .select("id, platform, source")
    .eq("user_id", userId);
  if (readError) return readError.message;
  const byPlatform = new Map((existing ?? []).map((row) => [row.platform as string, row]));

  const youtube = byPlatform.get("youtube");
  if (!youtube || youtube.source === "self_reported") {
    if (!input.youtube_url) {
      if (youtube) await supabase.from("platform_accounts").delete().eq("id", youtube.id);
    } else {
      const { error } = youtube
        ? await supabase.from("platform_accounts").update({ url: input.youtube_url }).eq("id", youtube.id)
        : await supabase
            .from("platform_accounts")
            .insert({ user_id: userId, platform: "youtube", url: input.youtube_url });
      if (error) return error.message;
    }
  }

  const instagram = byPlatform.get("instagram");
  if (!instagram || instagram.source === "self_reported") {
    if (!input.instagram_handle) {
      if (instagram) await supabase.from("platform_accounts").delete().eq("id", instagram.id);
    } else {
      const fields = {
        handle: `@${input.instagram_handle}`,
        url: `https://www.instagram.com/${input.instagram_handle}/`,
        self_followers: input.instagram_followers,
        self_avg_views: input.instagram_avg_views,
      };
      const { error } = instagram
        ? await supabase.from("platform_accounts").update(fields).eq("id", instagram.id)
        : await supabase.from("platform_accounts").insert({ user_id: userId, platform: "instagram", ...fields });
      if (error) return error.message;
    }
  }
  return null;
}
