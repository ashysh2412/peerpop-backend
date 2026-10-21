import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
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
import { getSessionUser } from "@/lib/supabase/session";
import { CardsSkeleton } from "@/components/skeleton";

export const metadata: Metadata = { title: "Collab · Peerpop" };

function currentTime() {
  return Date.now();
}

export default function CollabPage({ params }: PageProps<"/collabs/[id]">) {
  return (
    <main className="page-narrow flex flex-col gap-5">
      <Link href="/collabs" className="flex items-center gap-1 self-start text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft size={16} /> All collabs
      </Link>
      <Suspense fallback={<CardsSkeleton />}>
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
  } = await getSessionUser(supabase);
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
      <article className="card flex flex-col gap-5 p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <Link href={`/creators/${author.handle}`}>
            <Avatar path={author.photo_path} name={author.display_name} size={44} />
          </Link>
          <div className="flex-1">
            <Link href={`/creators/${author.handle}`} className="font-bold hover:underline">
              {author.display_name}
            </Link>
            <p className="text-xs text-muted">Posted {updatedLabel(collab.created_at, now)}</p>
          </div>
          <span className={open ? "chip-green" : "chip"}>{open ? "Open" : "Closed"}</span>
        </div>
        <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">{collab.title}</h1>
        <p className="leading-relaxed whitespace-pre-wrap">{collab.description}</p>
        <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-3 rounded-xl bg-sunken p-4 text-sm">
          {details
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="font-medium text-muted">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
        </dl>
      </article>

      {isAuthor ? (
        <AuthorPanel postId={collab.id} open={open} now={now} />
      ) : !user ? (
        <Link href={`/login?next=/collabs/${collab.id}`} className="btn-primary btn-lg self-start">
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
      <section className="card flex flex-col gap-3 p-5">
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
            <p className="font-bold">🎉 {authorName} accepted you for this collab.</p>
            {contact ? (
              <ContactBox name={authorName} contact={contact} />
            ) : (
              <p className="text-sm text-muted">They haven&apos;t added contact details yet. Check their profile for links.</p>
            )}
          </>
        )}
        {mine.status === "declined" && <p className="text-muted">{authorName} went with someone else this time.</p>}
      </section>
    );
  }
  if (!open) return <p className="card p-5 text-muted">This collab is closed.</p>;
  return (
    <section className="card flex flex-col gap-3 p-5">
      <h2 className="text-lg font-bold">Interested?</h2>
      <p className="-mt-2 text-sm text-muted">{authorName} will see your note and can accept you. Then you both get each other&apos;s contacts.</p>
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
    <section className="card flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-lg font-bold">Interested creators ({interests.length})</h2>
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
      {interests.length === 0 && <p className="rounded-xl bg-sunken p-4 text-sm text-muted">Nobody yet. Share this page with creators you know.</p>}
      <ul className="flex flex-col gap-4">
        {interests.map((i) => {
          const p = i.person!;
          const contact = contacts.get(i.user_id);
          return (
            <li key={i.id} className="flex flex-col gap-2 border-t border-line pt-4 first:border-0 first:pt-0">
              <div className="flex items-center gap-3">
                <Link href={`/creators/${p.handle}`}>
                  <Avatar path={p.photo_path} name={p.display_name} size={36} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/creators/${p.handle}`} className="font-semibold hover:underline">
                    {p.display_name}
                  </Link>
                  <p className="text-xs text-muted">{updatedLabel(i.created_at, now)}</p>
                </div>
                {i.status === "pending" ? (
                  <div className="flex gap-2">
                    <form action={acceptInterest}>
                      <input type="hidden" name="id" value={i.id} />
                      <button className="btn-primary btn-sm">Accept</button>
                    </form>
                    <form action={declineInterest}>
                      <input type="hidden" name="id" value={i.id} />
                      <button className={secondaryButton}>Decline</button>
                    </form>
                  </div>
                ) : (
                  <span className={i.status === "accepted" ? "chip-green" : "chip"}>{i.status === "accepted" ? "Accepted" : "Declined"}</span>
                )}
              </div>
              {i.message && <p className="rounded-xl bg-sunken px-3.5 py-2.5 text-sm">{i.message}</p>}
              {contact && <ContactBox name={p.display_name} contact={contact} />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
