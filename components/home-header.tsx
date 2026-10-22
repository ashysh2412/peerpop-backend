import { ChevronRight, Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { CITIES, labelFor } from "@/lib/catalog";
import type { Suggestion } from "@/lib/feed/data";
import { Avatar } from "./avatar";

/**
 * The top of Home in one calm card: a greeting, connection requests waiting, and a
 * swipeable row of creators to meet (left out when there's nobody to suggest yet).
 */
export function HomeHeader({ firstName, people, requests }: { firstName: string; people: Suggestion[]; requests: number }) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">Hey {firstName} 👋</h1>
          <p className="mt-0.5 text-sm text-muted">See what creators are making, and find your next collab.</p>
        </div>
        <Link href="/creators" className="btn-secondary btn-sm shrink-0">
          <Search size={15} /> <span className="hidden sm:inline">Find creators</span>
        </Link>
      </div>

      {requests > 0 && (
        <Link
          href="/network?tab=received"
          className="flex items-center gap-3 border-t border-line px-5 py-3.5 text-sm transition hover:bg-sunken"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
            <UserPlus size={17} />
          </span>
          <span className="flex-1">
            <span className="font-semibold">
              {requests} {requests === 1 ? "creator wants" : "creators want"} to connect
            </span>
            <span className="block text-xs text-muted">Review and accept to start messaging.</span>
          </span>
          <span className="flex items-center gap-0.5 text-sm font-semibold text-brand-ink">
            Review <ChevronRight size={16} />
          </span>
        </Link>
      )}

      {people.length > 0 && (
        <div className="border-t border-line pt-4 pb-4">
          <div className="flex items-center justify-between px-5">
            <h2 className="text-sm font-semibold">Creators to meet</h2>
            <Link href="/creators" className="text-sm font-semibold text-brand-ink hover:underline">
              See all
            </Link>
          </div>
          <div className="mt-3 flex snap-x gap-3 overflow-x-auto px-5 [scrollbar-width:none]">
            {people.map((p) => (
              <Link
                key={p.user_id}
                href={`/creators/${p.handle}`}
                className="group flex w-[72px] shrink-0 snap-start flex-col items-center gap-1.5 text-center"
              >
                <span className="rounded-full p-[2px] ring-1 ring-line transition group-hover:ring-brand">
                  <Avatar path={p.photo_path} name={p.display_name} size={56} />
                </span>
                <span className="w-full truncate text-xs font-medium">{p.display_name.split(" ")[0]}</span>
                {p.city_slug && <span className="-mt-1 w-full truncate text-[11px] text-muted">{labelFor(CITIES, p.city_slug)}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
