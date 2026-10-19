export type ParsedVideo = {
  platform: "youtube" | "instagram";
  externalId: string;
  url: string;
  thumbnailUrl: string | null;
};

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/** Turns a pasted YouTube or Instagram video link into what we store. */
export function parseVideoUrl(input: string): ParsedVideo | null {
  let u: URL;
  try {
    const raw = input.trim();
    u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www|m)\./, "");
  const parts = u.pathname.split("/").filter(Boolean);

  let ytId: string | null = null;
  if (host === "youtu.be") ytId = parts[0] ?? null;
  else if (host === "youtube.com") {
    if (parts[0] === "watch") ytId = u.searchParams.get("v");
    else if (["shorts", "embed", "live"].includes(parts[0] ?? "")) ytId = parts[1] ?? null;
  }
  if (ytId && YT_ID.test(ytId)) {
    return {
      platform: "youtube",
      externalId: ytId,
      url: `https://www.youtube.com/watch?v=${ytId}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
    };
  }

  if (host === "instagram.com" && ["p", "reel", "reels"].includes(parts[0] ?? "")) {
    const code = parts[1];
    if (code && /^[A-Za-z0-9_-]{5,40}$/.test(code)) {
      const kind = parts[0] === "p" ? "p" : "reel";
      return {
        platform: "instagram",
        externalId: code,
        url: `https://www.instagram.com/${kind}/${code}/`,
        thumbnailUrl: null,
      };
    }
  }
  return null;
}
