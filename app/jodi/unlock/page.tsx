import type { Metadata } from "next";
import { Suspense } from "react";
import { CardsSkeleton } from "@/components/skeleton";
import { NICHES, POPULAR_NICHES } from "@/lib/catalog";
import { getProfileById, requireUser } from "@/lib/profile/data";
import { UnlockForm } from "./form";

export const metadata: Metadata = { title: "Unlock your Jodis · Peerpop", robots: { index: false } };

// Popular niches up front, the rest behind "More niches", so the form stays short.
const POPULAR = POPULAR_NICHES.map((k) => NICHES.find(([n]) => n === k)!);
const MORE = NICHES.filter(([k]) => !(POPULAR_NICHES as readonly string[]).includes(k));

export default function UnlockPage() {
  return (
    <main className="page flex max-w-md flex-col gap-6">
      <Suspense fallback={<CardsSkeleton />}>
        <Unlock />
      </Suspense>
    </main>
  );
}

async function Unlock() {
  const { supabase, user } = await requireUser("/jodi/unlock");
  const profile = await getProfileById(supabase, user.id);
  return (
    <div className="card flex flex-col gap-5 p-6">
      <div className="text-center">
        <p className="text-4xl">🔒</p>
        <h1 className="mt-2 text-xl font-bold">Unlock your collab Jodis</h1>
        <p className="mt-1 text-muted">Creators your size are waiting. Two quick things and we&apos;ll match you.</p>
      </div>
      <UnlockForm niches={profile?.niches ?? []} popular={POPULAR} more={MORE} />
    </div>
  );
}
