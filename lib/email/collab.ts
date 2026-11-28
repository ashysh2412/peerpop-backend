import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { markSent, recipientFor, sentRecently, SITE_URL } from "./prefs";
import { sendEmail } from "./send";
import { simpleEmail } from "./templates";

async function lookup(postId: string, userId: string, recipientId: string, siteUrl: string) {
  const admin = createAdminClient();
  const [{ data: post }, { data: person }, recipient] = await Promise.all([
    admin.from("collab_posts").select("title").eq("id", postId).maybeSingle(),
    admin.from("creator_profiles").select("display_name").eq("user_id", userId).maybeSingle(),
    recipientFor(admin, recipientId, "collabs", siteUrl),
  ]);
  return post && person && recipient ? { title: post.title as string, name: person.display_name as string, ...recipient } : null;
}

/** Tells the post's author someone is interested. */
export async function emailCollabInterest(postId: string, authorId: string, userId: string, note: string | null, siteUrl: string) {
  const found = await lookup(postId, userId, authorId, siteUrl);
  if (!found) return;
  const subject = `${found.name} is interested in your collab "${found.title}"`;
  const body = simpleEmail({
    lead: `${found.name} is interested in your collab "${found.title}" on Peerpop.`,
    note,
    button: { text: "See who's interested", url: `${siteUrl}/collabs/${postId}` },
    reason: "You're getting this because you posted a collab on Peerpop.",
    unsubscribe: found.unsubscribe,
  });
  await sendEmail({ to: found.to, subject, ...body });
}

/** Tells the interested creator the author accepted them. */
export async function emailCollabAccepted(postId: string, authorId: string, userId: string, siteUrl: string) {
  const found = await lookup(postId, authorId, userId, siteUrl);
  if (!found) return;
  const subject = `${found.name} accepted you for "${found.title}"`;
  const body = simpleEmail({
    lead: `${found.name} accepted you for their collab "${found.title}". Their contact details are now on the collab page.`,
    button: { text: "Open the collab", url: `${siteUrl}/collabs/${postId}` },
    reason: "You're getting this because you showed interest in a collab on Peerpop.",
    unsubscribe: found.unsubscribe,
  });
  await sendEmail({ to: found.to, subject, ...body });
}

/**
 * Emails creators who have a skill the new collab needs. The bell alerts come
 * from the database; this only emails the closest matches, at most 50, and
 * skips anyone already told about another collab in the last day.
 */
export async function emailNewCollab(postId: string, siteUrl: string) {
  const admin = createAdminClient();
  const { data: post } = await admin
    .from("collab_posts")
    .select("title, author_id, roles_needed, author:creator_profiles!collab_posts_author_id_fkey(display_name)")
    .eq("id", postId)
    .maybeSingle();
  const author = (post?.author as unknown as { display_name: string } | null)?.display_name;
  if (!post || !author || !post.roles_needed.length) return;

  const { data: alerted } = await admin.from("notifications").select("user_id").eq("kind", "collab_new").eq("entity_id", postId);
  const ids = (alerted ?? []).map((n) => n.user_id as string);
  if (!ids.length) return;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ data: matches }, { data: recent }] = await Promise.all([
    admin.from("creator_profiles").select("user_id").in("user_id", ids).overlaps("skills", post.roles_needed).limit(50),
    admin.from("notifications").select("user_id").eq("kind", "collab_new").neq("entity_id", postId).gt("created_at", since).in("user_id", ids),
  ]);
  const skip = new Set((recent ?? []).map((n) => n.user_id as string));
  const recipients = (matches ?? []).map((m) => m.user_id as string).filter((id) => !skip.has(id));

  const subject = `New collab: ${post.title}`;
  for (const id of recipients) {
    const recipient = await recipientFor(admin, id, "collabs", siteUrl);
    if (!recipient) continue;
    const body = simpleEmail({
      lead: `${author} posted a collab on Peerpop that needs your skills: "${post.title}".`,
      button: { text: "See the collab", url: `${siteUrl}/collabs/${postId}` },
      reason: "You're getting this because your Peerpop profile lists a skill this collab needs.",
      unsubscribe: recipient.unsubscribe,
    });
    await sendEmail({ to: recipient.to, subject, ...body });
  }
}

const HOUR = 60 * 60 * 1000;

/** Groups pending requests by the collab's author. Pure, so it can be tested. */
export function waitingByAuthor(rows: { post_id: string; author_id: string; title: string }[]) {
  const by = new Map<string, { count: number; posts: Map<string, string> }>();
  for (const r of rows) {
    const a = by.get(r.author_id) ?? { count: 0, posts: new Map<string, string>() };
    a.count++;
    a.posts.set(r.post_id, r.title);
    by.set(r.author_id, a);
  }
  return by;
}

/**
 * Evening run: reminds a collab's author about "I'm in" requests still waiting 2 days later.
 * Each request is in the 48-72 hour window on exactly one evening, so it's reminded once.
 * One email per author, however many requests.
 */
export async function emailWaitingCollabReminders(now: number) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("collab_interests")
    .select("post_id, created_at, post:collab_posts!inner(author_id, title, status, closes_at)")
    .eq("status", "pending")
    .lte("created_at", new Date(now - 48 * HOUR).toISOString())
    .gt("created_at", new Date(now - 72 * HOUR).toISOString())
    .limit(2000);
  type Row = { post_id: string; post: { author_id: string; title: string; status: string; closes_at: string } };
  const rows = ((data ?? []) as unknown as Row[])
    .filter((r) => r.post.status === "open" && Date.parse(r.post.closes_at) > now)
    .map((r) => ({ post_id: r.post_id, author_id: r.post.author_id, title: r.post.title }));
  let sent = 0;
  for (const [authorId, { count, posts }] of waitingByAuthor(rows)) {
    if (await sentRecently(admin, authorId, "collab_waiting", 20)) continue;
    const recipient = await recipientFor(admin, authorId, "collabs");
    if (!recipient) continue;
    const [[postId, title]] = [...posts];
    const many = posts.size > 1;
    const who = count === 1 ? "1 creator is" : `${count} creators are`;
    const body = simpleEmail({
      lead: many
        ? `${who} waiting for your answer on your collabs. Accept to start chatting with them.`
        : `${who} waiting for your answer on "${title}". Accept to start chatting with them.`,
      button: { text: "See who's waiting", url: many ? `${SITE_URL}/collabs?mine=1` : `${SITE_URL}/collabs/${postId}` },
      reason: "You're getting this because you posted a collab on Peerpop.",
      unsubscribe: recipient.unsubscribe,
    });
    await sendEmail({ to: recipient.to, subject: `${who} waiting on your collab`, ...body });
    await markSent(admin, authorId, "collab_waiting");
    sent++;
  }
  return sent;
}
