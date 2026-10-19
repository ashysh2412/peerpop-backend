import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { VideoEmbed } from "@/components/video-embed";
import { CITIES, LANGUAGES, NICHES, SKILLS, labelFor } from "@/lib/catalog";
import { compactNumber } from "@/lib/format";
import { avatarUrl } from "@/lib/profile/avatar";
import { getProfileByHandle, getPublicPlatforms, getVideos } from "@/lib/profile/data";
import type { PlatformAccount } from "@/lib/profile/types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Creator · Peerpop" };

export default function CreatorPage({ params, searchParams }: PageProps<"/creators/[handle]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12">
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
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
    {
      data: { user },
    },
  ] = await Promise.all([
    getPublicPlatforms(supabase, profile.user_id),
    getVideos(supabase, profile.user_id),
    supabase.auth.getUser(),
  ]);
  const isMe = user?.id === profile.user_id;
  const photo = avatarUrl(profile.photo_path);

  return (
    <>
      {isMe && query.welcome && (
        <p className="rounded-xl bg-violet-50 p-4 text-violet-900 dark:bg-violet-950 dark:text-violet-100">
          Your profile is live. Add more videos and contact details in{" "}
          <Link href="/settings/profile" className="font-medium underline">
            settings
          </Link>
          .
        </p>
      )}

      <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          {photo && <Image src={photo} alt={profile.display_name} fill sizes="96px" className="object-cover" />}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <h1 className="text-2xl font-semibold">{profile.display_name}</h1>
          <p className="text-zinc-500">
            @{profile.handle}
            {profile.city_slug && <> · {labelFor(CITIES, profile.city_slug)}</>}
          </p>
          <div className="flex flex-wrap gap-2">
            {profile.open_to_collab && (
              <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-800 dark:bg-green-950 dark:text-green-300">
                Open to collab
              </span>
            )}
            {profile.niches.map((n) => (
              <span key={n} className="rounded-full bg-zinc-100 px-3 py-1 text-sm dark:bg-zinc-900">
                {labelFor(NICHES, n)}
              </span>
            ))}
          </div>
        </div>
        {isMe && (
          <Link
            href="/settings/profile"
            className="inline-flex h-10 items-center self-start rounded-full border border-zinc-300 px-5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Edit profile
          </Link>
        )}
      </header>

      {profile.bio && <p className="whitespace-pre-line text-zinc-700 dark:text-zinc-300">{profile.bio}</p>}

      {platforms.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-2">
          {platforms.map((p) => (
            <PlatformCard key={p.id} account={p} />
          ))}
        </section>
      )}

      {videos.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Videos</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {videos.map((v) => (
              <figure key={v.id} className="flex flex-col gap-2">
                <VideoEmbed video={v} />
                {v.title && <figcaption className="text-sm text-zinc-600 dark:text-zinc-400">{v.title}</figcaption>}
              </figure>
            ))}
          </div>
        </section>
      )}

      {(profile.skills.length > 0 || profile.languages.length > 0) && (
        <section className="grid gap-6 sm:grid-cols-2">
          {profile.skills.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-medium text-zinc-500">Skills</h2>
              <p>{profile.skills.map((s) => labelFor(SKILLS, s)).join(", ")}</p>
            </div>
          )}
          {profile.languages.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-medium text-zinc-500">Languages</h2>
              <p>{profile.languages.map((l) => labelFor(LANGUAGES, l)).join(", ")}</p>
            </div>
          )}
        </section>
      )}
    </>
  );
}

function PlatformCard({ account }: { account: PlatformAccount }) {
  const name = account.platform === "youtube" ? "YouTube" : "Instagram";
  const verified = account.source === "verified";
  const followers = compactNumber(account.self_followers);
  return (
    <a
      href={account.url ?? "#"}
      target="_blank"
      rel="noreferrer"
      className="flex flex-col gap-1 rounded-xl border border-zinc-200 p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
    >
      <span className="flex items-center gap-2 font-medium">
        {name}
        {verified ? (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            ✓ Verified
          </span>
        ) : (
          followers && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              Self-reported
            </span>
          )
        )}
      </span>
      <span className="text-sm text-zinc-500">{account.handle ?? account.url?.replace(/^https:\/\/(www\.)?/, "")}</span>
      {!verified && followers && (
        <span className="text-sm">
          {followers} followers
          {account.self_avg_views !== null && <> · {compactNumber(account.self_avg_views)} avg views</>}
        </span>
      )}
    </a>
  );
}
