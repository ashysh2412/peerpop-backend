import { BadgeCheck, MapPin } from "lucide-react";
import Link from "next/link";
import { CITIES, NICHES, labelFor, type Niche } from "@/lib/catalog";
import type { ConnectionState } from "@/lib/connections/data";
import { compactNumber } from "@/lib/format";
import { Avatar } from "./avatar";
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

function Stat({ value, label, verified }: { value: number | null; label: string; verified: boolean }) {
  return (
    <div className="flex-1 rounded-xl bg-sunken px-3 py-2.5">
      <p className="flex items-center gap-1 text-lg leading-tight font-extrabold">
        {value === null ? "–" : compactNumber(value)}
        {value !== null && verified && <BadgeCheck size={15} className="text-brand" aria-label="Verified on YouTube" />}
      </p>
      <p className="text-[11px] font-medium text-muted">
        {label}
        {value !== null && !verified && " · self-reported"}
      </p>
    </div>
  );
}

/** `viewer` is null when signed out, "me" on your own card, or how you're connected. */
export function CreatorCard({ row, viewer }: { row: CreatorRow; viewer: ConnectionState | "me" | null }) {
  const shown = row.niches.slice(0, 3);
  const extra = row.niches.length - shown.length;
  return (
    <div className="card-link flex flex-col gap-4 p-4">
      <Link href={`/creators/${row.handle}`} className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Avatar path={row.photo_path} name={row.display_name} size={56} />
          <div className="min-w-0">
            <p className="flex items-center gap-1 font-bold">
              <span className="truncate">{row.display_name}</span>
              {row.has_verified && <BadgeCheck size={17} className="shrink-0 text-brand" aria-label="Verified YouTube channel" />}
            </p>
            <p className="truncate text-sm text-muted">@{row.handle}</p>
            {row.city_slug && (
              <p className="flex items-center gap-1 text-xs text-muted">
                <MapPin size={12} /> {labelFor(CITIES, row.city_slug)}
              </p>
            )}
          </div>
        </div>
        {(row.niches.length > 0 || row.open_to_collab) && (
          <div className="flex flex-wrap gap-1.5">
            {row.open_to_collab && <span className="chip-green">Open to collab</span>}
            {shown.map((n) => (
              <span key={n} className="chip">
                {labelFor(NICHES, n)}
              </span>
            ))}
            {extra > 0 && <span className="chip">+{extra}</span>}
          </div>
        )}
        <div className="flex gap-2">
          <Stat value={row.max_followers} label="Followers" verified={row.max_followers_verified} />
          <Stat value={row.avg_views} label="Avg views" verified={row.avg_views_verified} />
        </div>
      </Link>
      <div className="mt-auto">
        {viewer === "me" ? (
          <Link href="/settings/profile" className="btn-secondary btn-sm w-full">
            This is you · Edit profile
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
  );
}
