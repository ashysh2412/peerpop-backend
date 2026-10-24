import type { Metadata } from "next";
import { ArrowLeft, Camera, CheckCircle2, ExternalLink, RotateCw } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CardsSkeleton } from "@/components/skeleton";
import { isConfirmedAdmin } from "@/lib/admin/access";
import { getIgQueue, topUpDrafts, type IgPost } from "@/lib/instagram/queue";
import { plainHeadline } from "@/lib/instagram/ideas";
import { requireUser } from "@/lib/profile/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { approvePost, postNow, retryPost, setAutoPost, skipPost } from "./actions";

export const metadata: Metadata = { title: "Instagram · Admin · Peerpop", robots: { index: false } };

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

function currentTime() {
  return Date.now();
}

const NOTES: Record<string, string> = {
  connected: "Instagram is connected. Approved posts will go out every evening.",
  "connect-failed": "Instagram didn't connect. Please try again.",
  "no-app": "The Instagram app keys aren't set up in Vercel yet.",
};

export default function InstagramAdminPage({ searchParams }: PageProps<"/admin/instagram">) {
  return (
    <main className="page flex flex-col gap-6">
      <Suspense fallback={<CardsSkeleton />}>
        <InstagramAdmin searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function InstagramAdmin({ searchParams }: Pick<PageProps<"/admin/instagram">, "searchParams">) {
  const { supabase } = await requireUser("/admin/instagram");
  if (!(await isConfirmedAdmin(supabase))) notFound();
  const { note } = await searchParams;
  const db = createAdminClient();
  // Keep a few fresh ideas to choose from.
  await topUpDrafts(db, currentTime());
  const { drafts, approved, done, account } = await getIgQueue(db);

  return (
    <>
      <div>
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft size={16} /> Admin
        </Link>
        <h1 className="page-title mt-2">Instagram</h1>
        <p className="mt-1 text-muted">Peerpop makes posts for your Instagram. Approve the ones you like, or turn on auto-post, and one goes out every evening at 7 pm.</p>
      </div>

      {typeof note === "string" && NOTES[note] && <p className="card bg-brand-soft p-4 text-sm font-medium">{NOTES[note]}</p>}

      <section className="card flex flex-wrap items-center gap-4 p-5">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-white">
          <Camera size={22} />
        </span>
        <div className="mr-auto">
          {account ? (
            <>
              <p className="font-semibold">Connected to @{account.username}</p>
              <p className="text-sm text-muted">
                {account.autoPost ? "Auto-post is on: a post goes out every evening without asking you." : "Posts go out only after you approve them."}
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold">Instagram isn&apos;t connected yet</p>
              <p className="text-sm text-muted">You can approve posts now. They&apos;ll start going out once it&apos;s connected.</p>
            </>
          )}
        </div>
        {account && (
          <form action={setAutoPost}>
            <input type="hidden" name="on" value={account.autoPost ? "0" : "1"} />
            <button className={account.autoPost ? "btn-secondary" : "btn-primary"}>{account.autoPost ? "Turn off auto-post" : "Turn on auto-post"}</button>
          </form>
        )}
        <a href="/admin/instagram/connect" className={account ? "btn-ghost" : "btn-dark"}>
          {account ? "Reconnect" : "Connect Instagram"}
        </a>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Waiting for you ({drafts.length})</h2>
        {drafts.length === 0 ? (
          <p className="card p-6 text-center text-muted">You&apos;ve gone through every idea. New ones appear as people post collabs.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {drafts.map((p) => (
              <DraftCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </section>

      {approved.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Up next ({approved.length})</h2>
          <ol className="card divide-y divide-line">
            {approved.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/ig/${p.id}`} alt="" className="h-20 w-16 rounded-lg object-cover" />
                <div className="mr-auto min-w-0">
                  <p className="text-xs font-medium text-muted">{i === 0 ? "Goes out next" : `Post ${i + 1} in line`}</p>
                  <p className="truncate font-semibold">{plainHeadline(p.headline)}</p>
                </div>
                {account && (
                  <form action={postNow}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="btn-primary btn-sm">Post now</button>
                  </form>
                )}
                <form action={skipPost}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="btn-ghost btn-sm">Remove</button>
                </form>
              </li>
            ))}
          </ol>
        </section>
      )}

      {done.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Posted</h2>
          <ul className="card divide-y divide-line">
            {done.map((p) => (
              <li key={p.id} className="flex items-center gap-3 p-3">
                <div className="mr-auto min-w-0">
                  <p className="truncate font-semibold">{plainHeadline(p.headline)}</p>
                  {p.status === "posted" ? (
                    <p className="flex items-center gap-1 text-xs text-emerald-700">
                      <CheckCircle2 size={13} /> Posted {p.posted_at ? dateFormat.format(new Date(p.posted_at)) : ""}
                    </p>
                  ) : (
                    <p className="text-xs text-red-600">Didn&apos;t post: {p.error}</p>
                  )}
                </div>
                {p.permalink && (
                  <a href={p.permalink} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
                    <ExternalLink size={15} /> View
                  </a>
                )}
                {p.status === "failed" && (
                  <form action={retryPost}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="btn-secondary btn-sm">
                      <RotateCw size={15} /> Try again
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function DraftCard({ post }: { post: IgPost }) {
  return (
    <article className="card flex flex-col overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/ig/${post.id}`} alt={plainHeadline(post.headline)} className="aspect-[4/5] w-full bg-brand object-cover" loading="lazy" />
      <form action={approvePost} className="flex flex-1 flex-col gap-3 p-4">
        <input type="hidden" name="id" value={post.id} />
        <label className="text-xs font-semibold text-muted" htmlFor={`caption-${post.id}`}>
          Caption (you can edit it)
        </label>
        <textarea id={`caption-${post.id}`} name="caption" defaultValue={post.caption} rows={6} maxLength={2200} className="input min-h-32 resize-y text-sm" />
        <div className="mt-auto flex gap-2">
          <button className="btn-primary flex-1">Approve</button>
          <button formAction={skipPost} className="btn-secondary">
            Skip
          </button>
        </div>
      </form>
    </article>
  );
}
