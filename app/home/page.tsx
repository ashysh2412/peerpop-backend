import type { Metadata } from "next";
import { ArrowRight, Handshake, Settings, Users } from "lucide-react";
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
    <main className="page">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
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
    <div className="grid items-start gap-6 md:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)_280px]">
      <aside className="flex flex-col gap-4 md:sticky md:top-24">
        <section className="card hidden overflow-hidden md:block">
          <div className="h-16 bg-gradient-to-br from-violet-600 via-fuchsia-500 to-orange-400" />
          <div className="-mt-9 flex flex-col items-center gap-1 px-4 pb-4 text-center">
            <div className="rounded-full ring-4 ring-card">
              <Avatar path={profile.photo_path} name={profile.display_name} size={72} />
            </div>
            <Link href={`/creators/${profile.handle}`} className="mt-2 font-bold hover:underline">
              {profile.display_name}
            </Link>
            <p className="text-xs text-muted">
              @{profile.handle}
              {city && ` · ${city}`}
            </p>
          </div>
          <div className="flex flex-col border-t border-line p-2 text-sm">
            <Link href="/network" className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-medium hover:bg-sunken">
              <Users size={16} className="text-muted" />
              <span className="flex-1">Connections</span>
              <span className="font-bold text-brand">{connections ?? 0}</span>
            </Link>
            <Link href="/collabs?mine=1" className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-medium hover:bg-sunken">
              <Handshake size={16} className="text-muted" /> My collabs
            </Link>
            <Link href="/settings/profile" className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-medium hover:bg-sunken">
              <Settings size={16} className="text-muted" /> Edit profile
            </Link>
          </div>
        </section>
        {requests > 0 && (
          <Link href="/network?tab=received" className="card-link flex items-center gap-3 border-brand/30 bg-brand-soft p-4 text-sm font-semibold text-brand-ink">
            <span className="flex-1">
              {requests} connection {requests === 1 ? "request" : "requests"} waiting
            </span>
            <ArrowRight size={16} />
          </Link>
        )}
      </aside>

      <section className="flex flex-col gap-4">
        {!cursor && <PostComposer userId={user.id} firstName={firstName} name={profile.display_name} photo={profile.photo_path} />}
        {posts.length === 0 && (
          <div className="empty">
            {cursor ? (
              "You're all caught up."
            ) : (
              <>
                <span className="text-4xl">✨</span>
                <p className="font-semibold text-ink">Your feed is quiet</p>
                <p className="max-w-sm text-sm">Share your first update, or find creators to connect with. Their posts will show up here.</p>
                <Link href="/creators" className="btn-primary btn-sm mt-1">
                  Find creators
                </Link>
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
      </section>

      <aside className="hidden flex-col gap-4 lg:sticky lg:top-24 lg:flex">
        <section className="card flex flex-col gap-4 p-4">
          <h2 className="font-bold">People you may know</h2>
          {suggestions.length === 0 && <p className="text-sm text-muted">No suggestions right now.</p>}
          {suggestions.map((s) => (
            <div key={s.user_id} className="flex flex-col gap-2.5">
              <Link href={`/creators/${s.handle}`} className="flex items-center gap-3">
                <Avatar path={s.photo_path} name={s.display_name} size={40} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold hover:underline">{s.display_name}</span>
                  <span className="block truncate text-xs text-muted">
                    {s.city_slug ? labelFor(CITIES, s.city_slug) : `@${s.handle}`}
                  </span>
                </span>
              </Link>
              <ConnectPanel otherId={s.user_id} name={s.display_name} state={{ kind: "none" }} compact />
            </div>
          ))}
          <Link href="/creators" className="flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
            Find more creators <ArrowRight size={14} />
          </Link>
        </section>
      </aside>
    </div>
  );
}
