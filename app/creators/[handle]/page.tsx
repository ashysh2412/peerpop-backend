import type { Metadata } from "next";
import { BadgeCheck, ChevronRight, Handshake, ImagePlus, MapPin, MessageCircle, Pencil, Plus, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ProfileLink } from "@/components/profile-link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { ContactBox } from "@/components/contact-box";
import { postImageUrl } from "@/components/post-card";
import { ConnectPanel } from "@/components/connect-panel";
import { VideoEmbed } from "@/components/video-embed";
import { YouTubeStats } from "@/components/youtube-stats";
import { CITIES, LANGUAGES, NICHES, SKILLS, labelFor } from "@/lib/catalog";
import { getOpenCollabsBy } from "@/lib/collabs/data";
import { getConnection, getContactFor, getMutualCount, stateFor } from "@/lib/connections/data";
import { getPhotosBy } from "@/lib/feed/data";
import { compactNumber } from "@/lib/format";
import { getProfileByHandle, getPublicPlatforms, getVideos } from "@/lib/profile/data";
import type { PlatformAccount } from "@/lib/profile/types";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/supabase/session";
import { CardsSkeleton } from "@/components/skeleton";

export const metadata: Metadata = { title: "Creator · Peerpop" };

function currentTime() {
  return Date.now();
}

export default function CreatorPage({ params }: PageProps<"/creators/[handle]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-7 px-4 py-6 sm:py-10">
      <Suspense fallback={<CardsSkeleton />}>
        <Creator params={params} />
      </Suspense>
    </main>
  );
}

async function Creator({ params }: Pick<PageProps<"/creators/[handle]">, "params">) {
  const { handle } = await params;
  const supabase = await createClient();
  const profile = await getProfileByHandle(supabase, decodeURIComponent(handle));
  if (!profile) notFound();

  const [
    platforms,
    videos,
    photos,
    collabs,
    {
      data: { user },
    },
  ] = await Promise.all([
    getPublicPlatforms(supabase, profile.user_id),
    getVideos(supabase, profile.user_id),
    getPhotosBy(supabase, profile.user_id),
    getOpenCollabsBy(supabase, profile.user_id, new Date(currentTime()).toISOString()),
    getSessionUser(supabase),
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
  const stats = headlineStats(platforms);

  return (
    <>
      {isMe && <ProfileLink handle={profile.handle} />}

      <header className="flex flex-col items-center gap-5 pt-2 text-center sm:flex-row sm:items-start sm:gap-7 sm:text-left">
        <div className="shrink-0 rounded-full bg-brand-gradient p-[3px]">
          <div className="rounded-full bg-surface p-[3px]">
            <Avatar path={profile.photo_path} name={profile.display_name} size={128} />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-3 sm:items-start">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <h1 className="flex items-center gap-1.5 text-3xl font-semibold tracking-tight">
              <span className="truncate">{profile.display_name}</span>
              {verified && <BadgeCheck size={24} className="shrink-0 text-brand" aria-label="Verified YouTube channel" />}
            </h1>
            <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted sm:justify-start">
              {city && (
                <span className="flex items-center gap-1">
                  <MapPin size={14} /> {city}
                </span>
              )}
              {mutual > 0 && (
                <span className="flex items-center gap-1">
                  <Users size={14} /> {mutual} mutual
                </span>
              )}
              {profile.open_to_collab && <span className="chip-green">Open to collab</span>}
            </p>
          </div>

          {/* What they can do comes first: it's what collaborators look for. */}
          {profile.skills.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              {profile.skills.map((s, i) => (
                <span
                  key={s}
                  className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-ink ${["bg-pop-yellow/60", "bg-pop-sky/60", "bg-pop-mint/60", "bg-pop-coral/45", "bg-pop-lilac/80"][i % 5]}`}
                >
                  {labelFor(SKILLS, s)}
                </span>
              ))}
            </div>
          )}
          {(profile.niches.length > 0 || profile.languages.length > 0) && (
            <p className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {profile.niches.map((n) => (
                <span key={n} className="chip-brand px-3 py-1 text-[13px]">
                  {labelFor(NICHES, n)}
                </span>
              ))}
              {profile.languages.map((l) => (
                <span key={l} className="chip px-3 py-1 text-[13px]">
                  {labelFor(LANGUAGES, l)}
                </span>
              ))}
            </p>
          )}
          {profile.bio && <p className="max-w-xl leading-relaxed whitespace-pre-line">{profile.bio}</p>}

          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            {user && !isMe && <ConnectPanel otherId={profile.user_id} name={profile.display_name} state={stateFor(user.id, connection)} />}
            {user && !isMe && connection?.status === "accepted" && (
              <Link href={`/messages/${profile.handle}`} className="btn-primary">
                <MessageCircle size={16} /> Message
              </Link>
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
      </header>

      {stats.length > 0 && (
        <dl className="grid grid-cols-3 divide-x divide-line rounded-3xl border border-line bg-card py-4">
          {stats.map(([label, value, isVerified]) => (
            <div key={label} className="flex flex-col items-center gap-0.5 px-2 text-center">
              <dd className="flex items-center gap-1 text-xl font-semibold tracking-tight sm:text-2xl">
                {value}
                {isVerified && <BadgeCheck size={16} className="text-brand" aria-label="Verified" />}
              </dd>
              <dt className="text-xs font-medium text-muted">{label}</dt>
            </div>
          ))}
        </dl>
      )}

      {contact && <ContactBox name={profile.display_name} contact={contact} />}

      {(videos.length > 0 || isMe) && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Work</h2>
            {isMe && videos.length > 0 && videos.length < 6 && (
              <Link href="/settings/profile#videos" className="btn-secondary btn-sm">
                <Plus size={15} /> Add video
              </Link>
            )}
          </div>
          {isMe && videos.length === 0 && (
            <Link href="/settings/profile#videos" className="empty transition hover:border-brand/40">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-gradient text-white">
                <Plus size={22} />
              </span>
              <p className="font-semibold text-ink">Add your best videos</p>
              <p className="max-w-sm text-sm">Paste YouTube or Instagram links. They play right here, so collaborators can see your work.</p>
            </Link>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {videos.map((v) => (
              <figure key={v.id} className="flex flex-col gap-2">
                <VideoEmbed video={v} />
                {v.title && <figcaption className="line-clamp-2 text-xs font-medium text-muted">{v.title}</figcaption>}
              </figure>
            ))}
          </div>
        </section>
      )}

      {(photos.length > 0 || isMe) && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Photos</h2>
            {isMe && photos.length > 0 && (
              <Link href="/home#compose" className="btn-secondary btn-sm">
                <ImagePlus size={15} /> Add photo
              </Link>
            )}
          </div>
          {isMe && photos.length === 0 && (
            <Link href="/home#compose" className="empty transition hover:border-brand/40">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-gradient text-white">
                <ImagePlus size={22} />
              </span>
              <p className="font-semibold text-ink">Add photos of your work</p>
              <p className="max-w-sm text-sm">Post a photo from Home and it shows up here too, so collaborators can see your style.</p>
            </Link>
          )}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-2xl sm:gap-1.5">
              {photos.map((ph) => (
                <Link key={ph.id} href={`/posts/${ph.id}`} className="relative aspect-square overflow-hidden bg-sunken">
                  <Image
                    src={postImageUrl(ph.image_path)}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 250px, 33vw"
                    className="object-cover transition duration-300 hover:scale-105"
                  />
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {collabs.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Open collabs</h2>
          {collabs.map((c) => (
            <Link key={c.id} href={`/collabs/${c.id}`} className="card-link flex items-center gap-3 p-4">
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
          ))}
        </section>
      )}

      {platforms.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Channels</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {platforms.map((p) => (
              <PlatformCard key={p.id} account={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

/** The three numbers shown under the name, from the verified channel when there is one. */
function headlineStats(platforms: PlatformAccount[]): [string, string, boolean][] {
  const main = platforms.find((p) => p.source === "verified" && p.stats) ?? platforms.find((p) => p.self_followers !== null);
  if (!main) return [];
  const v = main.source === "verified" && main.stats ? main.stats : null;
  const followers = v ? (v.followers_hidden ? "Hidden" : compactNumber(v.followers)) : compactNumber(main.self_followers);
  const views = v ? compactNumber(v.avg_views_last10) : compactNumber(main.self_avg_views);
  const uploads = v?.uploads_per_week ?? null;
  return [
    [main.platform === "youtube" ? "Subscribers" : "Followers", followers ?? "–", !!v],
    ["Avg views", views ?? "–", !!v && views !== null],
    uploads !== null
      ? ["Videos a week", uploads >= 1 ? String(uploads) : `${Math.round(uploads * 4)}/mo`, true]
      : ["Platforms", String(platforms.length), false],
  ];
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
