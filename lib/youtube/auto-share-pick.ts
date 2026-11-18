import type { VideoFacts } from "./stats";

/** At most this many uploads are shared per channel per run, so a busy channel can't flood the feed. */
export const MAX_SHARE_PER_RUN = 3;

/** The public, finished uploads published after `since`, oldest first, as feed posts. */
export function pickUploadsToShare(videos: VideoFacts[], since: string): { url: string; body: string }[] {
  const from = Date.parse(since);
  return videos
    .filter((v) => v.id && v.isPublic && !v.isLive && Date.parse(v.publishedAt) > from)
    .sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt))
    .slice(-MAX_SHARE_PER_RUN)
    .map((v) => ({
      url: `https://www.youtube.com/watch?v=${v.id}`,
      body: (v.title?.trim() || "New video on my channel").slice(0, 3000),
    }));
}
