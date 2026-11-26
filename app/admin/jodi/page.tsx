import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CardsSkeleton } from "@/components/skeleton";
import { isConfirmedAdmin } from "@/lib/admin/access";
import { compactNumber } from "@/lib/format";
import { JODI_PER_DAY, JODI_WAIT_DAYS, planJodis } from "@/lib/jodi/auto";
import { requireUser } from "@/lib/profile/data";

export const metadata: Metadata = { title: "Auto Jodi · Admin · Peerpop", robots: { index: false } };

function currentTime() {
  return Date.now();
}

export default function JodiPage() {
  return (
    <main className="page flex max-w-3xl flex-col gap-6">
      <Suspense fallback={<CardsSkeleton />}>
        <Jodi />
      </Suspense>
    </main>
  );
}

async function Jodi() {
  const { supabase } = await requireUser("/admin/jodi");
  if (!(await isConfirmedAdmin(supabase))) notFound();
  const plan = await planJodis(currentTime());

  return (
    <>
      <div>
        <Link href="/admin" className="btn-ghost btn-sm -ml-2 mb-2">
          <ArrowLeft size={16} /> Admin
        </Link>
        <h1 className="page-title">Auto Jodi</h1>
        <p className="mt-1 text-muted">
          Every evening at 7:30 PM, up to {JODI_PER_DAY} pairs of creators with a similar follower count and a matching or related niche (different
          cities when possible) each get a chat from the Peerpop account suggesting they collab. Nobody gets the same partner twice, and each person
          waits {JODI_WAIT_DAYS} days before their next Jodi. Members need a niche and a follower count on their profile to be matched.
        </p>
      </div>

      {!plan.ready && (
        <p className="card border-amber-300 bg-amber-50 p-4 text-sm">
          Waiting for database update 23 (Auto Jodi). Until it&apos;s run in Supabase, nothing is sent. This page only shows what would be sent.
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">
          Tonight&apos;s pairs <span className="font-normal text-muted">({plan.pairs.length} of {plan.eligible} members who can be matched)</span>
        </h2>
        {plan.pairs.length === 0 && <p className="card p-5 text-muted">No new pairs tonight.</p>}
        {plan.pairs.map((pair) => (
          <article key={pair.a.id + pair.b.id} className="card flex flex-col gap-3 p-4">
            <p className="font-semibold">
              <Link href={`/${pair.a.handle}`} className="hover:underline">
                {pair.a.name}
              </Link>{" "}
              <span className="text-muted">
                ({compactNumber(pair.a.followers)}, {pair.a.cityName ?? "no city"})
              </span>{" "}
              +{" "}
              <Link href={`/${pair.b.handle}`} className="hover:underline">
                {pair.b.name}
              </Link>{" "}
              <span className="text-muted">
                ({compactNumber(pair.b.followers)}, {pair.b.cityName ?? "no city"})
              </span>
            </p>
            <details>
              <summary className="cursor-pointer text-sm font-medium">See both messages</summary>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {pair.messages.map((m, i) => (
                  <p key={i} className="whitespace-pre-line rounded-xl bg-gray-100 p-3 text-sm">
                    {m}
                  </p>
                ))}
              </div>
            </details>
          </article>
        ))}
      </section>

      {plan.past.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">Already sent</h2>
          <ul className="card divide-y text-sm">
            {plan.past.map((s) => (
              <li key={s.a + s.b + s.at} className="flex items-center justify-between gap-3 p-3">
                <span>
                  @{s.a} + @{s.b}
                </span>
                <span className={s.connected ? "font-semibold text-green-700" : "text-muted"}>
                  {s.connected ? "Connected" : new Date(s.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
