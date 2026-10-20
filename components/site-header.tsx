import Link from "next/link";
import { Suspense } from "react";
import { countReceived } from "@/lib/connections/data";
import { createClient } from "@/lib/supabase/server";

const link = "rounded-full px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900";

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4">
        <Link href="/" className="mr-auto text-lg font-semibold text-violet-600">
          Peerpop
        </Link>
        <Link href="/creators" className={link}>
          Find creators
        </Link>
        {/* The session is only known per request, so the rest streams in. */}
        <Suspense fallback={null}>
          <AccountLinks />
        </Suspense>
      </div>
    </header>
  );
}

async function AccountLinks() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <Link href="/login" className={link}>
        Sign in
      </Link>
    );
  }
  const [requests, { count: unread }, { data: profile }] = await Promise.all([
    countReceived(supabase, user.id),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
    supabase.from("creator_profiles").select("handle").eq("user_id", user.id).maybeSingle(),
  ]);
  return (
    <>
      <Link href="/notifications" className={`${link} relative`} aria-label="Notifications">
        🔔
        {!!unread && (
          <span className="absolute -right-0.5 -top-0.5 rounded-full bg-red-600 px-1.5 text-xs text-white">{unread}</span>
        )}
      </Link>
      <Link href="/network" className={`${link} relative`}>
        My network
        {requests > 0 && (
          <span className="ml-1.5 rounded-full bg-violet-600 px-1.5 py-0.5 text-xs text-white">{requests}</span>
        )}
      </Link>
      {profile && (
        <Link href={`/creators/${profile.handle}`} className={link}>
          My profile
        </Link>
      )}
      <form action="/auth/signout" method="post">
        <button className={link}>Sign out</button>
      </form>
    </>
  );
}
