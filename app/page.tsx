import Link from "next/link";

// Signed-in visitors are sent to /home by proxy.ts, so this page stays static.
export default function LandingPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-4 py-24">
      <p className="font-medium text-violet-600">Peerpop · Pune</p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Find creators to collab with.
      </h1>
      <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
        Show your best videos, link your YouTube and Instagram, connect with other creators, and
        team up on your next shoot.
      </p>
      <div>
        <Link
          href="/login"
          className="inline-flex h-12 items-center rounded-full bg-violet-600 px-6 font-medium text-white hover:bg-violet-700"
        >
          Join Peerpop
        </Link>
      </div>
    </main>
  );
}
