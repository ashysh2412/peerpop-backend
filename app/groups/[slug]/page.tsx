import type { Metadata } from "next";
import { ArrowLeft, Lock, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { GroupBadge } from "@/components/group-badge";
import { PostCard } from "@/components/post-card";
import { PostComposer } from "@/components/post-composer";
import { CardsSkeleton } from "@/components/skeleton";
import { CITIES, labelFor } from "@/lib/catalog";
import { FEED_PAGE } from "@/lib/feed/data";
import { getGroup, getGroupFeed, getMembers, getRequests } from "@/lib/groups/data";
import { requireUser } from "@/lib/profile/data";
import { ensureProfile } from "@/lib/profile/ensure";
import { joinGroup, leaveGroup, removeMember, respondToRequest } from "../actions";

export const metadata: Metadata = { title: "Group · Peerpop" };

function currentTime() {
  return Date.now();
}

export default function GroupPage({ params, searchParams }: PageProps<"/groups/[slug]">) {
  return (
    <main className="page-narrow flex flex-col gap-5">
      <Link href="/groups" className="flex items-center gap-1.5 self-start text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={16} /> All groups
      </Link>
      <Suspense fallback={<CardsSkeleton />}>
        <Group params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Group({ params, searchParams }: PageProps<"/groups/[slug]">) {
  const { slug } = await params;
  const { tab, before, note } = await searchParams;
  const { supabase, user } = await requireUser(`/groups/${slug}`);
  const group = await getGroup(supabase, slug);
  if (!group) notFound();
  const isMember = group.my_status === "member";
  const isAdmin = isMember && group.my_role === "admin";
  const canRead = isMember || group.join_type === "open";
  const view = tab === "members" ? "members" : tab === "requests" && isAdmin ? "requests" : "posts";
  const cursor = typeof before === "string" && !Number.isNaN(Date.parse(before)) ? before : null;

  const [{ profile }, posts, members, requests] = await Promise.all([
    ensureProfile(supabase, user),
    canRead && view === "posts" ? getGroupFeed(supabase, group.id, cursor) : Promise.resolve([]),
    canRead && view === "members" ? getMembers(supabase, group.id) : Promise.resolve([]),
    isAdmin ? getRequests(supabase, group.id) : Promise.resolve([]),
  ]);
  const now = currentTime();

  return (
    <>
      <header className="card flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <GroupBadge name={group.name} size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span className="flex items-center gap-1">
                <Users size={14} /> {group.member_count} {group.member_count === 1 ? "member" : "members"}
              </span>
              {group.join_type === "approval" && (
                <span className="flex items-center gap-1">
                  <Lock size={14} /> Members only
                </span>
              )}
              {isAdmin && <span className="chip-brand">You&apos;re an admin</span>}
            </p>
          </div>
        </div>
        {group.about && <p className="whitespace-pre-line text-[15px] leading-relaxed">{group.about}</p>}
        <div className="flex flex-wrap gap-2">
          {isMember ? (
            <form action={leaveGroup}>
              <input type="hidden" name="group_id" value={group.id} />
              <button className="btn-secondary btn-sm">Leave group</button>
            </form>
          ) : group.my_status === "pending" ? (
            <form action={leaveGroup} className="flex items-center gap-2">
              <input type="hidden" name="group_id" value={group.id} />
              <span className="chip">Request sent</span>
              <button className="btn-ghost btn-sm">Cancel request</button>
            </form>
          ) : (
            <form action={joinGroup}>
              <input type="hidden" name="group_id" value={group.id} />
              <button className="btn-primary">{group.join_type === "open" ? "Join group" : "Ask to join"}</button>
            </form>
          )}
        </div>
        {note === "last-admin" && (
          <p className="rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand-ink">
            You&apos;re the only admin, so you can&apos;t leave while the group has other members.
          </p>
        )}
      </header>

      {canRead ? (
        <>
          <nav className="tabs self-start">
            <Link href={`/groups/${slug}`} className={view === "posts" ? "tab-active" : "tab"}>
              Posts
            </Link>
            <Link href={`/groups/${slug}?tab=members`} className={view === "members" ? "tab-active" : "tab"}>
              Members
            </Link>
            {isAdmin && (
              <Link href={`/groups/${slug}?tab=requests`} className={view === "requests" ? "tab-active" : "tab"}>
                Requests{" "}
                {requests.length > 0 && <span className="ml-1 rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">{requests.length}</span>}
              </Link>
            )}
          </nav>

          {view === "posts" && (
            <div className="flex flex-col gap-4">
              {isMember && !cursor && (
                <PostComposer
                  userId={user.id}
                  firstName={profile.display_name.split(" ")[0]}
                  name={profile.display_name}
                  photo={profile.photo_path}
                  groupId={group.id}
                  placeholder={`Share something with ${group.name}`}
                />
              )}
              {posts.length === 0 ? (
                <div className="empty">
                  <span className="text-4xl">💬</span>
                  <p className="font-semibold text-ink">No posts yet</p>
                  <p className="text-sm">{isMember ? "Say hello and start the conversation." : "Join to start the conversation."}</p>
                </div>
              ) : (
                posts.map((p) => <PostCard key={p.id} post={p} me={user.id} now={now} canModerate={isAdmin} />)
              )}
              {posts.length === FEED_PAGE && (
                <Link href={`/groups/${slug}?before=${encodeURIComponent(posts[posts.length - 1].created_at)}`} className="btn-secondary self-center">
                  Older posts
                </Link>
              )}
            </div>
          )}

          {view === "members" && (
            <ul className="card divide-y divide-line overflow-hidden">
              {members.map((m) => (
                <li key={m.user_id} className="flex items-center gap-3 p-4">
                  <Link href={`/creators/${m.profile!.handle}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar path={m.profile!.photo_path} name={m.profile!.display_name} size={44} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold hover:underline">{m.profile!.display_name}</span>
                      <span className="block text-xs text-muted">
                        {m.role === "admin" ? "Admin" : m.profile!.city_slug ? labelFor(CITIES, m.profile!.city_slug) : "Member"}
                      </span>
                    </span>
                  </Link>
                  {isAdmin && m.user_id !== user.id && (
                    <form action={removeMember}>
                      <input type="hidden" name="group_id" value={group.id} />
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <button className="btn-ghost btn-sm">Remove</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}

          {view === "requests" &&
            (requests.length === 0 ? (
              <div className="empty">
                <span className="text-4xl">📭</span>
                <p className="font-semibold text-ink">No requests right now</p>
              </div>
            ) : (
              <ul className="card divide-y divide-line overflow-hidden">
                {requests.map((r) => (
                  <li key={r.user_id} className="flex items-center gap-3 p-4">
                    <Link href={`/creators/${r.profile!.handle}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar path={r.profile!.photo_path} name={r.profile!.display_name} size={44} />
                      <span className="truncate font-semibold hover:underline">{r.profile!.display_name}</span>
                    </Link>
                    <form action={respondToRequest} className="flex gap-2">
                      <input type="hidden" name="group_id" value={group.id} />
                      <input type="hidden" name="user_id" value={r.user_id} />
                      <button name="accept" value="0" className="btn-secondary btn-sm">
                        Decline
                      </button>
                      <button name="accept" value="1" className="btn-primary btn-sm">
                        Accept
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            ))}
        </>
      ) : (
        <div className="empty">
          <span className="text-4xl">🔒</span>
          <p className="font-semibold text-ink">Only members can see the posts</p>
          <p className="text-sm">Ask to join, and an admin will let you in.</p>
        </div>
      )}
    </>
  );
}
