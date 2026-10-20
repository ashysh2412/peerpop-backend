import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CollabCard } from "@/components/collab-card";
import { CITIES, NICHES, SKILLS, type Niche, type Skill } from "@/lib/catalog";
import { COLLAB_PAGE, getMyCollabs, isOpen, listCollabs, type CollabFilters } from "@/lib/collabs/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Collabs · Peerpop" };

const selectClass = "h-10 rounded-lg border border-zinc-300 bg-transparent px-3 dark:border-zinc-700";

function currentTime() {
  return Date.now();
}

function one(v: string | string[] | undefined) {
  return typeof v === "string" ? v : null;
}

export default function CollabsPage({ searchParams }: PageProps<"/collabs">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-semibold">Collabs</h1>
        <Link
          href="/collabs/new"
          className="inline-flex h-10 items-center rounded-full bg-violet-600 px-5 font-medium text-white hover:bg-violet-700"
        >
          + Post a collab
        </Link>
      </div>
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
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
  } = await supabase.auth.getUser();
  const now = currentTime();
  const mine = one(params.mine) === "1" && user;

  const tabs = user && (
    <nav className="flex gap-2 text-sm">
      <Link href="/collabs" className={`rounded-full px-4 py-1.5 ${!mine ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "border border-zinc-300 dark:border-zinc-700"}`}>
        Browse
      </Link>
      <Link href="/collabs?mine=1" className={`rounded-full px-4 py-1.5 ${mine ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "border border-zinc-300 dark:border-zinc-700"}`}>
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
          <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
            You haven&apos;t posted a collab yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {posts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/collabs/${p.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-200 p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <span className="flex-1 font-medium">{p.title}</span>
                  {p.waiting > 0 && (
                    <span className="rounded-full bg-violet-600 px-2.5 py-0.5 text-xs text-white">{p.waiting} interested</span>
                  )}
                  <span className="text-xs text-zinc-500">{isOpen(p, now) ? "Open" : "Closed"}</span>
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
      <form className="flex flex-wrap gap-2">
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
        <button className="h-10 rounded-full bg-zinc-900 px-5 text-sm font-medium text-white dark:bg-white dark:text-zinc-900">
          Filter
        </button>
      </form>
      {collabs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
          No open collabs match. Try removing a filter, or post the first one.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {collabs.map((c) => (
            <CollabCard key={c.id} collab={c} now={now} />
          ))}
        </div>
      )}
      <div className="flex justify-between text-sm">
        {page > 0 ? <Link href={`/collabs${qs(page - 1)}`} className="text-violet-600">← Newer</Link> : <span />}
        {(page + 1) * COLLAB_PAGE < total && (
          <Link href={`/collabs${qs(page + 1)}`} className="text-violet-600">
            Older →
          </Link>
        )}
      </div>
    </>
  );
}
