import type { Metadata } from "next";
import { Camera, Download, Flag, Mail, Search } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CardsSkeleton } from "@/components/skeleton";
import { updatedLabel } from "@/components/youtube-stats";
import { isConfirmedAdmin } from "@/lib/admin/access";
import { getAdminOverview } from "@/lib/admin/data";
import { CITIES, labelFor } from "@/lib/catalog";
import { requireUser } from "@/lib/profile/data";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Admin · Peerpop", robots: { index: false } };

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

function currentTime() {
  return Date.now();
}

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <main className="page flex flex-col gap-6">
      <Suspense fallback={<CardsSkeleton />}>
        <Admin searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Admin({ searchParams }: Pick<PageProps<"/admin">, "searchParams">) {
  const { supabase } = await requireUser("/admin");
  // Anyone else gets a plain "not found", so the page doesn't advertise itself.
  if (!(await isConfirmedAdmin(supabase))) notFound();
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().toLowerCase() : "";
  const now = currentTime();
  const [{ users, totals }, { count: openReports }] = await Promise.all([
    getAdminOverview(now),
    createAdminClient().from("reports").select("id", { count: "exact", head: true }).is("resolved_at", null),
  ]);
  const shown = query ? users.filter((u) => [u.name, u.email, u.handle, u.city].some((v) => v?.toLowerCase().includes(query))) : users;

  const stats: [string, number][] = [
    ["Total users", totals.users],
    ["Joined today", totals.today],
    ["Last 7 days", totals.week],
    ["Last 30 days", totals.month],
    ["Posts", totals.posts],
    ["Collabs", totals.collabs],
    ["Groups", totals.groups],
    ["Messages", totals.messages],
    ["Connections", totals.connections],
  ];

  return (
    <>
      <div className="flex flex-wrap items-end gap-4">
        <div className="mr-auto">
          <h1 className="page-title">Admin</h1>
          <p className="mt-1 text-muted">Who has joined Peerpop and what they&apos;re doing. Only you can see this page.</p>
        </div>
        <Link href="/admin/reports" className="btn-secondary">
          <Flag size={16} /> Reports{!!openReports && <span className="rounded-full bg-red-600 px-1.5 text-xs text-white">{openReports}</span>}
        </Link>
        <Link href="/admin/invites" className="btn-secondary">
          <Mail size={16} /> Invite waiting list
        </Link>
        <Link href="/admin/instagram" className="btn-dark">
          <Camera size={16} /> Instagram posts
        </Link>
        <a href="/admin/users.csv" className="btn-secondary">
          <Download size={16} /> Download as spreadsheet
        </a>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(([label, value]) => (
          <div key={label} className="card p-4">
            <dt className="text-xs font-medium text-muted">{label}</dt>
            <dd className="text-2xl font-bold">{value.toLocaleString("en-IN")}</dd>
          </div>
        ))}
      </dl>

      <section className="card overflow-hidden">
        <form className="flex items-center gap-2 border-b border-line p-3">
          <Search size={17} className="ml-1 text-muted" />
          <input name="q" defaultValue={query} placeholder="Search by name, email or city" className="h-9 flex-1 bg-transparent text-sm outline-none" />
          {query && (
            <Link href="/admin" className="btn-ghost btn-sm">
              Clear
            </Link>
          )}
        </form>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-sunken text-xs text-muted">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Name</th>
                <th className="px-4 py-2.5 font-semibold">Email</th>
                <th className="px-4 py-2.5 font-semibold">City</th>
                <th className="px-4 py-2.5 font-semibold">Joined</th>
                <th className="px-4 py-2.5 font-semibold">Last login</th>
                <th className="px-4 py-2.5 font-semibold">Signs in with</th>
                <th className="px-4 py-2.5 text-right font-semibold">Posts</th>
                <th className="px-4 py-2.5 text-right font-semibold">Connections</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    {u.handle ? (
                      <Link href={`/creators/${u.handle}`} className="font-semibold hover:underline">
                        {u.name}
                      </Link>
                    ) : (
                      <span className="text-muted">No profile yet</span>
                    )}
                    {u.handle && !u.hasPhoto && <span className="chip ml-2 py-0.5 text-[11px]">No photo</span>}
                  </td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.city ? labelFor(CITIES, u.city) : "–"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{dateFormat.format(new Date(u.joined))}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">{u.lastSeen ? updatedLabel(u.lastSeen, now) : "Never"}</td>
                  <td className="px-4 py-3 capitalize">{u.method}</td>
                  <td className="px-4 py-3 text-right">{u.posts}</td>
                  <td className="px-4 py-3 text-right">{u.connections}</td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted">
                    {query ? "Nobody matches that search." : "Nobody has joined yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
