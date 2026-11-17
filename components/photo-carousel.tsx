"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

/** A post's photos: swipe on phones, arrows on computers, dots and a counter to show where you are. */
export function PhotoCarousel({ urls }: { urls: string[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = urls.length;

  function go(to: number) {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(count - 1, to));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="group relative aspect-[4/5] max-h-[560px] w-full overflow-hidden rounded-2xl bg-sunken" aria-roledescription="carousel">
      <div
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {urls.map((src, i) => (
          <div key={src} className="relative h-full w-full flex-none snap-center" aria-label={`Photo ${i + 1} of ${count}`}>
            <Image src={src} alt="" fill sizes="(min-width: 640px) 620px, 100vw" className="object-cover" priority={false} />
          </div>
        ))}
      </div>

      <span className="absolute top-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white tabular-nums">
        {index + 1}/{count}
      </span>

      {index > 0 && (
        <button
          type="button"
          onClick={() => go(index - 1)}
          aria-label="Previous photo"
          className="absolute top-1/2 left-2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow sm:flex"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      {index < count - 1 && (
        <button
          type="button"
          onClick={() => go(index + 1)}
          aria-label="Next photo"
          className="absolute top-1/2 right-2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow sm:flex"
        >
          <ChevronRight size={20} />
        </button>
      )}

      <div className="pointer-events-none absolute bottom-3 left-0 flex w-full justify-center gap-1.5">
        {urls.map((src, i) => (
          <span key={src} className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-white" : "w-1.5 bg-white/60"}`} />
        ))}
      </div>
    </div>
  );
}
