import { ArrowRight, Handshake } from "lucide-react";
import Link from "next/link";
import { CITIES, SKILLS, labelFor } from "@/lib/catalog";
import type { Collab } from "@/lib/collabs/data";
import type { Suggestion } from "@/lib/feed/data";
import { Avatar } from "./avatar";
import { ConnectPanel } from "./connect-panel";

type Me = {
  handle: string;
  display_name: string;
  photo_path: string | null;
  city_slug: string | null;
};

function Section({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">{title}</h2>
        <Link
          href={href}
          className="text-xs font-semibold text-brand hover:underline"
        >
          See all
        </Link>
      </div>
      {children}
    </section>
  );
}

/** The side panel on Home for wide screens: you, creators to meet and open collabs. */
export function HomeSidebar({
  me,
  people,
  collabs,
}: {
  me: Me;
  people: Suggestion[];
  collabs: Collab[];
}) {
  return (
    <aside className="sticky top-24 hidden flex-col gap-4 lg:flex">
      <Link
        href={`/creators/${me.handle}`}
        className="card-link flex items-center gap-3 p-4"
      >
        <span className="rounded-full bg-brand-gradient p-[2px]">
          <span className="block rounded-full bg-card p-[2px]">
            <Avatar path={me.photo_path} name={me.display_name} size={48} />
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">{me.display_name}</span>
          <span className="block truncate text-xs text-muted">
            @{me.handle}
            {me.city_slug && ` · ${labelFor(CITIES, me.city_slug)}`}
          </span>
        </span>
        <ArrowRight size={16} className="text-muted" />
      </Link>

      {people.length > 0 && (
        <Section title="Creators to meet" href="/creators">
          <ul className="flex flex-col gap-3">
            {people.map((p) => (
              <li key={p.user_id} className="flex items-center gap-3">
                <Link
                  href={`/creators/${p.handle}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <Avatar path={p.photo_path} name={p.display_name} size={36} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold hover:underline">
                      {p.display_name}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {p.city_slug
                        ? labelFor(CITIES, p.city_slug)
                        : `@${p.handle}`}
                    </span>
                  </span>
                </Link>
                <div className="w-24 shrink-0">
                  <ConnectPanel
                    otherId={p.user_id}
                    name={p.display_name}
                    state={{ kind: "none" }}
                    compact
                  />
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {collabs.length > 0 && (
        <Section title="Open collabs" href="/collabs">
          <ul className="flex flex-col gap-2">
            {collabs.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/collabs/${c.id}`}
                  className="flex items-start gap-3 rounded-xl p-2 -m-2 transition hover:bg-sunken"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <Handshake size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-sm leading-snug font-semibold">
                      {c.title}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      Needs{" "}
                      {c.roles_needed
                        .map((r) => labelFor(SKILLS, r).toLowerCase())
                        .join(", ")}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <p className="flex flex-wrap gap-x-3 px-1 text-xs text-muted">
        <Link href="/privacy" className="hover:underline">
          Privacy
        </Link>
        <Link href="/terms" className="hover:underline">
          Terms
        </Link>
        <span>© Peerpop</span>
      </p>
    </aside>
  );
}
