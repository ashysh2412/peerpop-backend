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

/**
 * Instagram and YouTube buttons that open the creator's channels. With `addHref`, a channel
 * that isn't added yet shows as an "Add" button in the same colours. `stack` puts them one below the other.
 */
export function SocialLinks({
  platforms,
  addHref,
  size = "md",
  stack = false,
  className = "",
}: {
  platforms: PlatformAccount[];
  addHref?: string;
  size?: "sm" | "md";
  stack?: boolean;
  className?: string;
}) {
  const links = (["instagram", "youtube"] as const).flatMap((kind) => {
    const url = platforms.find((a) => a.platform === kind && a.url)?.url;
    if (url) return [{ kind, href: url, added: true }];
    return addHref ? [{ kind, href: addHref, added: false }] : [];
  });
  if (links.length === 0) return null;
  const pad = size === "sm" ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-sm";
  const layout = stack ? "flex-col" : "flex-wrap justify-center sm:justify-start";
  return (
    <div className={`flex gap-2 ${layout} ${className}`}>
      {links.map(({ kind, href, added }) => {
        const { name, Icon, className: tint } = STYLE[kind];
        const look = `inline-flex items-center gap-1.5 rounded-full font-semibold shadow-sm transition hover:opacity-90 ${stack ? "justify-center" : ""} ${pad} ${tint}`;
        const icon = <Icon size={size === "sm" ? 14 : 16} />;
        return added ? (
          <a key={kind} href={href} target="_blank" rel="noreferrer" className={look}>
            {icon} {name}
          </a>
        ) : (
          <Link key={kind} href={href} className={`${look} opacity-80`}>
            <Plus size={size === "sm" ? 13 : 15} /> {icon} Add {name}
          </Link>
        );
      })}
    </div>
  );
}
