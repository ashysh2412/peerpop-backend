import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { secondaryButton } from "@/components/ui";
import { CITIES, labelFor } from "@/lib/catalog";
import { getNetwork } from "@/lib/connections/data";
import { avatarUrl } from "@/lib/profile/avatar";
import { getProfileById, requireUser } from "@/lib/profile/data";
import { acceptConnection, declineConnection, removeConnection } from "./actions";

export const metadata: Metadata = { title: "My network · Peerpop" };

const TABS = [
  ["connections", "Connections"],
  ["received", "Requests"],
  ["sent", "Sent"],
] as const;
type Tab = (typeof TABS)[number][0];

export default function NetworkPage({ searchParams }: PageProps<"/network">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">My network</h1>
        <Link href="/creators" className="text-sm font-medium text-violet-600 hover:underline">
          Find creators →
        </Link>
      </div>
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <Network searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Network({ searchParams }: Pick<PageProps<"/network">, "searchParams">) {
  const { supabase, user } = await requireUser("/network");
  if (!(await getProfileById(supabase, user.id))) redirect("/onboarding");
  const [{ tab: rawTab, q }, network] = await Promise.all([searchParams, getNetwork(supabase, user.id)]);
  const tab: Tab = TABS.some(([t]) => t === rawTab) ? (rawTab as Tab) : network.received.length ? "received" : "connections";
  const query = typeof q === "string" ? q.trim().toLowerCase() : "";

  let rows = network[tab];
  if (tab === "connections" && query) {
    rows = rows.filter((r) => `${r.profile.display_name} ${r.profile.handle}`.toLowerCase().includes(query));
  }

  return (
    <>
      <nav className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        {TABS.map(([t, label]) => (
          <Link
            key={t}
            href={`/network?tab=${t}`}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              t === tab ? "border-violet-600 text-violet-600" : "border-transparent text-zinc-500"
            }`}
          >
            {label} ({network[t].length})
          </Link>
        ))}
      </nav>

      {tab === "connections" && network.connections.length > 0 && (
        <form method="get" action="/network" className="flex gap-2">
          <input type="hidden" name="tab" value="connections" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Search your connections"
            className="h-10 flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 dark:border-zinc-700"
          />
          <button type="submit" className={secondaryButton}>
            Search
          </button>
        </form>
      )}

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
          {tab === "connections"
            ? query
              ? "No connections match."
              : "No connections yet. Find creators and send a request."
            : tab === "received"
              ? "No requests waiting."
              : "You haven't sent any requests."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => {
            const photo = avatarUrl(r.profile.photo_path);
            return (
              <li key={r.id} className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 sm:flex-row sm:items-center dark:border-zinc-800">
                <Link href={`/creators/${r.profile.handle}`} className="flex flex-1 items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                    {photo && <Image src={photo} alt={r.profile.display_name} fill sizes="48px" className="object-cover" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.profile.display_name}</p>
                    <p className="truncate text-sm text-zinc-500">
                      @{r.profile.handle}
                      {r.profile.city_slug && <> · {labelFor(CITIES, r.profile.city_slug)}</>}
                    </p>
                    {tab === "received" && r.message && <p className="mt-1 text-sm">&ldquo;{r.message}&rdquo;</p>}
                  </div>
                </Link>
                <div className="flex gap-2">
                  {tab === "received" && (
                    <>
                      <form action={acceptConnection}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className="inline-flex h-9 items-center rounded-full bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700">
                          Accept
                        </button>
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
