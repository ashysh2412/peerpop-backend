import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CardsSkeleton } from "@/components/skeleton";
import { isConfirmedAdmin } from "@/lib/admin/access";
import { compactNumber } from "@/lib/format";
import { JODI_OPTIONS, JODI_PER_DAY, JODI_WAIT_DAYS, planJodis } from "@/lib/jodi/auto";
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
          Every evening at 7:30 PM, up to {JODI_PER_DAY} members each get a chat from the Peerpop account with up to {JODI_OPTIONS} collab Jodis to
          choose from: creators with a similar follower count (up to 3x) and a matching or related niche, different cities first. They can connect
          with as many as they like, and see more on Home. Nobody is suggested the same person twice, and each member gets a fresh list every{" "}
          {JODI_WAIT_DAYS} days. Members need a niche and a follower count on their profile to be matched.
        </p>
      </div>

      {!plan.ready && (
        <p className="card border-amber-300 bg-amber-50 p-4 text-sm">
          Waiting for database update 23 (Auto Jodi). Until it&apos;s run in Supabase, nothing is sent. This page only shows what would be sent.
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">
          Tonight&apos;s Jodi lists <span className="font-normal text-muted">({plan.offers.length} members, of {plan.eligible} who can be matched)</span>
        </h2>
        {plan.offers.length === 0 && <p className="card p-5 text-muted">No new Jodi lists tonight.</p>}
        {plan.offers.map((offer) => (
          <article key={offer.to.id} className="card flex flex-col gap-3 p-4">
            <p className="font-semibold">
              <Link href={`/${offer.to.handle}`} className="hover:underline">
                {offer.to.name}
              </Link>{" "}
              <span className="text-muted">
                ({compactNumber(offer.to.followers)}, {offer.to.cityName ?? "no city"})
              </span>
            </p>
            <ul className="flex flex-wrap gap-2 text-sm">
              {offer.options.map((o) => (
                <li key={o.b.id} className="rounded-full bg-gray-100 px-3 py-1">
                  {o.b.name} · {compactNumber(o.b.followers)} · {o.b.cityName ?? "no city"}
                </li>
              ))}
            </ul>
            <details>
              <summary className="cursor-pointer text-sm font-medium">See the message</summary>
              <p className="mt-2 whitespace-pre-line rounded-xl bg-gray-100 p-3 text-sm">{offer.message}</p>
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
                  @{s.a} → @{s.b}
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
