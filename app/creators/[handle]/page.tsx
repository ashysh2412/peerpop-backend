import type { Metadata } from "next";
import { BadgeCheck, ChevronRight, Handshake, MapPin, Pencil, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { ContactBox } from "@/components/contact-box";
import { ConnectPanel } from "@/components/connect-panel";
import { VideoEmbed } from "@/components/video-embed";
import { YouTubeStats } from "@/components/youtube-stats";
import { CITIES, LANGUAGES, NICHES, SKILLS, labelFor } from "@/lib/catalog";
import { getOpenCollabsBy } from "@/lib/collabs/data";
import { getConnection, getContactFor, getMutualCount, stateFor } from "@/lib/connections/data";
import { compactNumber } from "@/lib/format";
import { getProfileByHandle, getPublicPlatforms, getVideos } from "@/lib/profile/data";
import type { PlatformAccount } from "@/lib/profile/types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Creator · Peerpop" };

function currentTime() {
  return Date.now();
}

export default function CreatorPage({ params, searchParams }: PageProps<"/creators/[handle]">) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Creator params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Creator({ params, searchParams }: Pick<PageProps<"/creators/[handle]">, "params" | "searchParams">) {
  const [{ handle }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const profile = await getProfileByHandle(supabase, decodeURIComponent(handle));
  if (!profile) notFound();

  const [
    platforms,
    videos,
    collabs,
    {
      data: { user },
    },
  ] = await Promise.all([
    getPublicPlatforms(supabase, profile.user_id),
    getVideos(supabase, profile.user_id),
    getOpenCollabsBy(supabase, profile.user_id, new Date(currentTime()).toISOString()),
    supabase.auth.getUser(),
  ]);
  const isMe = user?.id === profile.user_id;
  const [connection, mutual, contact] =
    user && !isMe
      ? await Promise.all([
          getConnection(supabase, user.id, profile.user_id),
          getMutualCount(supabase, profile.user_id),
          getContactFor(supabase, profile.user_id),
        ])
      : [null, 0, null];

  const city = profile.city_slug ? labelFor(CITIES, profile.city_slug) : null;
  const verified = platforms.some((p) => p.source === "verified");

  return (
    <>
      {isMe && query.welcome && (
        <p className="card border-brand/30 bg-brand-soft p-4 text-brand-ink">
          🎉 Your profile is live. Add more videos and contact details in{" "}
          <Link href="/settings/profile" className="font-semibold underline">
            Edit profile
          </Link>
          .
        </p>
      )}

      <header className="card overflow-hidden">
        <div className="h-28 bg-gradient-to-br from-violet-600 via-fuchsia-500 to-orange-400 sm:h-36" />
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:px-6">
          <div className="-mt-12 shrink-0 self-start rounded-full ring-4 ring-card sm:-mt-14">
            <Avatar path={profile.photo_path} name={profile.display_name} size={112} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1 sm:pb-1">
            <h1 className="flex items-center gap-1.5 text-2xl font-extrabold tracking-tight">
              <span className="truncate">{profile.display_name}</span>
              {verified && <BadgeCheck size={22} className="shrink-0 text-brand" aria-label="Verified YouTube channel" />}
            </h1>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span>@{profile.handle}</span>
              {city && (
                <span className="flex items-center gap-1">
                  <MapPin size={14} /> {city}
                </span>
              )}
              {mutual > 0 && (
                <span className="flex items-center gap-1">
                  <Users size={14} /> {mutual} mutual {mutual === 1 ? "connection" : "connections"}
                </span>
              )}
            </p>
          </div>
          <div className="sm:pb-1">
            {user && !isMe && (
              <ConnectPanel otherId={profile.user_id} name={profile.display_name} state={stateFor(user.id, connection)} />
            )}
            {!user && (
              <Link href={`/login?next=${encodeURIComponent(`/creators/${profile.handle}`)}`} className="btn-primary">
                Sign in to connect
              </Link>
            )}
            {isMe && (
              <Link href="/settings/profile" className="btn-secondary">
                <Pencil size={16} /> Edit profile
              </Link>
            )}
          </div>
        </div>
        {(profile.open_to_collab || profile.niches.length > 0 || profile.bio) && (
          <div className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:px-6">
            {profile.bio && <p className="leading-relaxed whitespace-pre-line">{profile.bio}</p>}
            <div className="flex flex-wrap gap-1.5">
              {profile.open_to_collab && <span className="chip-green px-3 py-1.5 text-[13px]">Open to collab</span>}
              {profile.niches.map((n) => (
                <span key={n} className="chip px-3 py-1.5 text-[13px]">
                  {labelFor(NICHES, n)}
                </span>
              ))}
            </div>
          </div>
        )}
      </header>

      {contact && <ContactBox name={profile.display_name} contact={contact} />}

      {platforms.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-2">
          {platforms.map((p) => (
            <PlatformCard key={p.id} account={p} />
          ))}
        </section>
      )}

      {collabs.length > 0 && (
        <section className="card flex flex-col gap-3 p-5 sm:p-6">
          <h2 className="text-lg font-bold">Open collabs</h2>
          <ul className="flex flex-col gap-2">
            {collabs.map((c) => (
              <li key={c.id}>
                <Link href={`/collabs/${c.id}`} className="flex items-center gap-3 rounded-xl border border-line p-3.5 transition hover:border-brand/30 hover:bg-card-hover">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <Handshake size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{c.title}</span>
                    <span className="block truncate text-xs text-muted">
                      Needs {c.roles_needed.map((r) => labelFor(SKILLS, r).toLowerCase()).join(", ")}
                      {c.city_slug && ` · ${labelFor(CITIES, c.city_slug)}`}
                    </span>
                  </span>
                  <ChevronRight size={18} className="text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {videos.length > 0 && (
        <section className="card flex flex-col gap-4 p-5 sm:p-6">
          <h2 className="text-lg font-bold">Videos</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {videos.map((v) => (
              <figure key={v.id} className="flex flex-col gap-2">
                <VideoEmbed video={v} />
                {v.title && <figcaption className="text-sm font-medium text-muted">{v.title}</figcaption>}
              </figure>
            ))}
          </div>
        </section>
      )}

      {(profile.skills.length > 0 || profile.languages.length > 0) && (
        <section className="card grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          {profile.skills.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-muted">Skills</h2>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((s) => (
                  <span key={s} className="chip-brand px-3 py-1.5 text-[13px]">
                    {labelFor(SKILLS, s)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {profile.languages.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-muted">Languages</h2>
              <div className="flex flex-wrap gap-1.5">
                {profile.languages.map((l) => (
                  <span key={l} className="chip px-3 py-1.5 text-[13px]">
                    {labelFor(LANGUAGES, l)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
}

const PLATFORM_STYLE = {
  youtube: { name: "YouTube", icon: "bg-red-600", glyph: "▶" },
  instagram: { name: "Instagram", icon: "bg-gradient-to-br from-amber-400 via-pink-500 to-violet-600", glyph: "◎" },
} as const;

function PlatformCard({ account }: { account: PlatformAccount }) {
  const style = PLATFORM_STYLE[account.platform];
  const verified = account.source === "verified";
  const followers = compactNumber(account.self_followers);
  return (
    <a href={account.url ?? "#"} target="_blank" rel="noreferrer" className="card-link flex flex-col gap-3 p-5">
      <span className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm text-white ${style.icon}`}>{style.glyph}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{style.name}</span>
          <span className="block truncate text-xs text-muted">{account.handle ?? account.url?.replace(/^https:\/\/(www\.)?/, "")}</span>
        </span>
        {verified ? (
          <span className="chip-brand">
            <BadgeCheck size={13} /> Verified
          </span>
        ) : (
          followers && <span className="chip">Self-reported</span>
        )}
      </span>
      {verified && account.stats && <YouTubeStats stats={account.stats} />}
      {!verified && followers && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-sunken px-3 py-2.5">
            <p className="text-[11px] font-medium text-muted">Followers</p>
            <p className="font-bold">{followers}</p>
          </div>
          {account.self_avg_views !== null && (
            <div className="rounded-xl bg-sunken px-3 py-2.5">
              <p className="text-[11px] font-medium text-muted">Avg views</p>
              <p className="font-bold">{compactNumber(account.self_avg_views)}</p>
            </div>
          )}
        </div>
      )}
    </a>
  );
}
