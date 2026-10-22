import type { Metadata } from "next";
import { Ban, Flag } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { CardsSkeleton } from "@/components/skeleton";
import { SubmitButton } from "@/components/ui";
import { getProfileByHandle, requireUser } from "@/lib/profile/data";
import { REPORT_REASONS } from "@/lib/safety/reasons";
import { blockCreator, reportCreator } from "@/app/safety/actions";

export const metadata: Metadata = { title: "Report or block · Peerpop", robots: { index: false } };

export default function ReportPage({ params, searchParams }: PageProps<"/creators/[handle]/report">) {
  return (
    <main className="page-narrow flex flex-col gap-5 py-6 sm:py-10">
      <Suspense fallback={<CardsSkeleton />}>
        <Report params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Report({ params, searchParams }: PageProps<"/creators/[handle]/report">) {
  const { handle } = await params;
  const { note } = await searchParams;
  const { supabase, user } = await requireUser(`/creators/${handle}/report`);
  const other = await getProfileByHandle(supabase, decodeURIComponent(handle));
  if (!other) notFound();
  if (other.user_id === user.id) redirect(`/creators/${other.handle}`);
  const first = other.display_name.split(" ")[0];

  return (
    <>
      <Link href={`/creators/${other.handle}`} className="flex items-center gap-3 self-start hover:underline">
        <Avatar path={other.photo_path} name={other.display_name} size={44} />
        <span className="font-semibold">{other.display_name}</span>
      </Link>

      <form action={reportCreator} className="card flex flex-col gap-4 p-5">
        <input type="hidden" name="user_id" value={other.user_id} />
        <input type="hidden" name="handle" value={other.handle} />
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Flag size={19} /> Report {first}
          </h1>
          <p className="mt-1 text-sm text-muted">Only the Peerpop team sees this. {first} won&apos;t know who reported them.</p>
        </div>
        {note === "failed" && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">That didn&apos;t send. Please try again.</p>}
        <fieldset className="flex flex-col gap-2">
          <legend className="label mb-1">What&apos;s wrong?</legend>
          {REPORT_REASONS.map((r, i) => (
            <label key={r} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3.5 py-2.5 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/10">
              <input type="radio" name="reason" value={r} defaultChecked={i === 0} className="accent-[var(--brand)]" />
              {r}
            </label>
          ))}
        </fieldset>
        <textarea name="details" maxLength={900} rows={3} placeholder="Tell us more (optional)" className="textarea" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="block" className="h-4 w-4 accent-[var(--brand)]" /> Also block {first}
        </label>
        <SubmitButton pendingText="Sending…">Send report</SubmitButton>
      </form>

      <form action={blockCreator} className="card flex flex-col gap-3 p-5">
        <input type="hidden" name="user_id" value={other.user_id} />
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Ban size={18} /> Block {first}
        </h2>
        <p className="text-sm text-muted">
          You won&apos;t see each other anywhere on Peerpop, and {first} can&apos;t message you or send you requests. If you&apos;re connected, the connection
          is removed. {first} isn&apos;t told. You can unblock them in Settings.
        </p>
        <button className="btn-dark self-start">Block {first}</button>
      </form>
    </>
  );
}
