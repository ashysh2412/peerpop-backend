import { BadgeCheck, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CITIES, NICHES, labelFor, type Niche } from "@/lib/catalog";
import type { ConnectionState } from "@/lib/connections/data";
import { compactNumber } from "@/lib/format";
import { avatarUrl } from "@/lib/profile/avatar";
import { ConnectPanel } from "./connect-panel";

export type CreatorRow = {
  user_id: string;
  handle: string;
  display_name: string;
  photo_path: string | null;
  city_slug: string | null;
  niches: Niche[];
  open_to_collab: boolean;
  max_followers: number | null;
  max_followers_verified: boolean;
  has_verified: boolean;
  avg_views: number | null;
  avg_views_verified: boolean;
  total_count: number;
};

// Creators without a photo get one of these, picked from their handle so it stays the same.
const TILES = [
  "from-orange-400 to-rose-500",
  "from-amber-300 to-orange-500",
  "from-rose-400 to-fuchsia-600",
  "from-teal-400 to-sky-600",
  "from-sky-400 to-indigo-600",
  "from-lime-400 to-emerald-600",
];

function tileFor(handle: string) {
  let h = 0;
  for (const c of handle) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TILES[h % TILES.length];
}

/** `viewer` is null when signed out, "me" on your own card, or how you're connected. */
export function CreatorCard({ row, viewer }: { row: CreatorRow; viewer: ConnectionState | "me" | null }) {
  const photo = avatarUrl(row.photo_path);
  const followers = row.max_followers === null ? null : compactNumber(row.max_followers);
  return (
    <div className="group flex flex-col overflow-hidden rounded-3xl border border-line bg-card transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-16px_color-mix(in_oklab,var(--brand)_40%,transparent)]">
      <Link href={`/creators/${row.handle}`} className={`relative block aspect-[4/5] overflow-hidden bg-gradient-to-br ${tileFor(row.handle)}`}>
        {photo ? (
          <Image src={photo} alt={row.display_name} fill sizes="(min-width: 1024px) 280px, 50vw" className="object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-7xl font-extrabold text-white/90">
            {row.display_name.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-3.5 pt-12 pb-3 text-white">
          <span className="flex items-center gap-1 font-bold">
            <span className="truncate">{row.display_name}</span>
            {row.has_verified && <BadgeCheck size={16} className="shrink-0" aria-label="Verified YouTube channel" />}
          </span>
          <span className="flex items-center gap-1 text-xs text-white/85">
            {row.city_slug && (
              <>
                <MapPin size={12} /> {labelFor(CITIES, row.city_slug)}
              </>
            )}
            {followers && (
              <span className="ml-auto font-semibold">
                {followers} {row.max_followers_verified ? "subs" : "followers"}
              </span>
            )}
          </span>
        </span>
        {row.open_to_collab && (
          <span className="absolute top-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow-sm">
            Open to collab
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-3">
        {row.niches.length > 0 && (
          <p className="truncate text-xs font-medium text-muted">{row.niches.map((n) => labelFor(NICHES, n)).join(" · ")}</p>
        )}
        <div className="mt-auto">
          {viewer === "me" ? (
            <Link href="/settings/profile" className="btn-secondary btn-sm w-full">
              Edit profile
            </Link>
          ) : viewer ? (
            <ConnectPanel otherId={row.user_id} name={row.display_name} state={viewer} compact />
          ) : (
            <Link href="/login?next=/creators" className="btn-secondary btn-sm w-full">
              Sign in to connect
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
