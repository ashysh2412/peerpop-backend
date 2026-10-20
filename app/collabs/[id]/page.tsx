import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { shootLabel } from "@/components/collab-card";
import { ContactBox } from "@/components/contact-box";
import { InterestForm } from "@/components/interest-form";
import { secondaryButton } from "@/components/ui";
import { updatedLabel } from "@/components/youtube-stats";
import { CITIES, LANGUAGES, NICHES, SKILLS, labelFor } from "@/lib/catalog";
import { getCollab, getInterests, getMyInterest, isOpen } from "@/lib/collabs/data";
import { getContactFor } from "@/lib/connections/data";
import { createClient } from "@/lib/supabase/server";
import { acceptInterest, closeCollab, declineInterest, deleteCollab, withdrawInterest } from "../actions";

export const metadata: Metadata = { title: "Collab · Peerpop" };

function currentTime() {
  return Date.now();
}

export default function CollabPage({ params }: PageProps<"/collabs/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <Link href="/collabs" className="text-sm text-zinc-500 hover:underline">
        ← All collabs
      </Link>
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <CollabDetail params={params} />
      </Suspense>
    </main>
  );
}

async function CollabDetail({ params }: Pick<PageProps<"/collabs/[id]">, "params">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const collab = await getCollab(supabase, id);
  if (!collab) notFound();
  const author = collab.author!;
  const isAuthor = user?.id === collab.author_id;
  const now = currentTime();
  const open = isOpen(collab, now);
  const shoot = shootLabel(collab.shoot_date);

  const tags = (list: readonly (readonly [string, string])[], values: string[]) => values.map((v) => labelFor(list, v)).join(", ");
  const details: [string, string][] = [
    ["Needs", tags(SKILLS, collab.roles_needed)],
    ["City", collab.city_slug ? labelFor(CITIES, collab.city_slug) : "Anywhere / online"],
    ["Niches", tags(NICHES, collab.niches)],
    ["Languages", tags(LANGUAGES, collab.languages)],
    ["Shoot date", shoot ?? ""],
  ];

  return (
    <>
      <article className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/creators/${author.handle}`}>
            <Avatar path={author.photo_path} name={author.display_name} size={44} />
          </Link>
          <div>
            <Link href={`/creators/${author.handle}`} className="font-medium hover:underline">
              {author.display_name}
            </Link>
            <p className="text-xs text-zinc-500">
              Posted {updatedLabel(collab.created_at, now)} · {open ? "Open" : "Closed"}
            </p>
          </div>
        </div>
        <h1 className="text-2xl font-semibold">{collab.title}</h1>
        <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{collab.description}</p>
        <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-2 text-sm">
          {details
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-zinc-500">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
        </dl>
      </article>

      {isAuthor ? (
        <AuthorPanel postId={collab.id} open={open} now={now} />
      ) : !user ? (
        <Link
          href={`/login?next=/collabs/${collab.id}`}
          className="inline-flex h-11 items-center self-start rounded-full bg-violet-600 px-6 font-medium text-white hover:bg-violet-700"
        >
          Sign in to show interest
        </Link>
      ) : (
        <VisitorPanel postId={collab.id} me={user.id} authorId={author.user_id} authorName={author.display_name} open={open} />
      )}
    </>
  );
}

async function VisitorPanel({ postId, me, authorId, authorName, open }: { postId: string; me: string; authorId: string; authorName: string; open: boolean }) {
  const supabase = await createClient();
  const mine = await getMyInterest(supabase, postId, me);
  const contact = mine?.status === "accepted" ? await getContactFor(supabase, authorId) : null;

  if (mine) {
    return (
      <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        {mine.status === "pending" && (
          <>
            <p>You&apos;re interested. {authorName} will see your note and can accept you.</p>
            <form action={withdrawInterest}>
              <input type="hidden" name="id" value={mine.id} />
              <button className={secondaryButton}>Withdraw</button>
            </form>
          </>
        )}
        {mine.status === "accepted" && (
          <>
            <p className="font-medium">🎉 {authorName} accepted you for this collab.</p>
            {contact ? (
              <ContactBox name={authorName} contact={contact} />
            ) : (
              <p className="text-sm text-zinc-500">They haven&apos;t added contact details yet. Check their profile for links.</p>
            )}
          </>
        )}
        {mine.status === "declined" && <p className="text-zinc-500">{authorName} went with someone else this time.</p>}
      </section>
    );
  }
  if (!open) return <p className="text-zinc-500">This collab is closed.</p>;
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="font-semibold">Interested?</h2>
      <InterestForm postId={postId} />
    </section>
  );
}

async function AuthorPanel({ postId, open, now }: { postId: string; open: boolean; now: number }) {
  const supabase = await createClient();
  const interests = await getInterests(supabase, postId);
  const accepted = interests.filter((i) => i.status === "accepted");
  const contacts = new Map(
    await Promise.all(accepted.map(async (i) => [i.user_id, await getContactFor(supabase, i.user_id)] as const)),
  );

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto font-semibold">Interested creators ({interests.length})</h2>
        {open && (
          <form action={closeCollab}>
            <input type="hidden" name="id" value={postId} />
            <button className={secondaryButton}>Close collab</button>
          </form>
        )}
        <form action={deleteCollab}>
          <input type="hidden" name="id" value={postId} />
          <button className={secondaryButton}>Delete</button>
        </form>
      </div>
      {interests.length === 0 && <p className="text-sm text-zinc-500">Nobody yet. Share the link with creators you know.</p>}
      <ul className="flex flex-col gap-4">
        {interests.map((i) => {
          const p = i.person!;
          const contact = contacts.get(i.user_id);
          return (
            <li key={i.id} className="flex flex-col gap-2 border-t border-zinc-100 pt-4 first:border-0 first:pt-0 dark:border-zinc-900">
              <div className="flex items-center gap-3">
                <Link href={`/creators/${p.handle}`}>
                  <Avatar path={p.photo_path} name={p.display_name} size={36} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/creators/${p.handle}`} className="font-medium hover:underline">
                    {p.display_name}
                  </Link>
                  <p className="text-xs text-zinc-500">{updatedLabel(i.created_at, now)}</p>
                </div>
                {i.status === "pending" ? (
                  <div className="flex gap-2">
                    <form action={acceptInterest}>
                      <input type="hidden" name="id" value={i.id} />
                      <button className="h-9 rounded-full bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700">Accept</button>
                    </form>
                    <form action={declineInterest}>
                      <input type="hidden" name="id" value={i.id} />
                      <button className={secondaryButton}>Decline</button>
                    </form>
                  </div>
                ) : (
                  <span className="text-sm text-zinc-500">{i.status === "accepted" ? "Accepted" : "Declined"}</span>
                )}
              </div>
              {i.message && <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900">{i.message}</p>}
              {contact && <ContactBox name={p.display_name} contact={contact} />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
