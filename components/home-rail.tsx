import { ArrowRight, Check, Handshake, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { CITIES, SKILLS, labelFor } from "@/lib/catalog";
import type { Collab } from "@/lib/collabs/data";
import type { StarterSteps, Suggestion } from "@/lib/feed/data";
import { Avatar } from "./avatar";
import { ConnectPanel } from "./connect-panel";

const CONNECT_GOAL = 3;

function Section({ title, href, children }: { title: string; href: string; children: ReactNode }) {
  return (
    <section className="card flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Link href={href} className="text-xs font-semibold text-brand-ink hover:underline">
          See all
        </Link>
      </div>
      {children}
    </section>
  );
}

/** The setup checklist for new creators. Renders nothing once every step is done. `compact` is a one-line version for phones. */
export function GetStarted({ steps, compact }: { steps: StarterSteps; compact?: boolean }) {
  const items = [
    {
      done: steps.photo,
      label: "Add a profile photo",
      href: "/settings/profile",
    },
    {
      done: steps.video,
      label: "Show a video of your work",
      href: "/settings/profile#videos",
    },
    { done: steps.post, label: "Share your first post", href: "/home#compose" },
    {
      done: steps.connections >= CONNECT_GOAL,
      label: `Connect with ${CONNECT_GOAL} creators (${Math.min(steps.connections, CONNECT_GOAL)}/${CONNECT_GOAL})`,
      href: "/creators",
    },
  ];
  const done = items.filter((i) => i.done).length;
  if (done === items.length) return null;
  if (compact) {
    const next = items.find((i) => !i.done)!;
    return (
      <Link href={next.href} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 text-sm shadow-sm transition hover:bg-sunken">
        <span className="h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-sunken">
          <span className="bg-brand-gradient block h-full rounded-full" style={{ width: `${(done / items.length) * 100}%` }} />
        </span>
        <span className="min-w-0 flex-1 truncate">
          <span className="font-semibold">{next.label}</span>{" "}
          <span className="text-muted">
            · {done}/{items.length}
          </span>
        </span>
        <ArrowRight size={15} className="shrink-0 text-muted" />
      </Link>
    );
  }

  return (
    <section className="card flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Get started</h2>
        <Link href="/settings/profile" className="text-xs font-semibold text-brand-ink hover:underline">
          My profile
        </Link>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
        <div className="bg-brand-gradient h-full rounded-full" style={{ width: `${(done / items.length) * 100}%` }} />
      </div>
      <p className="text-xs text-muted">
        {done} of {items.length} done. Complete profiles get more collab requests.
      </p>
      <ul className="-mx-2 flex flex-col">
        {items.map((i) => (
          <li key={i.label}>
            <Link href={i.href} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm transition hover:bg-sunken">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${i.done ? "bg-brand-gradient text-ink" : "border-2 border-line"}`}
              >
                {i.done && <Check size={12} strokeWidth={3} />}
              </span>
              <span className={`flex-1 ${i.done ? "text-muted line-through" : "font-medium"}`}>{i.label}</span>
              {!i.done && <ArrowRight size={14} className="text-muted" />}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The right-hand column on Home for wide screens: setup, the newest collabs, and the newest creators. */
export function HomeRail({ steps, collabs, people }: { steps: StarterSteps; collabs: Collab[]; people: Suggestion[] }) {
  return (
    <aside className="hidden flex-col gap-4 lg:flex">
      <GetStarted steps={steps} />

      <Section title="New collabs" href="/collabs">
        {collabs.length === 0 ? (
          <p className="text-sm text-muted">No open collabs right now. Start one and creators nearby will hear about it.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {collabs.map((c) => (
              <li key={c.id}>
                <Link href={`/collabs/${c.id}`} className="-mx-2 flex items-start gap-3 rounded-xl p-2 transition hover:bg-sunken">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-ink">
                    <Handshake size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-sm leading-snug font-semibold">{c.title}</span>
                    <span className="flex items-center gap-1 truncate text-xs text-muted">
                      <MapPin size={11} className="shrink-0" />
                      {c.city_slug ? labelFor(CITIES, c.city_slug) : "Online"} · Needs {c.roles_needed.map((r) => labelFor(SKILLS, r).toLowerCase()).join(", ")}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href="/collabs/new" className="btn-secondary btn-sm">
          <Plus size={15} /> Post a collab
        </Link>
      </Section>

      {people.length > 0 && (
        <Section title="New on Peerpop" href="/creators">
          <ul className="flex flex-col gap-3">
            {people.map((p) => (
              <li key={p.user_id} className="flex items-center gap-3">
                <Link href={`/creators/${p.handle}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar path={p.photo_path} name={p.display_name} size={36} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold hover:underline">{p.display_name}</span>
                    <span className="block truncate text-xs text-muted">{p.city_slug ? labelFor(CITIES, p.city_slug) : "Creator"}</span>
                  </span>
                </Link>
                <div className="w-24 shrink-0">
                  <ConnectPanel otherId={p.user_id} name={p.display_name} state={{ kind: "none" }} compact />
                </div>
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
