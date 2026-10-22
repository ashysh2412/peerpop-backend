import type { Metadata } from "next";
import { Check, Handshake, Heart, LayoutGrid, Megaphone, MessageCircle, Sparkles, UserPlus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { updatedLabel } from "@/components/youtube-stats";
import { requireUser } from "@/lib/profile/data";
import { MarkRead } from "./mark-read";
import { CardsSkeleton } from "@/components/skeleton";

export const metadata: Metadata = { title: "Notifications · Peerpop" };

type Notification = {
  id: string;
  kind:
    | "connection_request"
    | "connection_accepted"
    | "collab_interest"
    | "collab_accepted"
    | "post_like"
    | "post_comment"
    | "collab_new"
    | "group_request"
    | "group_accepted"
    | "new_member";
  actor_id: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
};

type Actor = { user_id: string; handle: string; display_name: string; photo_path: string | null };

const KIND_ICON: Record<Notification["kind"], { icon: typeof Heart; tone: string }> = {
  connection_request: { icon: UserPlus, tone: "bg-brand" },
  connection_accepted: { icon: Check, tone: "bg-emerald-500" },
  collab_interest: { icon: Handshake, tone: "bg-amber-500" },
  collab_accepted: { icon: Check, tone: "bg-emerald-500" },
  post_like: { icon: Heart, tone: "bg-rose-500" },
  post_comment: { icon: MessageCircle, tone: "bg-sky-500" },
  collab_new: { icon: Megaphone, tone: "bg-brand" },
  group_request: { icon: LayoutGrid, tone: "bg-brand" },
  group_accepted: { icon: Check, tone: "bg-emerald-500" },
  new_member: { icon: Sparkles, tone: "bg-violet-500" },
};

const TEXT: Record<Notification["kind"], string> = {
  connection_request: "wants to connect with you",
  connection_accepted: "accepted your connection request",
  collab_interest: "is interested in your collab",
  collab_accepted: "accepted you for their collab",
  post_like: "liked your post",
  post_comment: "commented on your post",
  collab_new: "posted a collab that fits you",
  group_request: "asked to join your group",
  group_accepted: "let you into their group",
  new_member: "just joined Peerpop near you or in your niche. Say hi!",
};

function currentTime() {
  return Date.now();
}

export default function NotificationsPage() {
  return (
    <main className="page-narrow flex flex-col gap-6">
      <h1 className="page-title">Notifications</h1>
      <Suspense fallback={<CardsSkeleton />}>
        <Notifications />
      </Suspense>
    </main>
  );
}

async function Notifications() {
  const { supabase, user } = await requireUser("/notifications");
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, actor_id, entity_id, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const items = (data ?? []) as Notification[];
  const actorIds = [...new Set(items.map((n) => n.actor_id).filter((id): id is string => !!id))];
  const { data: actors } = actorIds.length
    ? await supabase.from("creator_profiles").select("user_id, handle, display_name, photo_path").in("user_id", actorIds)
    : { data: [] };
  // Collab notifications point at the interest; look up its post so the link opens the collab.
  const interestIds = items.filter((n) => n.kind.startsWith("collab_") && n.kind !== "collab_new" && n.entity_id).map((n) => n.entity_id!);
  const { data: interests } = interestIds.length ? await supabase.from("collab_interests").select("id, post_id").in("id", interestIds) : { data: [] };
  const groupIds = items.filter((n) => n.kind.startsWith("group_") && n.entity_id).map((n) => n.entity_id!);
  const { data: groups } = groupIds.length ? await supabase.from("groups").select("id, slug").in("id", groupIds) : { data: [] };
  const groupSlug = new Map((groups ?? []).map((g) => [g.id as string, g.slug as string]));
  const postFor = new Map((interests ?? []).map((i) => [i.id as string, i.post_id as string]));
  const byId = new Map(((actors ?? []) as Actor[]).map((a) => [a.user_id, a]));
  // A request that was withdrawn and sent again shows once, as the latest.
  const seen = new Set<string>();
  const shown = items.filter((n) => {
    const key = `${n.kind}:${n.actor_id}:${n.kind.startsWith("post_") || n.kind.startsWith("group_") || n.kind === "collab_new" ? n.entity_id : ""}`;
    if (!n.actor_id || !byId.has(n.actor_id) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const unread = items.filter((n) => !n.read_at).length;
  const now = currentTime();

  if (shown.length === 0) {
    return (
      <div className="empty">
        <span className="text-4xl">🔔</span>
        <p className="font-semibold text-ink">You&apos;re all caught up</p>
        <p className="text-sm">Requests, likes, comments, collab replies and new creators near you will show up here.</p>
      </div>
    );
  }

  return (
    <ul className="card divide-y divide-line overflow-hidden">
      <MarkRead unread={unread} />
      {shown.map((n) => {
        const actor = byId.get(n.actor_id!)!;
        const { icon: Icon, tone } = KIND_ICON[n.kind];
        const href =
          n.kind === "connection_request"
            ? "/network?tab=received"
            : n.kind.startsWith("post_") && n.entity_id
              ? `/posts/${n.entity_id}`
              : n.kind.startsWith("group_") && n.entity_id && groupSlug.has(n.entity_id)
                ? `/groups/${groupSlug.get(n.entity_id)}${n.kind === "group_request" ? "?tab=requests" : ""}`
                : n.kind === "collab_new" && n.entity_id
                  ? `/collabs/${n.entity_id}`
                  : n.entity_id && postFor.has(n.entity_id)
                    ? `/collabs/${postFor.get(n.entity_id)}`
                    : `/creators/${actor.handle}`;
        return (
          <li key={n.id}>
            <Link href={href} className={`flex items-center gap-3 p-4 transition hover:bg-card-hover ${n.read_at ? "" : "bg-brand-soft/60"}`}>
              <div className="relative shrink-0">
                <Avatar path={actor.photo_path} name={actor.display_name} size={44} />
                <span className={`absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full text-white ring-2 ring-card ${tone}`}>
                  <Icon size={11} strokeWidth={2.5} />
                </span>
              </div>
              <p className="flex-1 text-sm leading-snug">
                <b>{actor.display_name}</b> {TEXT[n.kind]}
                {n.kind === "connection_request" && <span className="font-semibold text-brand-ink"> · Review</span>}
              </p>
              <span className="shrink-0 text-xs text-muted">{updatedLabel(n.created_at, now)}</span>
              {!n.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="New" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
