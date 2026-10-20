import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "./send";
import { simpleEmail } from "./templates";

async function lookup(postId: string, userId: string, recipientId: string) {
  const admin = createAdminClient();
  const [{ data: post }, { data: person }, { data: recipient }] = await Promise.all([
    admin.from("collab_posts").select("title").eq("id", postId).maybeSingle(),
    admin.from("creator_profiles").select("display_name").eq("user_id", userId).maybeSingle(),
    admin.auth.admin.getUserById(recipientId),
  ]);
  const to = recipient?.user?.email;
  return post && person && to ? { title: post.title as string, name: person.display_name as string, to } : null;
}

/** Tells the post's author someone is interested. */
export async function emailCollabInterest(postId: string, authorId: string, userId: string, note: string | null, siteUrl: string) {
  const found = await lookup(postId, userId, authorId);
  if (!found) return;
  const subject = `${found.name} is interested in your collab "${found.title}"`;
  const body = simpleEmail({
    lead: `${found.name} is interested in your collab "${found.title}" on Peerpop.`,
    note,
    button: { text: "See who's interested", url: `${siteUrl}/collabs/${postId}` },
    reason: "You're getting this because you posted a collab on Peerpop.",
  });
  await sendEmail({ to: found.to, subject, ...body });
}

/** Tells the interested creator the author accepted them. */
export async function emailCollabAccepted(postId: string, authorId: string, userId: string, siteUrl: string) {
  const found = await lookup(postId, authorId, userId);
  if (!found) return;
  const subject = `${found.name} accepted you for "${found.title}"`;
  const body = simpleEmail({
    lead: `${found.name} accepted you for their collab "${found.title}". Their contact details are now on the collab page.`,
    button: { text: "Open the collab", url: `${siteUrl}/collabs/${postId}` },
    reason: "You're getting this because you showed interest in a collab on Peerpop.",
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
  const body = simpleEmail({
    lead: `${author} posted a collab on Peerpop that needs your skills: "${post.title}".`,
    button: { text: "See the collab", url: `${siteUrl}/collabs/${postId}` },
    reason: "You're getting this because your Peerpop profile lists a skill this collab needs.",
  });
  for (const id of recipients) {
    const { data } = await admin.auth.admin.getUserById(id);
    if (data?.user?.email) await sendEmail({ to: data.user.email, subject, ...body });
  }
}
