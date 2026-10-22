import type { Metadata } from "next";
import Link from "next/link";
import { ProfileLink } from "@/components/profile-link";
import { Suspense } from "react";
import { getOwnContacts, getOwnPlatforms, getVideos, requireUser } from "@/lib/profile/data";
import { ensureProfile } from "@/lib/profile/ensure";
import { ContactsSection, LinksSection, PhotoSection, ProfileSection, VideosSection } from "./sections";
import { YouTubeSection } from "./youtube-section";

export const metadata: Metadata = { title: "Edit profile · Peerpop" };

export default function SettingsProfilePage() {
  return (
    <main className="page-narrow flex flex-col gap-6">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Settings />
      </Suspense>
    </main>
  );
}

async function Settings() {
  const { supabase, user } = await requireUser("/settings/profile");
  const { profile } = await ensureProfile(supabase, user);
  const [platforms, videos, contacts] = await Promise.all([
    getOwnPlatforms(supabase, user.id),
    getVideos(supabase, user.id),
    getOwnContacts(supabase, user.id),
  ]);

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="page-title">My profile</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium">
          <Link href="/settings/password" className="text-muted hover:text-ink">
            Change password
          </Link>
          <Link href={`/creators/${profile.handle}`} className="text-brand-ink hover:underline">
            See how others see it →
          </Link>
        </div>
      </div>
      <ProfileLink handle={profile.handle} />
      <PhotoSection userId={user.id} photoPath={profile.photo_path} />
      <ProfileSection profile={profile} />
      <VideosSection videos={videos} />
      <YouTubeSection account={platforms.find((p) => p.platform === "youtube")} />
      <LinksSection platforms={platforms} />
      <ContactsSection contacts={contacts} />
    </>
  );
}
