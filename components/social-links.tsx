import { Plus } from "lucide-react";
import Link from "next/link";
import type { PlatformAccount } from "@/lib/profile/types";

// lucide-react has no brand icons, so these are drawn here.
function InstagramIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function YouTubeIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="4" fill="currentColor" />
      <path d="M10 9.2v5.6l4.8-2.8z" fill="#fff" />
    </svg>
  );
}

const STYLE = {
  instagram: { name: "Instagram", Icon: InstagramIcon, className: "bg-gradient-to-br from-amber-400 via-pink-500 to-violet-600 text-white" },
  youtube: { name: "YouTube", Icon: YouTubeIcon, className: "bg-red-600 text-white" },
} as const;

/** Instagram and YouTube buttons that open the creator's channels. With `addHref`, someone with none gets an add link. */
export function SocialLinks({
  platforms,
  addHref,
  size = "md",
  className = "",
}: {
  platforms: PlatformAccount[];
  addHref?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const links = (["instagram", "youtube"] as const).flatMap((kind) => {
    const p = platforms.find((a) => a.platform === kind && a.url);
    return p ? [{ kind, url: p.url! }] : [];
  });
  if (links.length === 0) {
    return addHref ? (
      <Link href={addHref} className={`btn-secondary btn-sm ${className}`}>
        <Plus size={14} /> Add Instagram or YouTube
      </Link>
    ) : null;
  }
  const pad = size === "sm" ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-sm";
  return (
    <div className={`flex flex-wrap justify-center gap-2 sm:justify-start ${className}`}>
      {links.map(({ kind, url }) => {
        const { name, Icon, className: tint } = STYLE[kind];
        return (
          <a
            key={kind}
            href={url}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-1.5 rounded-full font-semibold shadow-sm transition hover:opacity-90 ${pad} ${tint}`}
          >
            <Icon size={size === "sm" ? 14 : 16} /> {name}
          </a>
        );
      })}
    </div>
  );
}
