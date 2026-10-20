import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ChipGroup } from "@/components/ui";
import { CITIES, LANGUAGES, NICHES, SKILLS, labelFor, type Niche } from "@/lib/catalog";
import { compactNumber } from "@/lib/format";
import { avatarUrl } from "@/lib/profile/avatar";
import { FOLLOWER_BUCKETS, PAGE_SIZE, parseFilters, toQueryString, toRpcArgs, type SearchFilters } from "@/lib/search/params";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Find creators · Peerpop" };

type Row = {
  user_id: string;
  handle: string;
  display_name: string;
  photo_path: string | null;
  city_slug: string | null;
  niches: Niche[];
  open_to_collab: boolean;
  max_followers: number | null;
  max_followers_verified: boolean;
  avg_views: number | null;
  avg_views_verified: boolean;
  total_count: number;
};

const selectClass = "h-10 rounded-lg border border-zinc-300 bg-transparent px-3 dark:border-zinc-700";

export default function CreatorsPage({ searchParams }: PageProps<"/creators">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Find creators</h1>
        <Link href="/home" className="text-sm font-medium text-violet-600 hover:underline">
          Home
        </Link>
      </div>
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
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
  const total = rows[0]?.total_count ?? 0;
  const pages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <Filters filters={filters} />
      <section className="flex flex-col gap-4">
        {error ? (
          <p className="text-red-600">Search isn&apos;t available right now. Please try again in a moment.</p>
        ) : rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
            No creators match. Try removing a filter.
          </p>
        ) : (
          <>
            <p className="text-sm text-zinc-500">
              {total} {total === 1 ? "creator" : "creators"}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((r) => (
                <CreatorCard key={r.user_id} row={r} />
              ))}
            </div>
            {pages > 1 && (
              <nav className="flex items-center justify-center gap-4 text-sm">
                {filters.page > 1 && (
                  <Link href={`/creators${toQueryString(filters, { page: filters.page - 1 })}`} className="font-medium text-violet-600">
                    ← Previous
                  </Link>
                )}
                <span className="text-zinc-500">
                  Page {filters.page} of {pages}
                </span>
                {filters.page < pages && (
                  <Link href={`/creators${toQueryString(filters, { page: filters.page + 1 })}`} className="font-medium text-violet-600">
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

function Filters({ filters }: { filters: SearchFilters }) {
  return (
    <form method="get" action="/creators" className="flex flex-col gap-5 self-start rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
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
      <label className="flex flex-col gap-1.5 text-sm font-medium">
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
      <ChipGroup label="Niche" name="niche" options={NICHES} selected={filters.niches} />
      <ChipGroup label="Skills" name="skill" options={SKILLS} selected={filters.skills} />
      <ChipGroup label="Language" name="lang" options={LANGUAGES} selected={filters.langs} />
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="collab" value="1" defaultChecked={filters.collab} className="h-5 w-5 accent-violet-600" />
        Open to collab only
      </label>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="verified" value="1" defaultChecked={filters.verified} className="h-5 w-5 accent-violet-600" />
        Verified only
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Sort by
        <select name="sort" defaultValue={filters.sort} className={selectClass}>
          <option value="audience">Biggest audience</option>
          <option value="views">Most views</option>
        </select>
      </label>
      <div className="flex items-center gap-4">
        <button
          type="submit"
          className="inline-flex h-10 items-center rounded-full bg-violet-600 px-5 font-medium text-white hover:bg-violet-700"
        >
          Search
        </button>
        <Link href="/creators" className="text-sm text-zinc-500 hover:underline">
          Clear
        </Link>
      </div>
    </form>
  );
}

function SourceLabel({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-300">
      ✓ Verified · YouTube
    </span>
  ) : (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
      Self-reported
    </span>
  );
}

function CreatorCard({ row }: { row: Row }) {
  const photo = avatarUrl(row.photo_path);
  const shown = row.niches.slice(0, 2);
  const extra = row.niches.length - shown.length;
  return (
    <Link
      href={`/creators/${row.handle}`}
      className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
    >
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          {photo && <Image src={photo} alt={row.display_name} fill sizes="56px" className="object-cover" />}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">{row.display_name}</p>
          <p className="truncate text-sm text-zinc-500">
            @{row.handle}
            {row.city_slug && <> · {labelFor(CITIES, row.city_slug)}</>}
          </p>
        </div>
      </div>
      {row.niches.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {shown.map((n) => (
            <span key={n} className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs dark:bg-zinc-900">
              {labelFor(NICHES, n)}
            </span>
          ))}
          {extra > 0 && <span className="px-1 text-xs text-zinc-500">+{extra}</span>}
        </div>
      )}
      {row.max_followers !== null ? (
        <div className="flex flex-col gap-1 text-sm">
          <p className="flex flex-wrap items-center gap-2">
            <span>
              <b>{compactNumber(row.max_followers)}</b> followers
            </span>
            <SourceLabel verified={row.max_followers_verified} />
          </p>
          {row.avg_views !== null && (
            <p className="flex flex-wrap items-center gap-2">
              <span>
                <b>{compactNumber(row.avg_views)}</b> avg views
              </span>
              {row.avg_views_verified !== row.max_followers_verified && <SourceLabel verified={row.avg_views_verified} />}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">No channel numbers yet</p>
      )}
      {row.open_to_collab && (
        <span className="self-start rounded-full bg-green-100 px-2.5 py-0.5 text-xs text-green-800 dark:bg-green-950 dark:text-green-300">
          Open to collab
        </span>
      )}
    </Link>
  );
}
