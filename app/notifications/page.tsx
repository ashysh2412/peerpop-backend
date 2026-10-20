import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { updatedLabel } from "@/components/youtube-stats";
import { avatarUrl } from "@/lib/profile/avatar";
import { requireUser } from "@/lib/profile/data";
import { MarkRead } from "./mark-read";

export const metadata: Metadata = { title: "Notifications · Peerpop" };

type Notification = {
  id: string;
  kind: "connection_request" | "connection_accepted" | "collab_interest" | "collab_accepted";
  actor_id: string | null;
  read_at: string | null;
  created_at: string;
};

type Actor = { user_id: string; handle: string; display_name: string; photo_path: string | null };

const TEXT: Record<Notification["kind"], string> = {
  connection_request: "wants to connect with you",
  connection_accepted: "accepted your connection request",
  collab_interest: "is interested in your collab",
  collab_accepted: "accepted you for their collab",
};

function currentTime() {
  return Date.now();
}

export default function NotificationsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold">Notifications</h1>
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <Notifications />
      </Suspense>
    </main>
  );
}

async function Notifications() {
  const { supabase, user } = await requireUser("/notifications");
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, actor_id, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const items = (data ?? []) as Notification[];
  const actorIds = [...new Set(items.map((n) => n.actor_id).filter((id): id is string => !!id))];
  const { data: actors } = actorIds.length
    ? await supabase.from("creator_profiles").select("user_id, handle, display_name, photo_path").in("user_id", actorIds)
    : { data: [] };
  const byId = new Map(((actors ?? []) as Actor[]).map((a) => [a.user_id, a]));
  // A request that was withdrawn and sent again shows once, as the latest.
  const seen = new Set<string>();
  const shown = items.filter((n) => {
    const key = `${n.kind}:${n.actor_id}`;
    if (!n.actor_id || !byId.has(n.actor_id) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const unread = items.filter((n) => !n.read_at).length;
  const now = currentTime();

  if (shown.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
        Nothing yet. When someone wants to connect, you&apos;ll see it here.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      <MarkRead unread={unread} />
      {shown.map((n) => {
        const actor = byId.get(n.actor_id!)!;
        const photo = avatarUrl(actor.photo_path);
        const href = n.kind === "connection_request" ? "/network?tab=received" : `/creators/${actor.handle}`;
        return (
          <li key={n.id}>
            <Link
              href={href}
              className={`flex items-center gap-3 rounded-2xl border p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 ${
                n.read_at ? "border-zinc-200 dark:border-zinc-800" : "border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950"
              }`}
            >
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                {photo ? (
                  <Image src={photo} alt={actor.display_name} fill sizes="40px" className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-semibold text-zinc-500">
                    {actor.display_name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <p className="flex-1 text-sm">
                <b>{actor.display_name}</b> {TEXT[n.kind]}
                {n.kind === "connection_request" && <span className="text-violet-600"> · Review</span>}
              </p>
              <span className="shrink-0 text-xs text-zinc-500">{updatedLabel(n.created_at, now)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
