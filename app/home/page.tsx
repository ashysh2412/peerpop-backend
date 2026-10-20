import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { ConnectPanel } from "@/components/connect-panel";
import { PostCard } from "@/components/post-card";
import { PostComposer } from "@/components/post-composer";
import { CITIES, labelFor } from "@/lib/catalog";
import { countReceived } from "@/lib/connections/data";
import { FEED_PAGE, getFeed, getSuggestions } from "@/lib/feed/data";
import { getProfileById, requireUser } from "@/lib/profile/data";

export const metadata: Metadata = { title: "Home · Peerpop" };

function currentTime() {
  return Date.now();
}

export default function HomePage({ searchParams }: PageProps<"/home">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <Home searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Home({ searchParams }: Pick<PageProps<"/home">, "searchParams">) {
  const { supabase, user } = await requireUser("/home");
  const profile = await getProfileById(supabase, user.id);
  if (!profile) redirect("/onboarding");
  const { before } = await searchParams;
  const cursor = typeof before === "string" && !Number.isNaN(Date.parse(before)) ? before : null;

  const [posts, requests, suggestions, { count: connections }] = await Promise.all([
    getFeed(supabase, cursor),
    countReceived(supabase, user.id),
    getSuggestions(supabase, profile),
    supabase
      .from("connections")
      .select("id", { count: "exact", head: true })
      .eq("status", "accepted")
      .or(`from_user.eq.${user.id},to_user.eq.${user.id}`),
  ]);
  const now = currentTime();
  const city = profile.city_slug ? labelFor(CITIES, profile.city_slug) : null;
  const firstName = profile.display_name.split(" ")[0];

  return (
    <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[220px_minmax(0,1fr)_260px]">
      <aside className="flex flex-col gap-4">
        <section className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-200 p-4 text-center dark:border-zinc-800">
          <Avatar path={profile.photo_path} name={profile.display_name} size={64} />
          <Link href={`/creators/${profile.handle}`} className="font-semibold hover:underline">
            {profile.display_name}
          </Link>
          <p className="text-xs text-zinc-500">
            @{profile.handle}
            {city && ` · ${city}`}
          </p>
          <div className="mt-2 flex w-full flex-col gap-1 border-t border-zinc-100 pt-3 text-sm dark:border-zinc-900">
            <Link href="/network" className="flex justify-between rounded-lg px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-900">
              <span>Connections</span>
              <b>{connections ?? 0}</b>
            </Link>
            <Link href="/settings/profile" className="rounded-lg px-2 py-1 text-left hover:bg-zinc-100 dark:hover:bg-zinc-900">
              Edit profile
            </Link>
          </div>
        </section>
        {requests > 0 && (
          <Link
            href="/network?tab=received"
            className="rounded-2xl bg-violet-50 p-4 text-sm font-medium text-violet-900 hover:bg-violet-100 dark:bg-violet-950 dark:text-violet-100"
          >
            You have {requests} connection {requests === 1 ? "request" : "requests"} waiting →
          </Link>
        )}
      </aside>

      <section className="flex flex-col gap-4">
        {!cursor && <PostComposer userId={user.id} firstName={firstName} />}
        {posts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
            {cursor ? (
              "You're all caught up."
            ) : (
              <>
                No posts yet. Share the first update, or{" "}
                <Link href="/creators" className="text-violet-600 hover:underline">
                  find creators
                </Link>{" "}
                to connect with.
              </>
            )}
          </div>
        )}
        {posts.map((post) => (
          <PostCard key={post.id} post={post} me={user.id} now={now} />
        ))}
        {posts.length === FEED_PAGE && (
          <Link
            href={`/home?before=${encodeURIComponent(posts[posts.length - 1].created_at)}`}
            className="self-center rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Show older posts
          </Link>
        )}
      </section>

      <aside className="hidden flex-col gap-4 lg:flex">
        <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="font-semibold">People you may know</h2>
          {suggestions.length === 0 && <p className="text-sm text-zinc-500">No suggestions right now.</p>}
          {suggestions.map((s) => (
            <div key={s.user_id} className="flex flex-col gap-2">
              <Link href={`/creators/${s.handle}`} className="flex items-center gap-2">
                <Avatar path={s.photo_path} name={s.display_name} size={36} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{s.display_name}</span>
                  <span className="block truncate text-xs text-zinc-500">
                    {s.city_slug ? labelFor(CITIES, s.city_slug) : `@${s.handle}`}
                  </span>
                </span>
              </Link>
              <ConnectPanel otherId={s.user_id} name={s.display_name} state={{ kind: "none" }} compact />
            </div>
          ))}
          <Link href="/creators" className="text-sm text-violet-600 hover:underline">
            Find more creators →
          </Link>
        </section>
      </aside>
    </div>
  );
}
