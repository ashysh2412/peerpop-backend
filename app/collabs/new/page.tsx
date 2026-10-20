import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CollabForm } from "@/components/collab-form";
import { getProfileById, requireUser } from "@/lib/profile/data";

export const metadata: Metadata = { title: "Post a collab · Peerpop" };

export default function NewCollabPage() {
  return (
    <main className="page-narrow flex flex-col gap-6">
      <div>
        <h1 className="page-title">Post a collab</h1>
        <p className="mt-1 text-muted">Tell creators what you&apos;re making and who you need.</p>
      </div>
      <div className="card p-5 sm:p-7">
        <Suspense fallback={<p className="text-muted">Loading…</p>}>
          <NewCollab />
        </Suspense>
      </div>
    </main>
  );
}

async function NewCollab() {
  const { supabase, user } = await requireUser("/collabs/new");
  const profile = await getProfileById(supabase, user.id);
  if (!profile) redirect("/onboarding");
  return <CollabForm city={profile.city_slug} />;
}
