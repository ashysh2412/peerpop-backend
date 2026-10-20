import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getProfileById, requireUser } from "@/lib/profile/data";
import { isGooglePhotoUrl } from "@/lib/profile/google-photo";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Set up your profile · Peerpop" };

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-6 sm:py-10">
      <div>
        <h1 className="page-title">Make your profile</h1>
        <p className="mt-2 text-muted">Takes about 30 seconds.</p>
      </div>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Onboarding />
      </Suspense>
    </main>
  );
}

async function Onboarding() {
  const { supabase, user } = await requireUser("/onboarding");
  if (await getProfileById(supabase, user.id)) redirect("/settings/profile");
  const suggestedName =
    (user.user_metadata?.full_name as string | undefined) ?? (user.user_metadata?.name as string | undefined) ?? "";
  const photo = user.user_metadata?.avatar_url ?? user.user_metadata?.picture;
  return <OnboardingForm userId={user.id} suggestedName={suggestedName} googlePhoto={isGooglePhotoUrl(photo) ? photo : null} />;
}
