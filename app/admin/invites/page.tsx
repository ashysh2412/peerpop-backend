import type { Metadata } from "next";
import { ArrowLeft, CheckCircle2, Mail, Send } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CardsSkeleton } from "@/components/skeleton";
import { isConfirmedAdmin } from "@/lib/admin/access";
import { allAuthUsers } from "@/lib/admin/data";
import { emailIsSetUp } from "@/lib/email/send";
import { inviteEmail } from "@/lib/email/templates";
import { requireUser } from "@/lib/profile/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { addInvites, removeInvite, sendInvites, sendTestInvite } from "./actions";

export const metadata: Metadata = { title: "Invites · Admin · Peerpop", robots: { index: false } };

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

type Invite = { email: string; name: string | null; added_at: string; sent_at: string | null };

export default function InvitesPage({ searchParams }: PageProps<"/admin/invites">) {
  return (
    <main className="page flex flex-col gap-6">
      <Suspense fallback={<CardsSkeleton />}>
        <Invites searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function noteText(note: unknown, n: unknown) {
  const count = Number(n) || 0;
  switch (note) {
    case "added":
      return count ? `Found ${count} email${count === 1 ? "" : "s"}. Anyone already on the list was skipped.` : "No emails found in what you pasted.";
    case "save-failed":
      return "Those emails didn't save. Please try again.";
    case "test-sent":
      return "A test invite is on its way to your inbox.";
    case "sent":
      return `Sent ${count} invite${count === 1 ? "" : "s"}.`;
    case "none":
      return "Everyone on the list has already been invited or has joined.";
    case "confirm":
      return "Tick the box to confirm before sending.";
    case "no-email":
      return "Email didn't send. This only works on the live site.";
    default:
      return null;
  }
}

async function Invites({ searchParams }: Pick<PageProps<"/admin/invites">, "searchParams">) {
  const { supabase } = await requireUser("/admin/invites");
  if (!(await isConfirmedAdmin(supabase))) notFound();
  const { note, n } = await searchParams;
  const db = createAdminClient();
  const [{ data }, users] = await Promise.all([
    db.from("invites").select("email, name, added_at, sent_at").order("added_at", { ascending: false }).limit(5000),
    allAuthUsers(db),
  ]);
  const invites = (data ?? []) as Invite[];
  const joined = new Set(users.map((u) => u.email?.toLowerCase()).filter(Boolean));
  const waiting = invites.filter((i) => !i.sent_at && !joined.has(i.email)).length;
  const sent = invites.filter((i) => i.sent_at).length;
  const joinedCount = invites.filter((i) => joined.has(i.email)).length;
  const message = noteText(note, n);
  const preview = inviteEmail({ name: "Asha", siteUrl: "https://peerpop.in" });

  return (
    <>
      <div>
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft size={16} /> Admin
        </Link>
        <h1 className="page-title mt-2">Invite your waiting list</h1>
        <p className="mt-1 text-muted">Paste emails from your old app, check the test email, then send everyone an invite to join.</p>
      </div>

      {message && <p className="card bg-brand-soft p-4 text-sm font-medium">{message}</p>}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["On the list", invites.length],
            ["Not invited yet", waiting],
            ["Invited", sent],
            ["Joined", joinedCount],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="card p-4">
            <dt className="text-xs font-medium text-muted">{label}</dt>
            <dd className="text-2xl font-bold">{value.toLocaleString("en-IN")}</dd>
          </div>
        ))}
      </dl>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-lg font-semibold">1. Paste the list</h2>
        <p className="text-sm text-muted">
          Copy the rows from your old app&apos;s Waitlist and Registered Users pages and paste them here. Peerpop picks out the names and emails.
        </p>
        <form action={addInvites} className="flex flex-col gap-3">
          <textarea name="list" rows={6} required className="input min-h-32 resize-y text-sm" placeholder={"Asha Rao   asha@example.com\nRavi   ravi@example.com"} />
          <button className="btn-dark self-start">Add to list</button>
        </form>
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-lg font-semibold">2. Check the email</h2>
        <div className="rounded-2xl border border-line bg-white p-4 text-sm">
          <p className="font-semibold">{preview.subject}</p>
          <p className="mt-2 whitespace-pre-line text-muted">{preview.text}</p>
        </div>
        <form action={sendTestInvite}>
          <button className="btn-secondary">
            <Mail size={16} /> Send a test to me
          </button>
        </form>
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-lg font-semibold">3. Send the invites</h2>
        {!emailIsSetUp() ? (
          <p className="text-sm text-muted">Sending works on the live site only.</p>
        ) : waiting === 0 ? (
          <p className="text-sm text-muted">Nobody is waiting for an invite.</p>
        ) : (
          <form action={sendInvites} className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="confirm" value="yes" required className="h-4 w-4" />
              I&apos;ve checked the test email. Send it to {Math.min(waiting, 100)} people now.
            </label>
            <button className="btn-primary self-start">
              <Send size={16} /> Send {Math.min(waiting, 100)} invites
            </button>
            {waiting > 100 && <p className="text-xs text-muted">It sends 100 at a time. Press again for the next 100.</p>}
          </form>
        )}
      </section>

      {invites.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Everyone on the list</h2>
          <ul className="card divide-y divide-line">
            {invites.map((i) => (
              <li key={i.email} className="flex items-center gap-3 p-3 text-sm">
                <div className="mr-auto min-w-0">
                  <p className="truncate font-semibold">{i.name ?? i.email}</p>
                  {i.name && <p className="truncate text-xs text-muted">{i.email}</p>}
                </div>
                {joined.has(i.email) ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                    <CheckCircle2 size={13} /> Joined
                  </span>
                ) : i.sent_at ? (
                  <span className="text-xs text-muted">Invited {dateFormat.format(new Date(i.sent_at))}</span>
                ) : (
                  <form action={removeInvite}>
                    <input type="hidden" name="email" value={i.email} />
                    <button className="btn-ghost btn-sm">Remove</button>
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
