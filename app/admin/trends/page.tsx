import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CardsSkeleton } from "@/components/skeleton";
import { isConfirmedAdmin } from "@/lib/admin/access";
import { requireUser } from "@/lib/profile/data";
import { getTrends, TREND_MAX_AGE_DAYS, TREND_ROWS } from "@/lib/trends/data";
import { TrendsForm } from "./form";

export const metadata: Metadata = { title: "Trending this week · Admin · Peerpop", robots: { index: false } };

function currentTime() {
  return Date.now();
}

export default function TrendsPage() {
  return (
    <main className="page flex max-w-2xl flex-col gap-6">
      <Suspense fallback={<CardsSkeleton />}>
        <Trends />
      </Suspense>
    </main>
  );
}

async function Trends() {
  const { supabase } = await requireUser("/admin/trends");
  if (!(await isConfirmedAdmin(supabase))) notFound();
  const trends = await getTrends(supabase, currentTime(), { includeStale: true });
  return (
    <>
      <div>
        <Link href="/admin" className="btn-ghost btn-sm -ml-2 mb-2">
          <ArrowLeft size={16} /> Admin
        </Link>
        <h1 className="page-title">Trending on Insta</h1>
        <p className="mt-1 text-muted">
          Up to {TREND_ROWS} trends for the box on everyone&apos;s Home. Fill only the ones you want; empty rows are skipped. The box hides itself if
          nothing is saved for {TREND_MAX_AGE_DAYS} days, so it never looks old.
        </p>
      </div>
      <TrendsForm trends={trends} rows={TREND_ROWS} />
    </>
  );
}
