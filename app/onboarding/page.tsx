import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/profile/data";
import { ensureProfile } from "@/lib/profile/ensure";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Set up your profile · Peerpop" };

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-6 sm:py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Make your profile</h1>
          <p className="mt-2 text-muted">Takes 30 seconds. You can also do it later.</p>
        </div>
        <Link href="/home" className="btn-secondary btn-sm shrink-0">
          Skip
        </Link>
      </div>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Onboarding />
      </Suspense>
    </main>
  );
}

async function Onboarding() {
  const { supabase, user } = await requireUser("/onboarding");
  const { profile } = await ensureProfile(supabase, user);
  return <OnboardingForm userId={user.id} profile={profile} />;
}
