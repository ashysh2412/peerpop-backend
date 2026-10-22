import Link from "next/link";
import { CITIES, labelFor } from "@/lib/catalog";
import type { Suggestion } from "@/lib/feed/data";
import { Avatar } from "./avatar";

/**
 * The top of Home in one calm card: a greeting, and a swipeable row of who joined most recently
 * (left out when nobody else has joined yet).
 */
export function HomeHeader({ firstName, people }: { firstName: string; people: Suggestion[] }) {
  return (
    <section className="card overflow-hidden">
      <div className="p-5">
        <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">Hey {firstName} 👋</h1>
        <p className="mt-0.5 text-sm text-muted">See what creators are making, and find your next collab.</p>
      </div>

      {people.length > 0 && (
        <div className="border-t border-line pt-4 pb-4">
          <div className="flex items-center justify-between px-5">
            <h2 className="text-sm font-semibold">Just joined</h2>
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
