import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CollabForm } from "@/components/collab-form";
import { getProfileById, requireUser } from "@/lib/profile/data";

export const metadata: Metadata = { title: "Post a collab · Peerpop" };

export default function NewCollabPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">Post a collab</h1>
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <NewCollab />
      </Suspense>
    </main>
  );
}

async function NewCollab() {
  const { supabase, user } = await requireUser("/collabs/new");
  const profile = await getProfileById(supabase, user.id);
  if (!profile) redirect("/onboarding");
  return <CollabForm city={profile.city_slug} />;
}
