import "server-only";
import { parseVideoUrl } from "./parse";

const OEMBED: Partial<Record<string, string>> = {
  youtube: "https://www.youtube.com/oembed?format=json&url=",
  vimeo: "https://vimeo.com/api/oembed.json?url=",
};

/** The video's own title from YouTube or Vimeo (public oEmbed, no key), or null. Instagram and Drive have no public title lookup. */
export async function fetchVideoTitle(link: string): Promise<string | null> {
  const video = parseVideoUrl(link);
  const base = video && OEMBED[video.platform];
  if (!video || !base) return null;
  try {
    const res = await fetch(base + encodeURIComponent(video.url), { signal: AbortSignal.timeout(3000), cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: unknown };
    return typeof data.title === "string" && data.title.trim() ? data.title.trim().slice(0, 300) : null;
  } catch {
    return null;
  }
}
