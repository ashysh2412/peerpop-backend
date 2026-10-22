import type { Metadata } from "next";
import { Lock, Plus, Users } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { CardsSkeleton } from "@/components/skeleton";
import { type GroupSummary, getGroups } from "@/lib/groups/data";
import { requireUser } from "@/lib/profile/data";
import { joinGroup } from "./actions";
import { GroupBadge } from "@/components/group-badge";

export const metadata: Metadata = { title: "Groups · Peerpop" };

export default function GroupsPage({ searchParams }: PageProps<"/groups">) {
  return (
    <main className="page-narrow flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="mr-auto">
          <h1 className="page-title">Groups</h1>
          <p className="mt-1 text-muted">Meet creators who make what you make, or live where you live.</p>
        </div>
        <Link href="/groups/new" className="btn-primary">
          <Plus size={18} /> Start a group
        </Link>
      </div>
      <Suspense fallback={<CardsSkeleton />}>
        <Groups searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Groups({ searchParams }: Pick<PageProps<"/groups">, "searchParams">) {
  const { supabase } = await requireUser("/groups");
  const { tab } = await searchParams;
  const groups = await getGroups(supabase);
  const mine = groups.filter((g) => g.my_status === "member");
  const others = groups.filter((g) => g.my_status !== "member");
  const showMine = tab !== "discover" && mine.length > 0;
  const list = showMine ? mine : others;

  return (
    <>
      <nav className="tabs self-start">
        <Link href="/groups" className={showMine ? "tab-active" : "tab"}>
          Your groups {mine.length > 0 && <span className="text-muted">{mine.length}</span>}
        </Link>
        <Link href="/groups?tab=discover" className={!showMine ? "tab-active" : "tab"}>
          Discover
        </Link>
      </nav>
      {list.length === 0 ? (
        <div className="empty">
          <span className="text-4xl">👥</span>
          <p className="font-semibold text-ink">No groups yet</p>
          <p className="text-sm">Start the first one, like &quot;Pune food creators&quot; or &quot;Reel editors&quot;.</p>
          <Link href="/groups/new" className="btn-primary btn-sm mt-1">
            Start a group
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((g) => (
            <li key={g.id}>
              <GroupRow group={g} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function GroupRow({ group: g }: { group: GroupSummary }) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <GroupBadge name={g.name} />
      <Link href={`/groups/${g.slug}`} className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate font-bold hover:underline">
          {g.name}
          {g.join_type === "approval" && <Lock size={14} className="shrink-0 text-muted" aria-label="Ask to join" />}
        </p>
        <p className="flex items-center gap-1 text-sm text-muted">
          <Users size={14} /> {g.member_count} {g.member_count === 1 ? "member" : "members"}
          {g.about && <span className="truncate"> · {g.about}</span>}
        </p>
      </Link>
      {g.my_status === "member" ? (
        <Link href={`/groups/${g.slug}`} className="btn-secondary btn-sm">
          Open
        </Link>
      ) : g.my_status === "pending" ? (
        <span className="chip">Requested</span>
      ) : (
        <form action={joinGroup}>
          <input type="hidden" name="group_id" value={g.id} />
          <button className="btn-primary btn-sm">{g.join_type === "open" ? "Join" : "Ask to join"}</button>
        </form>
      )}
    </div>
  );
}
