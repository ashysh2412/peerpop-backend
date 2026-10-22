export type VideoPlatform = "youtube" | "instagram" | "drive" | "vimeo";

export type ParsedVideo = {
  platform: VideoPlatform;
  externalId: string;
  url: string;
  thumbnailUrl: string | null;
};

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/** Turns a pasted YouTube, Instagram, Google Drive or Vimeo video link into what we store. */
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

  // Google Drive: the file must be shared as "Anyone with the link".
  if (host === "drive.google.com") {
    const id = parts[0] === "file" && parts[1] === "d" ? parts[2] : ["open", "uc"].includes(parts[0] ?? "") ? u.searchParams.get("id") : null;
    if (id && /^[A-Za-z0-9_-]{20,64}$/.test(id)) {
      return { platform: "drive", externalId: id, url: `https://drive.google.com/file/d/${id}/view`, thumbnailUrl: null };
    }
  }

  // Vimeo: vimeo.com/123, vimeo.com/123/abc (unlisted, with its hash) or player.vimeo.com/video/123?h=abc.
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const rest = host === "player.vimeo.com" && parts[0] === "video" ? parts.slice(1) : parts;
    const id = rest[0];
    const hash = host === "player.vimeo.com" ? u.searchParams.get("h") : rest[1];
    if (id && /^\d{5,12}$/.test(id)) {
      const unlisted = hash && /^[a-f0-9]{6,20}$/i.test(hash) ? hash : null;
      return {
        platform: "vimeo",
        externalId: unlisted ? `${id}/${unlisted}` : id,
        url: unlisted ? `https://vimeo.com/${id}/${unlisted}` : `https://vimeo.com/${id}`,
        thumbnailUrl: null,
      };
    }
  }
  return null;
}

/** The player address for videos that play inside Peerpop (Instagram opens on Instagram instead). */
export function embedUrl(platform: VideoPlatform, externalId: string) {
  if (platform === "youtube") return `https://www.youtube-nocookie.com/embed/${externalId}?autoplay=1`;
  if (platform === "drive") return `https://drive.google.com/file/d/${externalId}/preview`;
  if (platform === "vimeo") {
    const [id, hash] = externalId.split("/");
    return `https://player.vimeo.com/video/${id}?autoplay=1${hash ? `&h=${hash}` : ""}`;
  }
  return null;
}
