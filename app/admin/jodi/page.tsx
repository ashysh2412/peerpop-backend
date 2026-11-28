import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CardsSkeleton } from "@/components/skeleton";
import { isConfirmedAdmin } from "@/lib/admin/access";
import { compactNumber } from "@/lib/format";
import { INSTANT_WELCOME_ON, JODI_OPTIONS, JODI_PER_DAY, JODI_WAIT_DAYS, planJodis, STARTER_JODI_ON } from "@/lib/jodi/auto";
import { CHECKIN_ON, planCheckins } from "@/lib/jodi/checkin";
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
  const now = currentTime();
  const [plan, checkins] = await Promise.all([planJodis(now), planCheckins(now)]);

  return (
    <>
      <div>
        <Link href="/admin" className="btn-ghost btn-sm -ml-2 mb-2">
          <ArrowLeft size={16} /> Admin
        </Link>
        <h1 className="page-title">Auto Jodi</h1>
        <p className="mt-1 text-muted">
          Twice a day, at 11:30 AM and 7:30 PM, up to {JODI_PER_DAY} members each get a chat from the Peerpop account with up to {JODI_OPTIONS} collab Jodis to
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
          Next run&apos;s Jodi lists <span className="font-normal text-muted">({plan.offers.length} members, of {plan.eligible} who can be matched)</span>
        </h2>
        {plan.offers.length === 0 && <p className="card p-5 text-muted">No new Jodi lists for the next run.</p>}
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

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">
          New members&apos; first Jodis tonight <span className="font-normal text-muted">({plan.starters.length})</span>
        </h2>
        <p className="text-sm text-muted">
          {STARTER_JODI_ON
            ? "Sent at 7:30 PM, right after the welcome chat."
            : "Preview only: not switched on yet, so nothing below is sent."}{" "}
          Members with an incomplete profile get starter Jodis by niche or city, and a nudge to add their niche and followers.
        </p>
        {plan.sample && (
          <div className="card flex flex-col gap-2 p-4">
            <p className="font-semibold">
              Someone signing up right now, with nothing filled in yet{" "}
              <span className="font-normal text-muted">
                ({INSTANT_WELCOME_ON ? "sent the moment they join" : "preview only, instant sending is off"})
              </span>
            </p>
            <p className="whitespace-pre-line rounded-xl bg-gray-100 p-3 text-sm">{plan.sample}</p>
          </div>
        )}
        {plan.starters.length === 0 && <p className="card p-5 text-muted">No new members waiting for a welcome right now.</p>}
        {plan.starters.map((offer) => (
          <article key={offer.to.id} className="card flex flex-col gap-3 p-4">
            <p className="font-semibold">
              <Link href={`/${offer.to.handle}`} className="hover:underline">
                {offer.to.name}
              </Link>{" "}
              <span className="text-muted">({offer.to.cityName ?? "no city"})</span>
            </p>
            <details>
              <summary className="cursor-pointer text-sm font-medium">See the message</summary>
              <p className="mt-2 whitespace-pre-line rounded-xl bg-gray-100 p-3 text-sm">{offer.message}</p>
            </details>
          </article>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">
          3-day check-ins <span className="font-normal text-muted">({checkins.due.length} due at 11:30 AM)</span>
        </h2>
        <p className="text-sm text-muted">
          {!checkins.ready
            ? "Waiting for database update 24. Nothing is sent before that."
            : CHECKIN_ON
              ? "3 days after a Jodi list, members get \"Jodi se baat hui?\" with 3 tap answers."
              : "Preview only: not switched on yet, so nothing below is sent."}
        </p>
        {checkins.due.slice(0, 1).map((c) => (
          <p key={c.id} className="whitespace-pre-line rounded-xl bg-gray-100 p-3 text-sm">
            {c.message}
          </p>
        ))}
        {checkins.due.length > 0 && (
          <p className="text-sm">
            Going to: {checkins.due.map((c) => c.name ?? c.handle).join(", ")}
          </p>
        )}
        {checkins.answers.length > 0 && (
          <ul className="card divide-y text-sm">
            {checkins.answers.map((a) => (
              <li key={a.handle + a.at} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <span>
                  @{a.handle}: {a.answer === "done" ? "✅ Collab done" : a.answer === "waiting" ? "⏳ Waiting for reply" : "🙈 Not yet"}
                </span>
                {a.reel && (
                  <a href={a.reel} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold underline">
                    See reel
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
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
