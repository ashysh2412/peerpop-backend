import type { Metadata } from "next";
import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CollabCall } from "@/components/collab-call";
import { CreatorStories } from "@/components/creator-stories";
import { HomeSidebar } from "@/components/home-sidebar";
import { PostCard } from "@/components/post-card";
import { PostComposer } from "@/components/post-composer";
import { type Collab, listCollabs } from "@/lib/collabs/data";
import { countReceived } from "@/lib/connections/data";
import {
  FEED_PAGE,
  type FeedPost,
  getFeed,
  getSuggestions,
} from "@/lib/feed/data";
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

async function Home({
  searchParams,
}: Pick<PageProps<"/home">, "searchParams">) {
  const { supabase, user } = await requireUser("/home");
  const profile = await getProfileById(supabase, user.id);
  if (!profile) redirect("/onboarding");
  const { before } = await searchParams;
  const cursor =
    typeof before === "string" && !Number.isNaN(Date.parse(before))
      ? before
      : null;

  const now = currentTime();
  const [posts, requests, people, { collabs }] = await Promise.all([
    getFeed(supabase, cursor),
    countReceived(supabase, user.id),
    getSuggestions(supabase, profile, 12),
    cursor
      ? Promise.resolve({ collabs: [] as Collab[] })
      : listCollabs(
          supabase,
          { city: null, niche: null, role: null },
          0,
          new Date(now).toISOString(),
        ),
  ]);
  const firstName = profile.display_name.split(" ")[0];
  const others = collabs.filter((c) => c.author_id !== user.id);
  const calls = others.slice(0, 3);

  // A collab call after every third post, so open collabs stay in view.
  const items: (
    | { kind: "post"; post: FeedPost }
    | { kind: "collab"; collab: Collab }
  )[] = [];
  posts.forEach((post, i) => {
    items.push({ kind: "post", post });
    const call = (i + 1) % 3 === 0 ? calls[(i + 1) / 3 - 1] : undefined;
    if (call) items.push({ kind: "collab", collab: call });
  });
  if (posts.length < 3 && calls[0])
    items.push({ kind: "collab", collab: calls[0] });

  return (
    <div className="mx-auto grid w-full max-w-[980px] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-5">
        {!cursor && (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight">
                  Hey {firstName} 👋
                </h1>
                <p className="text-sm text-muted">
                  Creators to meet, and what they&apos;re making.
                </p>
              </div>
              <Link href="/collabs/new" className="btn-secondary btn-sm">
                <Plus size={15} /> Collab
              </Link>
            </div>
            <CreatorStories me={profile} people={people} />
            {requests > 0 && (
              <Link
                href="/network?tab=received"
                className="flex items-center gap-3 rounded-2xl bg-brand-soft px-4 py-3 text-sm font-semibold text-brand-ink transition hover:brightness-[0.98]"
              >
                <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-brand px-2 text-xs font-bold text-white">
                  {requests}
                </span>
                <span className="flex-1">
                  {requests === 1 ? "creator wants" : "creators want"} to
                  connect with you
                </span>
                <ArrowRight size={16} />
              </Link>
            )}
            <PostComposer
              userId={user.id}
              firstName={firstName}
              name={profile.display_name}
              photo={profile.photo_path}
            />
          </>
        )}

        {posts.length === 0 && (
          <div className="empty">
            {cursor ? (
              "You're all caught up."
            ) : (
              <>
                <span className="text-4xl">✨</span>
                <p className="font-semibold text-ink">Your feed is quiet</p>
                <p className="max-w-sm text-sm">
                  Share your first update, or tap a creator above to connect.
                  Their posts will show up here.
                </p>
              </>
            )}
          </div>
        )}
        {items.map((item) =>
          item.kind === "post" ? (
            <PostCard
              key={item.post.id}
              post={item.post}
              me={user.id}
              now={now}
            />
          ) : (
            <CollabCall key={item.collab.id} collab={item.collab} />
          ),
        )}
        {posts.length === FEED_PAGE && (
          <Link
            href={`/home?before=${encodeURIComponent(posts[posts.length - 1].created_at)}`}
            className="btn-secondary self-center"
          >
            Show older posts
          </Link>
        )}
      </div>
      {!cursor && (
        <HomeSidebar
          me={profile}
          people={people.slice(0, 5)}
          collabs={others.slice(0, 4)}
        />
      )}
    </div>
  );
}
