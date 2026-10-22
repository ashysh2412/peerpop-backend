import type { Metadata } from "next";
import { ArrowLeft, Flag } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CardsSkeleton } from "@/components/skeleton";
import { isConfirmedAdmin } from "@/lib/admin/access";
import { requireUser } from "@/lib/profile/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteAccount, markHandled } from "./actions";

export const metadata: Metadata = { title: "Reports · Admin · Peerpop", robots: { index: false } };

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

type Person = { user_id: string; handle: string; display_name: string } | null;
type ReportRow = { id: string; reason: string; created_at: string; target_user: string; reporter: Person; target: Person };

export default function ReportsPage() {
  return (
    <main className="page flex flex-col gap-6">
      <Suspense fallback={<CardsSkeleton />}>
        <Reports />
      </Suspense>
    </main>
  );
}

async function Reports() {
  const { supabase } = await requireUser("/admin/reports");
  if (!(await isConfirmedAdmin(supabase))) notFound();
  const db = createAdminClient();
  const { data } = await db
    .from("reports")
    .select(
      "id, reason, created_at, target_user, reporter:creator_profiles!reports_reporter_id_fkey(user_id, handle, display_name), target:creator_profiles!reports_target_user_fkey(user_id, handle, display_name)",
    )
    .is("resolved_at", null)
    .not("target_user", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);
  const rows = (data ?? []) as unknown as ReportRow[];

  // One card per reported person, with every open report about them.
  const byPerson = new Map<string, ReportRow[]>();
  for (const r of rows) byPerson.set(r.target_user, [...(byPerson.get(r.target_user) ?? []), r]);

  return (
    <>
      <div>
        <Link href="/admin" className="flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft size={15} /> Admin
        </Link>
        <h1 className="page-title mt-2 flex items-center gap-2">
          <Flag size={22} /> Reports
        </h1>
        <p className="mt-1 text-muted">People reported by other creators. Look at their profile, then mark it handled or delete the account.</p>
      </div>

      {byPerson.size === 0 && <p className="empty">No open reports. 🎉</p>}

      {[...byPerson.entries()].map(([userId, reports]) => {
        const target = reports[0].target;
        return (
          <section key={userId} className="card flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="mr-auto text-lg font-semibold">
                {target ? (
                  <Link href={`/creators/${target.handle}`} className="hover:underline">
                    {target.display_name}
                  </Link>
                ) : (
                  "Unknown"
                )}
              </h2>
              <span className={reports.length > 1 ? "chip bg-red-50 text-red-700" : "chip"}>
                {reports.length} {reports.length === 1 ? "report" : "reports"}
              </span>
            </div>
            <ul className="flex flex-col gap-2 text-sm">
              {reports.map((r) => (
                <li key={r.id} className="rounded-xl bg-sunken px-3.5 py-2.5">
                  <p>{r.reason}</p>
                  <p className="mt-1 text-xs text-muted">
                    From {r.reporter?.display_name ?? "a deleted account"} · {dateFormat.format(new Date(r.created_at))}
                  </p>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
              <form action={markHandled}>
                <input type="hidden" name="user_id" value={userId} />
                <button className="btn-secondary btn-sm">Mark handled</button>
              </form>
              <form action={deleteAccount} className="flex items-center gap-2">
                <input type="hidden" name="user_id" value={userId} />
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  <input type="checkbox" name="confirm" required /> I&apos;m sure
                </label>
                <button className="btn-sm rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">Delete account</button>
              </form>
            </div>
          </section>
        );
      })}
    </>
  );
}
