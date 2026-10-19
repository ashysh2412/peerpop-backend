import "server-only";
import type { ChannelRef } from "./channel-url";
import { parseDuration, type VideoFacts } from "./stats";

const BASE = "https://www.googleapis.com/youtube/v3";

export class YouTubeError extends Error {}

export type Channel = {
  id: string;
  title: string;
  handle: string | null;
  thumbnailUrl: string | null;
  description: string;
  subscribers: number | null;
  subscribersHidden: boolean;
  totalViews: number | null;
  videoCount: number | null;
  uploadsPlaylist: string | null;
};

async function get<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new YouTubeError("Missing YOUTUBE_API_KEY.");
  const res = await fetch(`${BASE}/${path}?${new URLSearchParams({ ...params, key })}`, { cache: "no-store" });
  if (!res.ok) throw new YouTubeError(`YouTube ${path} failed with ${res.status}`);
  return res.json() as Promise<T>;
}

const num = (v: string | undefined) => (v === undefined ? null : Number(v));

type ChannelItem = {
  id: string;
  snippet: { title: string; description: string; customUrl?: string; thumbnails?: Record<string, { url: string }> };
  statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean; viewCount?: string; videoCount?: string };
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
};

/** One unit. Returns null when no channel matches. */
export async function findChannel(ref: ChannelRef): Promise<Channel | null> {
  const lookup: Record<string, string> =
    ref.by === "id" ? { id: ref.value } : ref.by === "handle" ? { forHandle: `@${ref.value}` } : { forUsername: ref.value };
  const data = await get<{ items?: ChannelItem[] }>("channels", { part: "snippet,statistics,contentDetails", ...lookup });
  const item = data.items?.[0];
  if (!item) return null;
  const thumbs = item.snippet.thumbnails ?? {};
  return {
    id: item.id,
    title: item.snippet.title,
    handle: item.snippet.customUrl ?? null,
    thumbnailUrl: (thumbs.medium ?? thumbs.default)?.url ?? null,
    description: item.snippet.description ?? "",
    subscribers: item.statistics?.hiddenSubscriberCount ? null : num(item.statistics?.subscriberCount),
    subscribersHidden: item.statistics?.hiddenSubscriberCount ?? false,
    totalViews: num(item.statistics?.viewCount),
    videoCount: num(item.statistics?.videoCount),
    uploadsPlaylist: item.contentDetails?.relatedPlaylists?.uploads ?? null,
  };
}

type VideoItem = {
  snippet: { publishedAt: string; liveBroadcastContent: string };
  contentDetails: { duration: string };
  statistics?: { viewCount?: string };
  status: { privacyStatus: string };
};

/** Two units: the latest 50 uploads and their stats. */
export async function recentVideos(uploadsPlaylist: string): Promise<VideoFacts[]> {
  const list = await get<{ items?: { contentDetails: { videoId: string } }[] }>("playlistItems", {
    part: "contentDetails",
    playlistId: uploadsPlaylist,
    maxResults: "50",
  }).catch((err) => {
    // A channel with no uploads has no playlist yet.
    if (err instanceof YouTubeError && err.message.includes("404")) return { items: [] };
    throw err;
  });
  const ids = (list.items ?? []).map((i) => i.contentDetails.videoId);
  if (ids.length === 0) return [];
  const videos = await get<{ items?: VideoItem[] }>("videos", {
    part: "statistics,contentDetails,snippet,status",
    id: ids.join(","),
  });
  return (videos.items ?? []).map((v) => ({
    publishedAt: v.snippet.publishedAt,
    durationSeconds: parseDuration(v.contentDetails.duration),
    views: Number(v.statistics?.viewCount ?? 0),
    isPublic: v.status.privacyStatus === "public",
    isLive: v.snippet.liveBroadcastContent !== "none",
  }));
}
