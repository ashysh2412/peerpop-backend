import type { Metadata } from "next";
import { ChevronRight, EyeOff } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { CardsSkeleton } from "@/components/skeleton";
import { updatedLabel } from "@/components/youtube-stats";
import { CITIES, SKILLS, labelFor } from "@/lib/catalog";
import { requireUser } from "@/lib/profile/data";
import { ensureProfile } from "@/lib/profile/ensure";
import { getBrowsePrivately, getProfileViewCount, getProfileViewers } from "@/lib/profile/views";

export const metadata: Metadata = { title: "Who viewed your profile · Peerpop" };

function currentTime() {
  return Date.now();
}

export default function ProfileViewsPage() {
  return (
    <main className="page-narrow flex flex-col gap-5">
      <div>
        <h1 className="page-title">Who viewed your profile</h1>
        <p className="mt-1 text-sm text-muted">Creators who opened your profile in the last 30 days.</p>
      </div>
      <Suspense fallback={<CardsSkeleton />}>
        <Views />
      </Suspense>
    </main>
  );
}

async function Views() {
  const { supabase, user } = await requireUser("/profile-views");
  const { profile } = await ensureProfile(supabase, user);
  const [count, viewers, browsePrivately] = await Promise.all([
    getProfileViewCount(supabase),
    getProfileViewers(supabase),
    getBrowsePrivately(supabase, user.id),
  ]);
  const now = currentTime();

  return (
    <>
      <section className="card flex items-center gap-4 p-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-2xl">👀</span>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold tracking-tight">{count}</p>
          <p className="text-sm text-muted">{count === 1 ? "person viewed" : "people viewed"} your profile</p>
        </div>
        <Link href={`/creators/${profile.handle}`} className="btn-secondary btn-sm shrink-0">
          My profile
        </Link>
      </section>

      {browsePrivately ? (
        <div className="empty">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sunken text-ink">
            <EyeOff size={22} />
          </span>
          <p className="font-semibold text-ink">You&apos;re browsing privately</p>
          <p className="max-w-sm text-sm">People don&apos;t see when you view them, so their names are hidden from you too.</p>
          <Link href="/settings/profile#profile-views" className="btn-primary btn-sm mt-1">
            Change this
          </Link>
        </div>
      ) : viewers.length === 0 ? (
        <div className="empty">
          <span className="text-4xl">👋</span>
          <p className="font-semibold text-ink">No views yet</p>
          <p className="max-w-sm text-sm">Add your best videos and a short bio, then post or connect with a few creators. More people will find you.</p>
          <Link href="/settings/profile" className="btn-primary btn-sm mt-1">
            Improve my profile
          </Link>
        </div>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {viewers.map((v) => {
            const about = [v.skills[0] && labelFor(SKILLS, v.skills[0]), v.city_slug && labelFor(CITIES, v.city_slug)].filter(Boolean).join(" · ");
            return (
              <li key={v.user_id}>
                <Link href={`/creators/${v.handle}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-sunken">
                  <Avatar path={v.photo_path} name={v.display_name} size={48} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{v.display_name}</span>
                    {about && <span className="block truncate text-sm text-muted">{about}</span>}
                    <span className="block text-xs text-muted">
                      Viewed {updatedLabel(v.viewed_at, now)}
                      {v.times > 1 && ` · ${v.times} times`}
                    </span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-center text-xs text-muted">
        Want to look around without showing up? Turn on{" "}
        <Link href="/settings/profile#profile-views" className="font-medium underline">
          Browse privately
        </Link>
        .
      </p>
    </>
  );
}
