import type { Metadata } from "next";
import { ArrowLeft, CheckCircle2, Circle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { CardsSkeleton } from "@/components/skeleton";
import { isConfirmedAdmin } from "@/lib/admin/access";
import { PROFILE_STEPS, profileGaps } from "@/lib/admin/completeness";
import { CITIES, LANGUAGES, NICHES, SKILLS, labelFor } from "@/lib/catalog";
import { requireUser } from "@/lib/profile/data";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Member · Admin · Peerpop", robots: { index: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const PLATFORM = { youtube: "YouTube", instagram: "Instagram", drive: "Google Drive", vimeo: "Vimeo" } as Record<string, string>;

type Profile = {
  handle: string;
  display_name: string;
  photo_path: string | null;
  bio: string | null;
  city_slug: string | null;
  niches: string[];
  skills: string[];
  languages: string[];
  open_to_collab: boolean;
  is_listed: boolean;
  is_private: boolean;
};

export default function MemberPage({ params }: PageProps<"/admin/users/[id]">) {
  return (
    <main className="page flex flex-col gap-6">
      <Suspense fallback={<CardsSkeleton />}>
        <Member params={params} />
      </Suspense>
    </main>
  );
}

/** Everything one member has filled in, including what a private profile hides from others. */
async function Member({ params }: Pick<PageProps<"/admin/users/[id]">, "params">) {
  const { id } = await params;
  const { supabase } = await requireUser(`/admin/users/${id}`);
  if (!(await isConfirmedAdmin(supabase)) || !UUID.test(id)) notFound();
  const db = createAdminClient();
  const head = { count: "exact" as const, head: true };
  const [{ data: auth }, { data: profile }, { data: channels }, { data: videos }, posts, connections, collabs] = await Promise.all([
    db.auth.admin.getUserById(id),
    db.from("creator_profiles").select("handle, display_name, photo_path, bio, city_slug, niches, skills, languages, open_to_collab, is_listed, is_private").eq("user_id", id).maybeSingle(),
    db.from("platform_accounts").select("platform, handle, url, source, self_followers").eq("user_id", id),
    db.from("profile_videos").select("platform, url, title").eq("user_id", id).order("position"),
    db.from("posts").select("id", head).eq("author_id", id),
    db.from("connections").select("id", head).eq("status", "accepted").or(`from_user.eq.${id},to_user.eq.${id}`),
    db.from("collab_posts").select("id", head).eq("author_id", id),
  ]);
  if (!auth?.user) notFound();
  const p = profile as Profile | null;
  const gaps = profileGaps({
    hasProfile: !!p,
    photo: !!p?.photo_path,
    city: !!p?.city_slug,
    bio: !!p?.bio?.trim(),
    skills: p?.skills.length ?? 0,
    niches: p?.niches.length ?? 0,
    channels: channels?.length ?? 0,
    videos: videos?.length ?? 0,
  });
  const steps = ["Photo", "City", "Skills", "Niches", "Bio", "Instagram/YouTube", "Videos"];
  const name = p?.display_name ?? auth.user.email ?? "Member";

  return (
    <>
      <Link href="/admin" className="flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} /> Admin
      </Link>

      <section className="card flex flex-wrap items-center gap-5 p-5">
        <Avatar path={p?.photo_path ?? null} name={name} size={88} />
        <div className="mr-auto">
          <h1 className="page-title">{name}</h1>
          <p className="text-muted">{auth.user.email}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {p?.is_private && <span className="chip">Private profile</span>}
            {p && !p.is_listed && <span className="chip">Hidden from search</span>}
            {p?.open_to_collab && <span className="chip">Open to collab</span>}
          </div>
        </div>
        {p && (
          <Link href={`/creators/${p.handle}`} className="btn-secondary">
            <ExternalLink size={16} /> Public profile
          </Link>
        )}
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-bold">
          Profile {gaps.length === 0 ? "complete" : gaps[0] === "Profile" ? "not started" : `${PROFILE_STEPS - gaps.length} of ${PROFILE_STEPS} done`}
        </h2>
        {p && (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {steps.map((s) => (
              <li key={s} className="flex items-center gap-2 text-sm">
                {gaps.includes(s) ? <Circle size={17} className="text-muted" /> : <CheckCircle2 size={17} className="text-green-600" />}
                <span className={gaps.includes(s) ? "text-muted" : ""}>{s}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <Fact label="City">{p?.city_slug ? labelFor(CITIES, p.city_slug) : "–"}</Fact>
        <Fact label="Joined">{dateFormat.format(new Date(auth.user.created_at))}</Fact>
        <Fact label="Last login">{auth.user.last_sign_in_at ? dateFormat.format(new Date(auth.user.last_sign_in_at)) : "Never"}</Fact>
        <Fact label="Activity">
          {posts.count ?? 0} posts · {collabs.count ?? 0} collab calls · {connections.count ?? 0} connections
        </Fact>
        <Fact label="Skills">{p?.skills.length ? p.skills.map((s) => labelFor(SKILLS, s)).join(", ") : "–"}</Fact>
        <Fact label="Niches">{p?.niches.length ? p.niches.map((s) => labelFor(NICHES, s)).join(", ") : "–"}</Fact>
        <Fact label="Languages">{p?.languages.length ? p.languages.map((s) => labelFor(LANGUAGES, s)).join(", ") : "–"}</Fact>
        <Fact label="Bio">{p?.bio?.trim() || "–"}</Fact>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-bold">Channels</h2>
        {channels?.length ? (
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {channels.map((c) => (
              <li key={c.platform}>
                <span className="font-semibold">{PLATFORM[c.platform] ?? c.platform}</span>: {c.url ? <a href={c.url} target="_blank" rel="noreferrer" className="underline">{c.handle ?? c.url}</a> : c.handle ?? "–"}
                {c.self_followers != null && <span className="text-muted"> · {Number(c.self_followers).toLocaleString("en-IN")} followers</span>}
                {c.source === "verified" && <span className="text-muted"> · verified</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-muted">None added.</p>
        )}
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-bold">Pinned videos</h2>
        {videos?.length ? (
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {videos.map((v) => (
              <li key={v.url}>
                <span className="font-semibold">{PLATFORM[v.platform] ?? v.platform}</span>:{" "}
                <a href={v.url} target="_blank" rel="noreferrer" className="underline">
                  {v.title || v.url}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-muted">None added.</p>
        )}
      </section>
    </>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm whitespace-pre-line">{children}</dd>
    </div>
  );
}
