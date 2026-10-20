import type { Metadata } from "next";
import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CollabCall } from "@/components/collab-call";
import { CreatorStories } from "@/components/creator-stories";
import { GetStarted, HomeRail } from "@/components/home-rail";
import { PostCard } from "@/components/post-card";
import { PostComposer } from "@/components/post-composer";
import { type Collab, listCollabs } from "@/lib/collabs/data";
import { countReceived } from "@/lib/connections/data";
import { FEED_PAGE, type FeedPost, getFeed, getStarterSteps, getSuggestions } from "@/lib/feed/data";
import { getProfileById, requireUser } from "@/lib/profile/data";

export const metadata: Metadata = { title: "Home · Peerpop" };

function currentTime() {
  return Date.now();
}

export default function HomePage({ searchParams }: PageProps<"/home">) {
  return (
    <main className="page">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Home searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** Collabs that fit you first: your city or a skill you have, then everything else. */
function rankCollabs(collabs: Collab[], me: { user_id: string; city_slug: string | null; skills: string[] }) {
  const fit = (c: Collab) => (c.city_slug && c.city_slug === me.city_slug ? 1 : 0) + (c.roles_needed.some((r) => me.skills.includes(r)) ? 1 : 0);
  return collabs.filter((c) => c.author_id !== me.user_id).sort((a, b) => fit(b) - fit(a));
}

async function Home({ searchParams }: Pick<PageProps<"/home">, "searchParams">) {
  const { supabase, user } = await requireUser("/home");
  const profile = await getProfileById(supabase, user.id);
  if (!profile) redirect("/onboarding");
  const { before, tab, welcome } = await searchParams;
  const showCollabs = tab === "collabs";
  const cursor = !showCollabs && typeof before === "string" && !Number.isNaN(Date.parse(before)) ? before : null;

  const now = currentTime();
  const [posts, requests, people, { collabs }, steps] = await Promise.all([
    showCollabs ? Promise.resolve([] as FeedPost[]) : getFeed(supabase, cursor),
    countReceived(supabase, user.id),
    cursor ? Promise.resolve([]) : getSuggestions(supabase, profile, 12),
    listCollabs(supabase, { city: null, niche: null, role: null }, 0, new Date(now).toISOString()),
    getStarterSteps(supabase, profile),
  ]);
  const firstName = profile.display_name.split(" ")[0];
  const open = rankCollabs(collabs, profile);

  return (
    <div className="mx-auto grid w-full max-w-[1000px] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-5">
        {!cursor && (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Hey {firstName} 👋</h1>
                <p className="font-hand text-xl font-bold text-brand">Creators to meet, and what they&apos;re making.</p>
              </div>
            </div>
            {welcome && (
              <p className="rounded-2xl bg-brand-soft px-4 py-3 text-sm text-brand-ink">
                🎉 <span className="font-semibold">You&apos;re in, {firstName}!</span> Say hello with your first post, or tap a creator below to connect.
              </p>
            )}
            <CreatorStories me={profile} people={people} />
            {requests > 0 && (
              <Link
                href="/network?tab=received"
                className="flex items-center gap-3 rounded-2xl bg-brand-soft px-4 py-3 text-sm font-semibold text-brand-ink transition hover:brightness-[0.98]"
              >
                <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-brand px-2 text-xs font-bold text-white">{requests}</span>
                <span className="flex-1">{requests === 1 ? "creator wants" : "creators want"} to connect with you</span>
                <ArrowRight size={16} />
              </Link>
            )}
            <nav className="tabs sticky top-[72px] z-20 w-full shadow-sm">
              <Link href="/home" className={`flex-1 text-center ${showCollabs ? "tab" : "tab-active"}`}>
                Feed
              </Link>
              <Link href="/home?tab=collabs" className={`flex flex-1 items-center justify-center gap-1.5 ${showCollabs ? "tab-active" : "tab"}`}>
                Collabs
                {open.length > 0 && (
                  <span className={`rounded-full px-1.5 text-[11px] font-bold ${showCollabs ? "bg-card text-ink" : "bg-brand text-white"}`}>{open.length}</span>
                )}
              </Link>
            </nav>
          </>
        )}

        {showCollabs ? (
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
              open.map((c) => <CollabCall key={c.id} collab={c} />)
            )}
            <Link href="/collabs" className="btn-secondary self-center">
              Search all collabs
            </Link>
          </>
        ) : (
          <>
            {!cursor && (
              <div className="lg:hidden">
                <GetStarted steps={steps} handle={profile.handle} />
              </div>
            )}
            {!cursor && <PostComposer userId={user.id} firstName={firstName} name={profile.display_name} photo={profile.photo_path} />}
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
            {posts.map((post) => (
              <PostCard key={post.id} post={post} me={user.id} now={now} />
            ))}
            {posts.length === FEED_PAGE && (
              <Link href={`/home?before=${encodeURIComponent(posts[posts.length - 1].created_at)}`} className="btn-secondary self-center">
                Show older posts
              </Link>
            )}
          </>
        )}
      </div>
      <HomeRail handle={profile.handle} steps={steps} collabs={open.slice(0, 3)} people={people.slice(0, 4)} />
    </div>
  );
}
