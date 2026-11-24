import type { Metadata } from "next";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Fragment, Suspense } from "react";
import { CollabCall } from "@/components/collab-call";
import { CreatorsLikeYou } from "@/components/creators-like-you";
import { HomeHeader } from "@/components/home-header";
import { GetStarted, HomeRail } from "@/components/home-rail";
import { HomeTabs } from "@/components/home-tabs";
import { PixelSignedUp } from "@/components/meta-pixel";
import { PostCard } from "@/components/post-card";
import { PostComposer } from "@/components/post-composer";
import { ProfileSummary } from "@/components/profile-summary";
import { type Collab, listCollabs } from "@/lib/collabs/data";
import { FEED_PAGE, getFeed, getMatches, getNewCreators, getRecentJoins, getStarterSteps } from "@/lib/feed/data";
import { getOwnPlatforms, requireUser } from "@/lib/profile/data";
import { ensureProfile } from "@/lib/profile/ensure";
import { CardsSkeleton } from "@/components/skeleton";

export const metadata: Metadata = { title: "Home · Peerpop" };

function currentTime() {
  return Date.now();
}

export default function HomePage({ searchParams }: PageProps<"/home">) {
  return (
    <main className="page">
      <Suspense fallback={<CardsSkeleton />}>
        <Home searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** Your own open collabs first (so you can see they're live), then the ones that fit you: your city or a skill you have. */
function rankCollabs(collabs: Collab[], me: { user_id: string; city_slug: string | null; skills: string[] }) {
  const fit = (c: Collab) =>
    (c.author_id === me.user_id ? 10 : 0) +
    (c.city_slug && c.city_slug === me.city_slug ? 1 : 0) +
    (c.roles_needed.some((r) => me.skills.includes(r)) ? 1 : 0);
  return [...collabs].sort((a, b) => fit(b) - fit(a));
}

async function Home({ searchParams }: Pick<PageProps<"/home">, "searchParams">) {
  const { supabase, user } = await requireUser("/home");
  const { profile, created } = await ensureProfile(supabase, user);
  const { before, tab, welcome, note } = await searchParams;
  const showCollabs = tab === "collabs";
  const cursor = typeof before === "string" && !Number.isNaN(Date.parse(before)) ? before : null;

  const now = currentTime();
  const [posts, people, { collabs }, steps, newcomers, platforms] = await Promise.all([
    getFeed(supabase, cursor),
    cursor ? Promise.resolve([]) : getRecentJoins(supabase, user.id),
    listCollabs(supabase, { city: null, niche: null, role: null }, 0, new Date(now).toISOString()),
    getStarterSteps(supabase, profile),
    cursor ? Promise.resolve([]) : getNewCreators(supabase, user.id, 15),
    getOwnPlatforms(supabase, user.id),
  ]);
  const myFollowers = Math.max(0, ...platforms.map((a) => (a.source === "verified" ? a.stats?.followers : a.self_followers) ?? 0)) || null;
  const matches = cursor ? [] : await getMatches(supabase, profile, myFollowers);
  const matchIds = new Set(matches.map((m) => m.user_id));
  const seeAll = profile.city_slug ? `/creators?city=${profile.city_slug}` : profile.niches.length ? `/creators?niche=${profile.niches.join(",")}` : "/creators";
  const likeYou = <CreatorsLikeYou people={matches} seeAll={seeAll} />;
  const firstName = profile.display_name.split(" ")[0];
  const open = rankCollabs(collabs, profile);
  const feed = (
    <>
      {!cursor && <PostComposer userId={user.id} firstName={firstName} name={profile.display_name} photo={profile.photo_path} />}
      {!cursor && (
        <div className="lg:hidden">
          <GetStarted steps={steps} compact />
        </div>
      )}
      {posts.length === 0 && (
        <div className="empty">
          {cursor ? (
            "You're all caught up."
          ) : (
            <>
              <span className="text-4xl">✨</span>
              <p className="font-semibold text-ink">Your feed is quiet</p>
              <p className="max-w-sm text-sm">Share your first update, or tap a creator above to connect. Their posts will show up here.</p>
            </>
          )}
        </div>
      )}
      {!cursor && posts.length < 2 && likeYou}
      {posts.map((post, i) => (
        <Fragment key={post.id}>
          <PostCard post={post} me={user.id} now={now} />
          {!cursor && i === 1 && likeYou}
        </Fragment>
      ))}
      {posts.length === FEED_PAGE && (
        <Link href={`/home?before=${encodeURIComponent(posts[posts.length - 1].created_at)}`} className="btn-secondary self-center">
          Show older posts
        </Link>
      )}
    </>
  );

  return (
    <div className="mx-auto grid w-full max-w-[1240px] items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)_280px] lg:gap-5 xl:grid-cols-[260px_minmax(0,1fr)_320px] xl:gap-6">
      <ProfileSummary profile={profile} connections={steps.connections} posts={steps.posts} platforms={platforms} />
      <div className="flex min-w-0 flex-col gap-5">
        {!cursor && (
          <>
            <HomeHeader firstName={firstName} people={people} />
            {(note === "blocked" || note === "reported-blocked") && (
              <p className="rounded-2xl bg-sunken px-4 py-3 text-sm">
                {note === "blocked" ? "Blocked." : "Thanks for telling us. They're blocked."} You won&apos;t see each other on Peerpop. You can unblock
                them in{" "}
                <Link href="/settings/profile#blocked" className="font-semibold underline">
                  Settings
                </Link>
                .
              </p>
            )}
            {(welcome || created) && <PixelSignedUp userId={user.id} />}
            {(welcome || created) && (
              <p className="rounded-2xl bg-brand-soft px-4 py-3 text-sm text-brand-ink">
                🎉 <span className="font-semibold">You&apos;re in!</span> Say hello with a post, or{" "}
                <Link href="/settings/profile" className="font-semibold underline">
                  add your photo and what you make
                </Link>
                .
              </p>
            )}
          </>
        )}

        {cursor ? (
          feed
        ) : (
          <HomeTabs
            initial={showCollabs ? "collabs" : "feed"}
            collabCount={open.length}
            feed={feed}
            collabs={
              <>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted">Open collabs, the ones that fit you first.</p>
                  <Link href="/collabs/new" className="btn-primary btn-sm">
                    <Plus size={15} /> Post a collab
                  </Link>
                </div>
                {open.length === 0 ? (
                  <div className="empty">
                    <span className="text-4xl">🤝</span>
                    <p className="font-semibold text-ink">No open collabs yet</p>
                    <p className="max-w-sm text-sm">Be the first: post what you&apos;re planning and who you need.</p>
                  </div>
                ) : (
                  open.map((c) => <CollabCall key={c.id} collab={c} mine={c.author_id === user.id} />)
                )}
                <Link href="/collabs" className="btn-secondary self-center">
                  Search all collabs
                </Link>
              </>
            }
          />
        )}
      </div>
      <HomeRail steps={steps} collabs={collabs.slice(0, 4)} people={newcomers.filter((p) => !matchIds.has(p.user_id)).slice(0, 5)} />
    </div>
  );
}
