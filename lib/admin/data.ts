import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminUser = {
  id: string;
  email: string | null;
  joined: string;
  lastSeen: string | null;
  method: string;
  name: string | null;
  handle: string | null;
  city: string | null;
  listed: boolean;
  hasPhoto: boolean;
  posts: number;
  connections: number;
};

export type AdminOverview = {
  users: AdminUser[];
  totals: { users: number; today: number; week: number; month: number; posts: number; collabs: number; groups: number; messages: number; connections: number };
};

const DAY = 24 * 60 * 60 * 1000;

async function allAuthUsers(admin: ReturnType<typeof createAdminClient>) {
  const users = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data) break;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
}

function countBy(rows: { id: string }[] | null) {
  const m = new Map<string, number>();
  for (const r of rows ?? []) m.set(r.id, (m.get(r.id) ?? 0) + 1);
  return m;
}

/** Everything the admin page shows. Reads with the secret key, so only call it after checking the viewer is an admin. */
export async function getAdminOverview(now: number): Promise<AdminOverview> {
  const admin = createAdminClient();
  const head = { count: "exact" as const, head: true };
  const [authUsers, profiles, posts, links, collabs, groups, messages] = await Promise.all([
    allAuthUsers(admin),
    admin.from("creator_profiles").select("user_id, handle, display_name, city_slug, is_listed, photo_path").limit(20000),
    admin.from("posts").select("id:author_id").limit(50000),
    admin.from("connections").select("from_user, to_user").eq("status", "accepted").limit(50000),
    admin.from("collab_posts").select("id", head),
    admin.from("groups").select("id", head),
    admin.from("messages").select("id", head),
  ]);
  const byId = new Map((profiles.data ?? []).map((p) => [p.user_id as string, p]));
  const postCount = countBy(posts.data as { id: string }[] | null);
  const linkRows = (links.data ?? []) as { from_user: string; to_user: string }[];
  const connCount = countBy(linkRows.flatMap((l) => [{ id: l.from_user }, { id: l.to_user }]));

  const users: AdminUser[] = authUsers
    .map((u) => {
      const p = byId.get(u.id);
      return {
        id: u.id,
        email: u.email ?? null,
        joined: u.created_at,
        lastSeen: u.last_sign_in_at ?? null,
        method: (u.app_metadata?.providers as string[] | undefined)?.join(", ") ?? u.app_metadata?.provider ?? "email",
        name: (p?.display_name as string) ?? null,
        handle: (p?.handle as string) ?? null,
        city: (p?.city_slug as string) ?? null,
        listed: !!p?.is_listed,
        hasPhoto: !!p?.photo_path,
        posts: postCount.get(u.id) ?? 0,
        connections: connCount.get(u.id) ?? 0,
      };
    })
    .sort((a, b) => Date.parse(b.joined) - Date.parse(a.joined));

  const since = (days: number) => users.filter((u) => now - Date.parse(u.joined) < days * DAY).length;
  return {
    users,
    totals: {
      users: users.length,
      today: since(1),
      week: since(7),
      month: since(30),
      posts: (posts.data ?? []).length,
      collabs: collabs.count ?? 0,
      groups: groups.count ?? 0,
      messages: messages.count ?? 0,
      connections: linkRows.length,
    },
  };
}
