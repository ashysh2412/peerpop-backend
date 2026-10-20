import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { countReceived } from "@/lib/connections/data";
import { getProfileById, requireUser } from "@/lib/profile/data";

export const metadata: Metadata = { title: "Home · Peerpop" };

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-16">
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <Home />
      </Suspense>
    </main>
  );
}

async function Home() {
  const { supabase, user } = await requireUser("/home");
  const profile = await getProfileById(supabase, user.id);
  if (!profile) redirect("/onboarding");
  const requests = await countReceived(supabase, user.id);

  return (
    <>
      <h1 className="text-2xl font-semibold">Welcome back, {profile.display_name}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Find creators to collab with by city, niche and audience size, and connect with them.
      </p>
      {requests > 0 && (
        <Link
          href="/network?tab=received"
          className="rounded-xl bg-violet-50 p-4 font-medium text-violet-900 hover:bg-violet-100 dark:bg-violet-950 dark:text-violet-100"
        >
          You have {requests} connection {requests === 1 ? "request" : "requests"} waiting →
        </Link>
      )}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/creators"
          className="inline-flex h-10 items-center rounded-full bg-violet-600 px-5 font-medium text-white hover:bg-violet-700"
        >
          Find creators
        </Link>
        <Link
          href="/network"
          className="inline-flex h-10 items-center rounded-full border border-zinc-300 px-5 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          My network
        </Link>
        <Link
          href={`/creators/${profile.handle}`}
          className="inline-flex h-10 items-center rounded-full border border-zinc-300 px-5 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          View my profile
        </Link>
        <Link
          href="/settings/profile"
          className="inline-flex h-10 items-center rounded-full border border-zinc-300 px-5 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Edit profile
        </Link>
      </div>
      <form action="/auth/signout" method="post">
        <button className="text-sm text-zinc-500 hover:underline">Sign out</button>
      </form>
    </>
  );
}
