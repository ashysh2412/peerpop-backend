import "server-only";
import { randomInt } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { findChannel, recentVideos, type Channel } from "./api";
import { parseChannelUrl } from "./channel-url";
import { averageViews, growth30d, uploadsPerWeek } from "./stats";

export type Admin = ReturnType<typeof createAdminClient>;
type Result = { ok: true; message: string } | { ok: false; message: string };

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CHECK_COOLDOWN_MS = 30_000;

export function newVerificationCode() {
  let code = "peerpop-";
  for (let i = 0; i < 4; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

const channelUrl = (id: string) => `https://www.youtube.com/channel/${id}`;

async function ownYouTubeRow(admin: Admin, userId: string) {
  const { data, error } = await admin
    .from("platform_accounts")
    .select("id, url, source, verification_code, last_fetch_at")
    .eq("user_id", userId)
    .eq("platform", "youtube")
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Step 1: find the channel, then give the creator a code to put in its description. */
export async function startVerification(userId: string, link: string): Promise<Result> {
  const ref = parseChannelUrl(link);
  if (!ref) return { ok: false, message: "Paste your channel link, like youtube.com/@yourname." };
  const channel = await findChannel(ref);
  if (!channel) return { ok: false, message: "We couldn't find that channel. Check the link and try again." };

  const admin = createAdminClient();
  const { data: taken } = await admin
    .from("platform_accounts")
    .select("user_id")
    .eq("platform", "youtube")
    .eq("external_id", channel.id)
    .maybeSingle();
  if (taken && taken.user_id !== userId) {
    return { ok: false, message: "This channel is already verified on another Peerpop account." };
  }

  const row = await ownYouTubeRow(admin, userId);
  if (row?.source === "verified") return { ok: false, message: "Your channel is already verified." };

  const fields = {
    url: channelUrl(channel.id),
    handle: channel.handle,
    verification_code: newVerificationCode(),
    last_fetch_error: null,
  };
  const { error } = row
    ? await admin.from("platform_accounts").update(fields).eq("id", row.id)
    : await admin.from("platform_accounts").insert({ user_id: userId, platform: "youtube", ...fields });
  if (error) throw error;
  return { ok: true, message: `Found ${channel.title}.` };
}

/** Step 2: look for the code in the channel description and mark the channel verified. */
export async function checkVerification(userId: string): Promise<Result> {
  const admin = createAdminClient();
  const row = await ownYouTubeRow(admin, userId);
  if (!row?.verification_code || !row.url) return { ok: false, message: "Start again by pasting your channel link." };
  if (row.last_fetch_at && Date.now() - Date.parse(row.last_fetch_at) < CHECK_COOLDOWN_MS) {
    return { ok: false, message: "Please wait 30 seconds before checking again." };
  }

  const ref = parseChannelUrl(row.url);
  const channel = ref && (await findChannel(ref));
  await admin.from("platform_accounts").update({ last_fetch_at: new Date().toISOString() }).eq("id", row.id);
  if (!channel) return { ok: false, message: "We couldn't load your channel. Try again in a minute." };
  if (!channel.description.includes(row.verification_code)) {
    return {
      ok: false,
      message: "Code not found yet. It can take a few minutes to show after you save on YouTube, so try again shortly.",
    };
  }

  const { error } = await admin
    .from("platform_accounts")
    .update({
      external_id: channel.id,
      source: "verified",
      ownership_verified_at: new Date().toISOString(),
      verification_code: null,
      handle: channel.handle,
      url: channelUrl(channel.id),
    })
    .eq("id", row.id);
  if (error?.code === "23505") {
    return { ok: false, message: "This channel is already verified on another Peerpop account." };
  }
  if (error) throw error;

  await recordStats(admin, row.id, channel);
  return { ok: true, message: "Your channel is verified. You can remove the code from your description now." };
}

/**
 * Saves today's snapshot and recomputes the numbers shown on the profile
 * (2 quota units on top of the channels.list call). Returns whether it worked.
 */
export async function recordStats(admin: Admin, accountId: string, channel: Channel): Promise<boolean> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  try {
    const videos = channel.uploadsPlaylist ? await recentVideos(channel.uploadsPlaylist) : [];
    const { error: snapError } = await admin.from("stat_snapshots").upsert({
      account_id: accountId,
      captured_on: today,
      followers: channel.subscribers,
      total_views: channel.totalViews,
      video_count: channel.videoCount,
    });
    if (snapError) throw snapError;

    const { data: snapshots } = await admin
      .from("stat_snapshots")
      .select("captured_on, followers")
      .eq("account_id", accountId)
      .gte("captured_on", new Date(now.getTime() - 34 * 86400000).toISOString().slice(0, 10));
    const growth = growth30d(channel.subscribers, snapshots ?? [], today);

    const { error: statsError } = await admin.from("account_stats").upsert({
      account_id: accountId,
      followers: channel.subscribers,
      followers_hidden: channel.subscribersHidden,
      avg_views_last10: averageViews(videos, now),
      uploads_per_week: uploadsPerWeek(videos, now),
      growth_30d_abs: growth?.abs ?? null,
      growth_30d_pct: growth?.pct ?? null,
      computed_at: now.toISOString(),
    });
    if (statsError) throw statsError;
    await admin
      .from("platform_accounts")
      .update({ last_fetch_at: now.toISOString(), last_fetch_error: null })
      .eq("id", accountId);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await admin.from("platform_accounts").update({ last_fetch_error: message.slice(0, 500) }).eq("id", accountId);
    return false;
  }
}
