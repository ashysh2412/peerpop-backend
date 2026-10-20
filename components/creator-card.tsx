import { BadgeCheck, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CITIES, NICHES, labelFor, type Niche } from "@/lib/catalog";
import type { ConnectionState } from "@/lib/connections/data";
import { compactNumber } from "@/lib/format";
import { avatarUrl } from "@/lib/profile/avatar";
import { tintFor } from "@/lib/tint";
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

/** `viewer` is null when signed out, "me" on your own card, or how you're connected. */
export function CreatorCard({ row, viewer }: { row: CreatorRow; viewer: ConnectionState | "me" | null }) {
  const photo = avatarUrl(row.photo_path);
  const followers = row.max_followers === null ? null : compactNumber(row.max_followers);
  return (
    <div className="group flex flex-col overflow-hidden rounded-3xl border-2 border-ink bg-card shadow-[4px_4px_0_var(--ink)] transition hover:-translate-y-1 hover:-rotate-1 hover:shadow-[6px_6px_0_var(--ink)]">
      <Link href={`/creators/${row.handle}`} className={`relative block aspect-[4/5] overflow-hidden border-b-2 border-ink ${photo ? "bg-sunken" : tintFor(row.handle)}`}>
        {photo ? (
          <Image src={photo} alt={row.display_name} fill sizes="(min-width: 1024px) 280px, 50vw" className="object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <span className="flex h-full w-full items-center justify-center pb-16 text-8xl font-bold text-ink">{row.display_name.charAt(0).toUpperCase()}</span>
        )}
        <span
          className={`absolute inset-x-0 bottom-0 px-3.5 pb-3 ${photo ? "bg-gradient-to-t from-black/75 via-black/30 to-transparent pt-12 text-white" : "m-2 rounded-xl border-2 border-ink bg-card pt-2 pb-2 text-ink"}`}
        >
          <span className="flex items-center gap-1 font-bold">
            <span className="truncate">{row.display_name}</span>
            {row.has_verified && <BadgeCheck size={16} className="shrink-0" aria-label="Verified YouTube channel" />}
          </span>
          <span className={`flex items-center gap-1 text-xs ${photo ? "text-white/85" : "text-muted"}`}>
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
          <span className="absolute top-3 left-3 -rotate-3 rounded-full border-2 border-ink bg-pop-mint px-2.5 py-0.5 text-[11px] font-bold text-ink">
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
