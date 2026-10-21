import { Bell, Handshake, House, KeyRound, LogOut, Search, User, Users } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { countReceived } from "@/lib/connections/data";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "./avatar";
import { Dropdown } from "./dropdown";
import { Logo } from "./logo";
import { NavLink } from "./nav-link";

function Badge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-card">
      {count > 9 ? "9+" : count}
    </span>
  );
}

// The blur lives on a pseudo-element: a blurred parent would pin the phone tab bar to the header.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line before:absolute before:inset-0 before:-z-10 before:bg-card/85 before:backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4">
        <div className="mr-auto">
          <Logo />
        </div>
        {/* The session is only known per request, so the account part streams in. */}
        <Suspense fallback={null}>
          <AccountNav />
        </Suspense>
      </div>
    </header>
  );
}

async function AccountNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <nav className="hidden items-center gap-1 sm:flex">
          <NavLink href="/creators">Find creators</NavLink>
          <NavLink href="/collabs">Collabs</NavLink>
        </nav>
        <Link href="/login" className="btn-ghost btn-sm">
          Sign in
        </Link>
        <Link href="/login" className="btn-primary btn-sm">
          Join free
        </Link>
      </>
    );
  }

  const [requests, { count: unread }, { data: profile }] = await Promise.all([
    countReceived(supabase, user.id),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
    supabase.from("creator_profiles").select("handle, display_name, photo_path").eq("user_id", user.id).maybeSingle(),
  ]);

  return <SignedIn requests={requests} unread={unread ?? 0} profile={profile} />;
}

function SignedIn({ requests, unread, profile }: { requests: number; unread: number; profile: { handle: string; display_name: string; photo_path: string | null } | null }) {
  return (
    <>
      <nav className="hidden items-center gap-1 md:flex">
        <NavLink href="/home">
          <House size={17} /> Home
        </NavLink>
        <NavLink href="/creators">
          <Search size={17} /> Creators
        </NavLink>
        <NavLink href="/collabs">
          <Handshake size={17} /> Collabs
        </NavLink>
        <NavLink href="/network">
          <Users size={17} /> Network
          <Badge count={requests} />
        </NavLink>
      </nav>
      <Link
        href="/notifications"
        aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}
        className="relative ml-1 flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:bg-sunken hover:text-ink"
      >
        <Bell size={20} />
        <Badge count={unread ?? 0} />
      </Link>
      {profile && (
        <Dropdown
          className="group relative"
          summaryClassName="flex cursor-pointer list-none items-center rounded-full ring-brand/30 transition hover:ring-4 [&::-webkit-details-marker]:hidden"
          summary={<Avatar path={profile.photo_path} name={profile.display_name} size={36} />}
        >
          <div className="card absolute right-0 mt-2 w-56 overflow-hidden p-1.5 shadow-xl">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-semibold">{profile.display_name}</p>
            </div>
            <div className="my-1 h-px bg-line" />
            <Link href="/settings/profile" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-sunken">
              <User size={16} className="text-muted" /> My profile
            </Link>
            <Link href="/settings/password" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-sunken">
              <KeyRound size={16} className="text-muted" /> Change password
            </Link>
            <form action="/auth/signout" method="post">
              <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-sunken">
                <LogOut size={16} className="text-muted" /> Sign out
              </button>
            </form>
          </div>
        </Dropdown>
      )}

      {/* Phones get a bottom tab bar instead of the header links. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <NavLink href="/home" variant="tab">
          <House size={22} /> Home
        </NavLink>
        <NavLink href="/creators" variant="tab">
          <Search size={22} /> Creators
        </NavLink>
        <NavLink href="/collabs" variant="tab">
          <Handshake size={22} /> Collabs
        </NavLink>
        <NavLink href="/network" variant="tab">
          <span className="relative">
            <Users size={22} />
            <Badge count={requests} />
          </span>
          Network
        </NavLink>
        {profile && (
          <NavLink href="/settings/profile" variant="tab">
            <User size={22} /> Profile
          </NavLink>
        )}
      </nav>
    </>
  );
}
