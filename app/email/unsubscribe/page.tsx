import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EMAIL_TOPICS, TOPIC_LABELS, type EmailTopic } from "@/lib/email/topic-list";
import { unsubscribe } from "./actions";

export const metadata: Metadata = { title: "Email settings · Peerpop", robots: { index: false } };

export default function UnsubscribePage({ searchParams }: PageProps<"/email/unsubscribe">) {
  return (
    <main className="page-narrow">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Unsubscribe searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** Asks before turning emails off, so link checkers in some inboxes can't do it by just opening the link. */
async function Unsubscribe({ searchParams }: Pick<PageProps<"/email/unsubscribe">, "searchParams">) {
  const { t, topic, done, error } = await searchParams;
  const settings = (
    <p className="mt-4 text-sm text-muted">
      You can turn any email back on in{" "}
      <Link href="/settings/profile#emails" className="font-semibold text-ink underline">
        My profile
      </Link>
      .
    </p>
  );
  if (typeof done === "string" && EMAIL_TOPICS.includes(done as EmailTopic)) {
    return (
      <section className="card p-6">
        <h1 className="page-title">Done</h1>
        <p className="mt-2">You won&apos;t get &quot;{TOPIC_LABELS[done as EmailTopic][0]}&quot; emails from Peerpop any more.</p>
        {settings}
      </section>
    );
  }
  if (error || typeof t !== "string" || typeof topic !== "string" || !EMAIL_TOPICS.includes(topic as EmailTopic)) {
    return (
      <section className="card p-6">
        <h1 className="page-title">This link didn&apos;t work</h1>
        <p className="mt-2 text-muted">Sign in and choose which emails you get in My profile.</p>
        {settings}
      </section>
    );
  }
  const [label, about] = TOPIC_LABELS[topic as EmailTopic];
  return (
    <section className="card p-6">
      <h1 className="page-title">Turn off &quot;{label}&quot; emails?</h1>
      <p className="mt-2 text-muted">{about}</p>
      <form action={unsubscribe} className="mt-5">
        <input type="hidden" name="t" value={t} />
        <input type="hidden" name="topic" value={topic} />
        <button className="btn-dark">Turn off these emails</button>
      </form>
      {settings}
    </section>
  );
}
