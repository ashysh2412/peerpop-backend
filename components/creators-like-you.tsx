import { MapPin, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { CITIES, NICHES, labelFor } from "@/lib/catalog";
import type { Match } from "@/lib/feed/data";
import { compactNumber } from "@/lib/format";
import { Avatar } from "./avatar";
import { ConnectPanel } from "./connect-panel";

/** Why this person is suggested, in a few words: "Pune · Food", or their own city when nothing matches. */
function Reason({ m }: { m: Match }) {
  const niche = m.why.niches[0] ?? null;
  if (!m.why.city && !niche) {
    return (
      <span className="chip w-full justify-center">
        <Sparkles size={11} className="shrink-0" /> <span className="truncate">New member</span>
      </span>
    );
  }
  return (
    <span className="chip-brand w-full justify-center">
      {m.why.city && <MapPin size={11} className="shrink-0" />}
      <span className="truncate">
        {[m.why.city && m.city_slug ? labelFor(CITIES, m.city_slug) : null, niche ? labelFor(NICHES, niche) : null].filter(Boolean).join(" · ")}
      </span>
    </span>
  );
}

/**
 * "Creators like you": a swipeable row in the Home feed of creators in your city or niche,
 * the people to do your next collab reel with. Renders nothing when there's nobody to suggest.
 */
export function CreatorsLikeYou({ people, seeAll }: { people: Match[]; seeAll: string }) {
  if (people.length === 0) return null;
  return (
    <section className="card overflow-hidden py-4">
      <div className="flex items-start justify-between gap-3 px-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Creators like you</h2>
          <p className="mt-0.5 text-xs text-muted">Ek reel. Do audience. Collab with creators in your city or niche.</p>
        </div>
        <Link href={seeAll} className="shrink-0 text-sm font-semibold text-brand-ink hover:underline">
          See all
        </Link>
      </div>
      <div className="mt-3 flex snap-x scroll-px-5 gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {people.map((m) => (
          <div key={m.user_id} className="flex w-[150px] shrink-0 snap-start flex-col items-center gap-2 rounded-2xl border border-line p-3 text-center">
            <Link href={`/creators/${m.handle}`} className="group flex w-full flex-col items-center gap-1.5">
              <Avatar path={m.photo_path} name={m.display_name} size={60} />
              <span className="w-full truncate text-sm font-semibold group-hover:underline">{m.display_name}</span>
              <span className="-mt-1 flex w-full items-center justify-center gap-1 truncate text-xs text-muted">
                <Users size={11} className="shrink-0" />
                {m.followers ? `${compactNumber(m.followers)} followers` : "Creator"}
              </span>
            </Link>
            <Reason m={m} />
            <div className="mt-auto w-full">
              <ConnectPanel otherId={m.user_id} name={m.display_name} state={{ kind: "none" }} compact />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
