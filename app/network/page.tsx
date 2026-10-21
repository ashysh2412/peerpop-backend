import type { Metadata } from "next";
import { Search } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { secondaryButton } from "@/components/ui";
import { CITIES, labelFor } from "@/lib/catalog";
import { getNetwork } from "@/lib/connections/data";
import { requireUser } from "@/lib/profile/data";
import { ensureProfile } from "@/lib/profile/ensure";
import { acceptConnection, declineConnection, removeConnection } from "./actions";
import { CardsSkeleton } from "@/components/skeleton";

export const metadata: Metadata = { title: "My network · Peerpop" };

const TABS = [
  ["connections", "Connections"],
  ["received", "Requests"],
  ["sent", "Sent"],
] as const;
type Tab = (typeof TABS)[number][0];

export default function NetworkPage({ searchParams }: PageProps<"/network">) {
  return (
    <main className="page-narrow flex flex-col gap-5">
      <h1 className="page-title">My network</h1>
      <Suspense fallback={<CardsSkeleton />}>
        <Network searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Network({ searchParams }: Pick<PageProps<"/network">, "searchParams">) {
  const { supabase, user } = await requireUser("/network");
  await ensureProfile(supabase, user);
  const [{ tab: rawTab, q }, network] = await Promise.all([searchParams, getNetwork(supabase, user.id)]);
  const tab: Tab = TABS.some(([t]) => t === rawTab) ? (rawTab as Tab) : network.received.length ? "received" : "connections";
  const query = typeof q === "string" ? q.trim().toLowerCase() : "";

  let rows = network[tab];
  if (tab === "connections" && query) {
    rows = rows.filter((r) => `${r.profile.display_name} ${r.profile.handle}`.toLowerCase().includes(query));
  }

  return (
    <>
      <nav className="tabs self-start">
        {TABS.map(([t, label]) => (
          <Link key={t} href={`/network?tab=${t}`} className={t === tab ? "tab-active" : "tab"}>
            {label} <span className="opacity-60">{network[t].length}</span>
          </Link>
        ))}
      </nav>

      {tab === "connections" && network.connections.length > 0 && (
        <form method="get" action="/network" className="relative">
          <input type="hidden" name="tab" value="connections" />
          <Search size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={query} placeholder="Search your connections" className="input pl-10" />
        </form>
      )}

      {rows.length === 0 ? (
        <div className="empty">
          <span className="text-4xl">{tab === "received" ? "📭" : "👋"}</span>
          <p className="font-semibold text-ink">
            {tab === "connections"
              ? query
                ? "No connections match"
                : "No connections yet"
              : tab === "received"
                ? "No requests waiting"
                : "You haven't sent any requests"}
          </p>
          {tab !== "received" && !query && (
            <Link href="/creators" className="btn-primary btn-sm mt-1">
              Find creators
            </Link>
          )}
        </div>
      ) : (
        <ul className="card divide-y divide-line">
          {rows.map((r) => {
            return (
              <li key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <Link href={`/creators/${r.profile.handle}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar path={r.profile.photo_path} name={r.profile.display_name} size={48} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold hover:underline">{r.profile.display_name}</p>
                    <p className="truncate text-sm text-muted">
                      {r.profile.city_slug ? labelFor(CITIES, r.profile.city_slug) : "Creator"}
                    </p>
                    {tab === "received" && r.message && (
                      <p className="mt-1.5 rounded-xl bg-sunken px-3 py-2 text-sm">&ldquo;{r.message}&rdquo;</p>
                    )}
                  </div>
                </Link>
                <div className="flex gap-2">
                  {tab === "received" && (
                    <>
                      <form action={acceptConnection}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className="btn-primary btn-sm">Accept</button>
                      </form>
                      <form action={declineConnection}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className={secondaryButton}>Decline</button>
                      </form>
                    </>
                  )}
                  {tab === "sent" && (
                    <form action={removeConnection}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className={secondaryButton}>Withdraw</button>
                    </form>
                  )}
                  {tab === "connections" && (
                    <Link href={`/creators/${r.profile.handle}`} className={secondaryButton}>
                      View profile
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
