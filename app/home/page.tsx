import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Home · Peerpop" };

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Welcome to Peerpop</h1>
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <SignedInAs />
      </Suspense>
    </main>
  );
}

async function SignedInAs() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/home");

  return (
    <>
      <p className="text-zinc-600 dark:text-zinc-400">
        You&apos;re signed in as <strong>{user.email}</strong>. Profiles, search, connections
        and collabs are on the way.
      </p>
      <form action="/auth/signout" method="post">
        <button className="h-10 rounded-full border border-zinc-300 px-5 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900">
          Sign out
        </button>
      </form>
    </>
  );
}
