import type { Metadata } from "next";
import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { CreatorCard, type CreatorRow as Row } from "@/components/creator-card";
import { Dropdown } from "@/components/dropdown";
import { ChipGroup } from "@/components/ui";
import { CITIES, LANGUAGES, NICHES, SKILLS } from "@/lib/catalog";
import { getStates, type ConnectionState } from "@/lib/connections/data";
import {
  FOLLOWER_BUCKETS,
  PAGE_SIZE,
  parseFilters,
  toQueryString,
  toRpcArgs,
  type SearchFilters,
} from "@/lib/search/params";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Find creators · Peerpop" };


const selectClass = "input h-10 text-sm";

export default function CreatorsPage({ searchParams }: PageProps<"/creators">) {
  return (
    <main className="page flex flex-col gap-6">
      <div>
        <h1 className="page-title">Find creators</h1>
        <p className="mt-1 text-muted">Tap a niche to start. Verified numbers come straight from YouTube.</p>
      </div>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Search searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Search({ searchParams }: Pick<PageProps<"/creators">, "searchParams">) {
  const filters = parseFilters(await searchParams);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_creators", toRpcArgs(filters));
  const rows = (data ?? []) as Row[];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const others = rows.map((r) => r.user_id).filter((id) => id !== user?.id);
  const states = user ? await getStates(supabase, user.id, others) : new Map<string, ConnectionState>();
  const total = rows[0]?.total_count ?? 0;
  const pages = Math.ceil(total / PAGE_SIZE);
  const active =
    [filters.city, filters.followers, filters.collab, filters.verified].filter(Boolean).length +
    filters.niches.length +
    filters.skills.length +
    filters.langs.length;

  return (
    <div className="flex flex-col gap-5">
      {/* Quick picks as chips; everything else folds into "More filters". */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        <QuickChip href={`/creators${toQueryString(filters, { niches: [], page: 1 })}`} on={filters.niches.length === 0}>
          All
        </QuickChip>
        {NICHES.map(([value, label]) => {
          const on = filters.niches.includes(value);
          return (
            <QuickChip key={value} href={`/creators${toQueryString(filters, { niches: on ? [] : [value], page: 1 })}`} on={on}>
              {label}
            </QuickChip>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <QuickChip href={`/creators${toQueryString(filters, { collab: !filters.collab, page: 1 })}`} on={filters.collab} outline>
          Open to collab
        </QuickChip>
        <QuickChip href={`/creators${toQueryString(filters, { verified: !filters.verified, page: 1 })}`} on={filters.verified} outline>
          Verified only
        </QuickChip>
        <Dropdown
          className="group relative"
          summaryClassName="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-full border border-line bg-card px-4 text-sm font-semibold [&::-webkit-details-marker]:hidden"
          summary={
            <>
              <SlidersHorizontal size={15} /> More filters
              {active > 0 && <span className="chip-brand py-0 text-[11px]">{active}</span>}
            </>
          }
        >
          <div className="card absolute left-0 z-30 mt-2 w-[min(92vw,360px)] p-5 shadow-xl">
            <Filters filters={filters} />
          </div>
        </Dropdown>
        {total > 0 && (
          <span className="ml-auto text-sm font-medium text-muted">
            {total} {total === 1 ? "creator" : "creators"}
          </span>
        )}
      </div>

      <section className="flex flex-col gap-4">
        {error ? (
          <p className="text-red-600">Search isn&apos;t available right now. Please try again in a moment.</p>
        ) : rows.length === 0 ? (
          <div className="empty">
            <span className="text-4xl">🔍</span>
            <p className="font-semibold text-ink">No creators match</p>
            <p className="text-sm">Try removing a filter or picking another city.</p>
            <Link href="/creators" className="btn-secondary btn-sm mt-1">
              Clear filters
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {rows.map((r) => (
                <CreatorCard
                  key={r.user_id}
                  row={r}
                  viewer={user ? (r.user_id === user.id ? "me" : (states.get(r.user_id) ?? { kind: "none" })) : null}
                />
              ))}
            </div>
            {pages > 1 && (
              <nav className="flex items-center justify-center gap-3 pt-2 text-sm">
                {filters.page > 1 && (
                  <Link href={`/creators${toQueryString(filters, { page: filters.page - 1 })}`} className="btn-secondary btn-sm">
                    ← Previous
                  </Link>
                )}
                <span className="text-muted">
                  Page {filters.page} of {pages}
                </span>
                {filters.page < pages && (
                  <Link href={`/creators${toQueryString(filters, { page: filters.page + 1 })}`} className="btn-secondary btn-sm">
                    Next →
                  </Link>
                )}
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function QuickChip({ href, on, outline, children }: { href: string; on: boolean; outline?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex h-9 shrink-0 items-center rounded-full px-4 text-sm font-semibold whitespace-nowrap transition ${
        on ? "bg-ink text-card" : outline ? "border border-line bg-card text-ink hover:bg-sunken" : "bg-sunken text-ink hover:bg-line"
      }`}
    >
      {children}
    </Link>
  );
}

function Filters({ filters }: { filters: SearchFilters }) {
  return (
    <form method="get" action="/creators" className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
        <label className="label flex flex-col gap-1.5">
          City
          <select name="city" defaultValue={filters.city ?? ""} className={selectClass}>
            <option value="">Any city</option>
            {CITIES.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="label flex flex-col gap-1.5">
          Followers
          <select name="followers" defaultValue={filters.followers ?? ""} className={selectClass}>
            <option value="">Any size</option>
            {FOLLOWER_BUCKETS.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ChipGroup label="Niche" name="niche" options={NICHES} selected={filters.niches} />
      <ChipGroup label="Skills" name="skill" options={SKILLS} selected={filters.skills} />
      <ChipGroup label="Language" name="lang" options={LANGUAGES} selected={filters.langs} />
      <div className="flex flex-col gap-3 rounded-xl bg-sunken p-3">
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" name="collab" value="1" defaultChecked={filters.collab} className="h-[18px] w-[18px] accent-[var(--brand)]" />
          Open to collab only
        </label>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" name="verified" value="1" defaultChecked={filters.verified} className="h-[18px] w-[18px] accent-[var(--brand)]" />
          Verified YouTube only
        </label>
      </div>
      <label className="label flex flex-col gap-1.5">
        Sort by
        <select name="sort" defaultValue={filters.sort} className={selectClass}>
          <option value="audience">Biggest audience</option>
          <option value="views">Most views</option>
        </select>
      </label>
      <div className="flex items-center gap-2">
        <button type="submit" className="btn-primary flex-1">
          Show creators
        </button>
        <Link href="/creators" className="btn-ghost">
          Clear
        </Link>
      </div>
    </form>
  );
}
