import { Handshake, LayoutGrid, MapPin, MessageCircle, Pencil, Users } from "lucide-react";
import Link from "next/link";
import { CITIES, NICHES, SKILLS, labelFor } from "@/lib/catalog";
import type { Profile } from "@/lib/profile/types";
import { Avatar } from "./avatar";

/** The left-hand column on Home for wide screens: who you are at a glance, and shortcuts. */
export function ProfileSummary({ profile, connections, posts }: { profile: Profile; connections: number; posts: number }) {
  const what = [...profile.skills.map((s) => labelFor(SKILLS, s)), ...profile.niches.map((n) => labelFor(NICHES, n))].slice(0, 3);
  const links = [
    { href: "/messages", icon: MessageCircle, label: "Messages" },
    { href: "/network", icon: Users, label: "My network" },
    { href: "/groups", icon: LayoutGrid, label: "Groups" },
    { href: "/collabs?mine=1", icon: Handshake, label: "My collabs" },
  ];
  return (
    <aside className="sticky top-24 hidden flex-col gap-4 xl:flex">
      <section className="card overflow-hidden">
        <div className="h-16 bg-brand" />
        <div className="-mt-10 flex flex-col items-center gap-1 px-4 pb-4 text-center">
          <Link href="/settings/profile" className="rounded-full ring-4 ring-card">
            <Avatar path={profile.photo_path} name={profile.display_name} size={76} />
          </Link>
          <Link href="/settings/profile" className="mt-1 text-lg leading-tight font-bold hover:underline">
            {profile.display_name}
          </Link>
          {what.length > 0 ? <p className="text-sm text-muted">{what.join(" · ")}</p> : null}
          {profile.city_slug && (
            <p className="flex items-center gap-1 text-xs text-muted">
              <MapPin size={12} /> {labelFor(CITIES, profile.city_slug)}
            </p>
          )}
          {profile.bio && <p className="mt-1 line-clamp-3 text-sm leading-snug">{profile.bio}</p>}
        </div>
        <dl className="grid grid-cols-2 border-t border-line text-center">
          <Link href="/network" className="py-3 transition hover:bg-sunken">
            <dd className="text-lg font-bold">{connections}</dd>
            <dt className="text-xs text-muted">Connections</dt>
          </Link>
          <Link href={`/creators/${profile.handle}`} className="border-l border-line py-3 transition hover:bg-sunken">
            <dd className="text-lg font-bold">{posts}</dd>
            <dt className="text-xs text-muted">Posts</dt>
          </Link>
        </dl>
        <div className="border-t border-line p-3">
          <Link href="/settings/profile" className="btn-secondary btn-sm w-full">
            <Pencil size={14} /> Edit profile
          </Link>
        </div>
      </section>
      <nav className="card flex flex-col p-2">
        {links.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-sunken">
            <Icon size={17} className="text-muted" /> {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
