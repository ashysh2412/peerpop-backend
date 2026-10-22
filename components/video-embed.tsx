"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProfileVideo } from "@/lib/profile/types";
import { embedUrl } from "@/lib/videos/parse";

const NAMES = { youtube: "YouTube video", instagram: "Instagram Reel", drive: "Video", vimeo: "Vimeo video" } as const;
// Drive and Vimeo have no thumbnail we can load, so they get a coloured tile instead.
const TILES = {
  instagram: "bg-gradient-to-br from-fuchsia-500 via-pink-500 to-amber-400",
  drive: "bg-gradient-to-br from-sky-500 via-emerald-500 to-amber-400",
  vimeo: "bg-gradient-to-br from-sky-400 to-blue-600",
  youtube: "bg-sunken",
} as const;

/**
 * Shows the thumbnail first and loads the player only when tapped, to keep pages light on mobile data.
 * `compact` is the small row used in the feed, so videos don't take over the page until played.
 */
export function VideoEmbed({ video, compact = false }: { video: ProfileVideo; compact?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const label = video.title ?? NAMES[video.platform];
  const player = embedUrl(video.platform, video.external_id);

  if (compact && !playing) {
    const external = video.platform === "instagram";
    const inner = (
      <>
        <span className="relative aspect-video w-36 shrink-0 overflow-hidden rounded-xl bg-sunken sm:w-44">
          {video.thumbnail_url ? (
            <Image src={video.thumbnail_url} alt="" fill sizes="176px" className="object-cover" />
          ) : (
            <span className={`absolute inset-0 ${TILES[video.platform]}`} />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/15">
            <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm text-white ${external ? "bg-black/50" : "bg-red-600"}`}>▶</span>
          </span>
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="line-clamp-2 text-sm font-semibold">{label}</span>
          <span className="mt-0.5 block text-xs text-muted">{external ? "Opens on Instagram" : "Tap to play"}</span>
        </span>
      </>
    );
    const cls = "flex w-full items-center gap-3 rounded-2xl border border-line p-2 transition hover:bg-sunken";
    return external ? (
      <a href={video.url} target="_blank" rel="noreferrer" className={cls}>
        {inner}
      </a>
    ) : (
      <button type="button" onClick={() => setPlaying(true)} className={cls} aria-label={`Play ${label}`}>
        {inner}
      </button>
    );
  }

  if (video.platform === "instagram") {
    return (
      <a
        href={video.url}
        target="_blank"
        rel="noreferrer"
        className="flex aspect-video flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-fuchsia-500 via-pink-500 to-amber-400 p-4 text-center text-white"
      >
        <span className="text-sm font-medium">Watch on Instagram</span>
        {video.title && <span className="line-clamp-2 text-sm opacity-90">{video.title}</span>}
      </a>
    );
  }

  if (playing) {
    return (
      <iframe
        className="aspect-video w-full rounded-xl"
        src={player ?? undefined}
        title={label}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group relative aspect-video w-full overflow-hidden rounded-xl bg-sunken"
      aria-label={`Play ${video.title ?? "video"}`}
    >
      {video.thumbnail_url ? (
        <Image src={video.thumbnail_url} alt="" fill sizes="(min-width: 640px) 50vw, 100vw" className="object-cover" />
      ) : (
        <span className={`absolute inset-0 ${TILES[video.platform]}`} />
      )}
      {!video.thumbnail_url && video.title && (
        <span className="absolute inset-x-0 bottom-0 line-clamp-2 bg-gradient-to-t from-black/60 p-3 text-left text-sm font-semibold text-white">{video.title}</span>
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-2xl text-white">▶</span>
      </span>
    </button>
  );
}
