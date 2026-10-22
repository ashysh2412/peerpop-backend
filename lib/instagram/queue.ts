import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { CITIES, SKILLS, labelFor } from "@/lib/catalog";
import { publishImage, refreshToken } from "./api";
import { collabIdea, milestoneIdea, tipIdeas, weekKey, type IgIdea } from "./ideas";

type Admin = ReturnType<typeof createAdminClient>;

export type IgPost = IgIdea & {
  id: string;
  status: "draft" | "approved" | "posted" | "skipped" | "failed";
  error: string | null;
  permalink: string | null;
  created_at: string;
  approved_at: string | null;
  posted_at: string | null;
};

export type IgAccount = { ig_user_id: string; username: string | null; access_token: string; expires_at: string; updated_at: string };

const DAY = 24 * 60 * 60 * 1000;
const KEEP_DRAFTS = 6;

/** Keeps a few fresh drafts waiting for approval: new collab calls first, then milestones, then evergreen tips. */
export async function topUpDrafts(admin: Admin, now: number) {
  const { count } = await admin.from("ig_posts").select("id", { count: "exact", head: true }).eq("status", "draft");
  const missing = KEEP_DRAFTS - (count ?? 0);
  if (missing <= 0) return 0;

  const weekAgo = new Date(now - 7 * DAY).toISOString();
  const [{ data: collabs }, { count: joined }, { data: used }] = await Promise.all([
    admin.from("collab_posts").select("id, title, roles_needed, city_slug").eq("status", "open").order("created_at", { ascending: false }).limit(10),
    admin.from("creator_profiles").select("user_id", { count: "exact", head: true }).gte("created_at", weekAgo),
    admin.from("ig_posts").select("idea_key").limit(5000),
  ]);
  const taken = new Set((used ?? []).map((u) => u.idea_key as string));
  const ideas: IgIdea[] = [
    ...(collabs ?? []).map((c) =>
      collabIdea({
        id: c.id,
        title: c.title,
        roles: ((c.roles_needed ?? []) as string[]).map((r) => labelFor(SKILLS, r)),
        city: c.city_slug ? labelFor(CITIES, c.city_slug) : null,
      }),
    ),
    ...[milestoneIdea(joined ?? 0, weekKey(new Date(now)))].filter((i): i is IgIdea => !!i),
    ...tipIdeas(),
  ].filter((i) => !taken.has(i.idea_key));

  const fresh = ideas.slice(0, missing);
  if (fresh.length) await admin.from("ig_posts").insert(fresh);
  return fresh.length;
}

export async function getIgQueue(admin: Admin) {
  const [drafts, approved, done, account] = await Promise.all([
    admin.from("ig_posts").select("*").eq("status", "draft").order("created_at").limit(20),
    admin.from("ig_posts").select("*").eq("status", "approved").order("approved_at").limit(20),
    admin.from("ig_posts").select("*").in("status", ["posted", "failed"]).order("posted_at", { ascending: false, nullsFirst: false }).limit(10),
    getAccount(admin),
  ]);
  return {
    drafts: (drafts.data ?? []) as IgPost[],
    approved: (approved.data ?? []) as IgPost[],
    done: (done.data ?? []) as IgPost[],
    account: account ? { username: account.username, expiresAt: account.expires_at } : null,
  };
}

export async function getAccount(admin: Admin) {
  const { data } = await admin.from("ig_account").select("ig_user_id, username, access_token, expires_at, updated_at").eq("id", 1).maybeSingle();
  return data as IgAccount | null;
}

export async function saveAccount(admin: Admin, a: { igUserId: string; username: string | null; token: string; expiresIn: number }, now: number) {
  await admin.from("ig_account").upsert({
    id: 1,
    ig_user_id: a.igUserId,
    username: a.username,
    access_token: a.token,
    expires_at: new Date(now + a.expiresIn * 1000).toISOString(),
    updated_at: new Date(now).toISOString(),
  });
}

/** Tokens last 60 days; renew when fewer than 15 are left. */
async function freshToken(admin: Admin, account: IgAccount, now: number) {
  const left = Date.parse(account.expires_at) - now;
  const age = now - Date.parse(account.updated_at);
  if (left > 15 * DAY || age < DAY) return account.access_token;
  const r = await refreshToken(account.access_token);
  await saveAccount(admin, { igUserId: account.ig_user_id, username: account.username, token: r.access_token, expiresIn: r.expires_in }, now);
  return r.access_token;
}

/** Posts one approved post (the given one, or the oldest approved). */
export async function publishApproved(admin: Admin, origin: string, now: number, id?: string) {
  const account = await getAccount(admin);
  if (!account) return { posted: false, reason: "Instagram isn't connected" };
  let q = admin.from("ig_posts").select("*").eq("status", "approved");
  q = id ? q.eq("id", id) : q.order("approved_at").limit(1);
  const { data } = await q;
  const post = (data ?? [])[0] as IgPost | undefined;
  if (!post) return { posted: false, reason: "Nothing approved" };
  try {
    const token = await freshToken(admin, account, now);
    const { mediaId, permalink } = await publishImage(account.ig_user_id, token, `${origin}/ig/${post.id}`, post.caption);
    await admin
      .from("ig_posts")
      .update({ status: "posted", ig_media_id: mediaId, permalink, posted_at: new Date(now).toISOString(), error: null })
      .eq("id", post.id);
    return { posted: true, permalink };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Posting failed";
    await admin
      .from("ig_posts")
      .update({ status: "failed", error, posted_at: new Date(now).toISOString() })
      .eq("id", post.id);
    return { posted: false, reason: error };
  }
}
