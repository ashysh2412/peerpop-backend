"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProfileVideo } from "@/lib/profile/types";

/** Shows the thumbnail first and loads the player only when tapped, to keep profiles light on mobile data. */
export function VideoEmbed({ video }: { video: ProfileVideo }) {
  const [playing, setPlaying] = useState(false);

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
        src={`https://www.youtube-nocookie.com/embed/${video.external_id}?autoplay=1`}
        title={video.title ?? "YouTube video"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-800"
      aria-label={`Play ${video.title ?? "video"}`}
    >
      {video.thumbnail_url && (
        <Image src={video.thumbnail_url} alt="" fill sizes="(min-width: 640px) 50vw, 100vw" className="object-cover" />
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-2xl text-white">▶</span>
      </span>
    </button>
  );
}
