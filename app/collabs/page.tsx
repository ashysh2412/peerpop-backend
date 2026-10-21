import type { Metadata } from "next";
import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { CollabCard } from "@/components/collab-card";
import { CITIES, NICHES, SKILLS, type Niche, type Skill } from "@/lib/catalog";
import { COLLAB_PAGE, getMyCollabs, isOpen, listCollabs, type CollabFilters } from "@/lib/collabs/data";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/supabase/session";
import { CardsSkeleton } from "@/components/skeleton";

export const metadata: Metadata = { title: "Collabs · Peerpop" };

const selectClass = "input h-10 w-auto min-w-36 flex-1 text-sm sm:flex-none";

function currentTime() {
  return Date.now();
}

function one(v: string | string[] | undefined) {
  return typeof v === "string" ? v : null;
}

export default function CollabsPage({ searchParams }: PageProps<"/collabs">) {
  return (
    <main className="page flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="mr-auto">
          <h1 className="page-title">Collabs</h1>
          <p className="mt-1 text-muted">Find a shoot to join, or post an idea and pick who joins you.</p>
        </div>
        <Link href="/collabs/new" className="btn-primary">
          <Plus size={18} /> Post a collab
        </Link>
      </div>
      <Suspense fallback={<CardsSkeleton />}>
        <Collabs searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Collabs({ searchParams }: Pick<PageProps<"/collabs">, "searchParams">) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await getSessionUser(supabase);
  const now = currentTime();
  const mine = one(params.mine) === "1" && user;

  const tabs = user && (
    <nav className="tabs self-start">
      <Link href="/collabs" className={!mine ? "tab-active" : "tab"}>
        Browse
      </Link>
      <Link href="/collabs?mine=1" className={mine ? "tab-active" : "tab"}>
        My collabs
      </Link>
    </nav>
  );

  if (mine) {
    const posts = await getMyCollabs(supabase, user.id);
    return (
      <>
        {tabs}
        {posts.length === 0 ? (
          <div className="empty">
            <span className="text-4xl">🎬</span>
            <p className="font-semibold text-ink">You haven&apos;t posted a collab yet</p>
            <p className="text-sm">Describe your idea and who you need. Creators who are interested will raise a hand.</p>
            <Link href="/collabs/new" className="btn-primary btn-sm mt-1">
              Post a collab
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {posts.map((p) => (
              <li key={p.id}>
                <Link href={`/collabs/${p.id}`} className="card-link flex items-center gap-3 p-4">
                  <span className="min-w-0 flex-1 truncate font-semibold">{p.title}</span>
                  {p.waiting > 0 && <span className="chip-brand">{p.waiting} interested</span>}
                  <span className={isOpen(p, now) ? "chip-green" : "chip"}>{isOpen(p, now) ? "Open" : "Closed"}</span>
                  <ChevronRight size={18} className="text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  const city = one(params.city);
  const niche = one(params.niche);
  const role = one(params.role);
  const filters: CollabFilters = {
    city: CITIES.some(([c]) => c === city) ? city : null,
    niche: NICHES.some(([n]) => n === niche) ? (niche as Niche) : null,
    role: SKILLS.some(([s]) => s === role) ? (role as Skill) : null,
  };
  const page = Math.max(0, Number.parseInt(one(params.page) ?? "0", 10) || 0);
  const { collabs, total } = await listCollabs(supabase, filters, page, new Date(now).toISOString());
  const qs = (p: number) => {
    const q = new URLSearchParams();
    if (filters.city) q.set("city", filters.city);
    if (filters.niche) q.set("niche", filters.niche);
    if (filters.role) q.set("role", filters.role);
    if (p) q.set("page", String(p));
    return q.size ? `?${q}` : "";
  };

  return (
    <>
      {tabs}
      <form className="card flex flex-wrap gap-2 p-3">
        <select name="city" defaultValue={filters.city ?? ""} className={selectClass} aria-label="City">
          <option value="">Any city</option>
          {CITIES.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
        <select name="role" defaultValue={filters.role ?? ""} className={selectClass} aria-label="Role needed">
          <option value="">Any role</option>
          {SKILLS.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
        <select name="niche" defaultValue={filters.niche ?? ""} className={selectClass} aria-label="Niche">
          <option value="">Any niche</option>
          {NICHES.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
        <button className="btn-primary">Filter</button>
      </form>
      {collabs.length === 0 ? (
        <div className="empty">
          <span className="text-4xl">🤝</span>
          <p className="font-semibold text-ink">No open collabs here yet</p>
          <p className="text-sm">Try removing a filter, or be the first to post one.</p>
          <Link href="/collabs/new" className="btn-primary btn-sm mt-1">
            Post a collab
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collabs.map((c) => (
            <CollabCard key={c.id} collab={c} now={now} />
          ))}
        </div>
      )}
      <div className="flex justify-between text-sm">
        {page > 0 ? <Link href={`/collabs${qs(page - 1)}`} className="btn-secondary btn-sm">← Newer</Link> : <span />}
        {(page + 1) * COLLAB_PAGE < total && (
          <Link href={`/collabs${qs(page + 1)}`} className="btn-secondary btn-sm">
            Older →
          </Link>
        )}
      </div>
    </>
  );
}
