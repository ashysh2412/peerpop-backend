import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getOwnContacts, getOwnPlatforms, getProfileById, getVideos, requireUser } from "@/lib/profile/data";
import { ContactsSection, LinksSection, PhotoSection, ProfileSection, VideosSection } from "./sections";
import { YouTubeSection } from "./youtube-section";

export const metadata: Metadata = { title: "Edit profile · Peerpop" };

export default function SettingsProfilePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12">
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <Settings />
      </Suspense>
    </main>
  );
}

async function Settings() {
  const { supabase, user } = await requireUser("/settings/profile");
  const profile = await getProfileById(supabase, user.id);
  if (!profile) redirect("/onboarding");
  const [platforms, videos, contacts] = await Promise.all([
    getOwnPlatforms(supabase, user.id),
    getVideos(supabase, user.id),
    getOwnContacts(supabase, user.id),
  ]);

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Edit profile</h1>
        <Link href={`/creators/${profile.handle}`} className="text-sm font-medium text-violet-600 hover:underline">
          View my profile →
        </Link>
      </div>
      <PhotoSection userId={user.id} photoPath={profile.photo_path} />
      <ProfileSection profile={profile} />
      <VideosSection videos={videos} />
      <YouTubeSection account={platforms.find((p) => p.platform === "youtube")} />
      <LinksSection platforms={platforms} />
      <ContactsSection contacts={contacts} />
    </>
  );
}
