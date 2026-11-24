import { ArrowRight, MapPin, Scale, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { CITIES, NICHES, labelFor } from "@/lib/catalog";
import type { Match } from "@/lib/feed/data";
import { compactNumber } from "@/lib/format";
import { Avatar } from "./avatar";
import { ConnectPanel } from "./connect-panel";

/** Why this person is suggested, in a few words: "Pune · Food", "Similar audience", or "New member". */
function Reason({ m }: { m: Match }) {
  const niche = m.why.niches[0] ?? null;
  if (!m.why.city && !niche && m.why.size) {
    return (
      <span className="chip-brand w-full justify-center">
        <Scale size={11} className="shrink-0" /> <span className="truncate">Similar audience</span>
      </span>
    );
  }
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

/** The reason as plain words for the rail list: "Pune · Food", "Similar audience", "New member". */
function reasonText(m: Match) {
  const niche = m.why.niches[0] ?? null;
  const parts = [m.why.city && m.city_slug ? labelFor(CITIES, m.city_slug) : null, niche ? labelFor(NICHES, niche) : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : m.why.size ? "Similar audience" : "New member";
}

/** "city, niche and follower count" from the parts of your profile that are missing. */
function listOf(items: string[]) {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function Nudge({ missing, className = "" }: { missing: string[]; className?: string }) {
  if (missing.length === 0) return null;
  return (
    <Link
      href="/settings/profile"
      className={`flex items-center gap-2 rounded-xl bg-brand-soft px-3 py-2 text-xs text-brand-ink transition hover:brightness-95 ${className}`}
    >
      <span className="min-w-0 flex-1">
        <span className="font-semibold">Get better Jodi matches:</span> add your {listOf(missing)}.
      </span>
      <ArrowRight size={14} className="shrink-0" />
    </Link>
  );
}

/** "Your collab Jodi" as a list for the right-hand column on Home (laptops and wider). */
export function JodiRail({ people, seeAll, missing }: { people: Match[]; seeAll: string; missing: string[] }) {
  if (people.length === 0) return null;
  return (
    <section className="card flex flex-col gap-3 p-4">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Your collab Jodi</h2>
          <Link href={seeAll} className="text-xs font-semibold text-brand-ink hover:underline">
            See all
          </Link>
        </div>
        <p className="mt-0.5 text-xs text-muted">Ek reel. Do audience. Creators who could swap audiences with you.</p>
      </div>
      <ul className="flex flex-col gap-3">
        {people.map((m) => (
          <li key={m.user_id} className="flex items-center gap-3">
            <Link href={`/creators/${m.handle}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar path={m.photo_path} name={m.display_name} size={36} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold hover:underline">{m.display_name}</span>
                <span className="block truncate text-xs text-muted">
                  {reasonText(m)}
                  {m.followers ? ` · ${compactNumber(m.followers)}` : ""}
                </span>
              </span>
            </Link>
            <div className="w-24 shrink-0">
              <ConnectPanel otherId={m.user_id} name={m.display_name} state={{ kind: "none" }} compact />
            </div>
          </li>
        ))}
      </ul>
      <Nudge missing={missing} />
    </section>
  );
}

/**
 * "Your collab Jodi": a swipeable row in the Home feed of creators in your city or niche with a
 * similar audience, the people to do your next collab reel with. When your profile is missing
 * what matching uses, a one-line nudge asks for it. Renders nothing when there's nobody to suggest.
 */
export function CreatorsLikeYou({ people, seeAll, missing }: { people: Match[]; seeAll: string; missing: string[] }) {
  if (people.length === 0) return null;
  return (
    <section className="card overflow-hidden py-4">
      <div className="flex items-start justify-between gap-3 px-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Your collab Jodi</h2>
          <p className="mt-0.5 text-xs text-muted">Ek reel. Do audience. Creators in your city or niche who could swap audiences with you.</p>
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
      <Nudge missing={missing} className="mx-5 mt-3" />
    </section>
  );
}
