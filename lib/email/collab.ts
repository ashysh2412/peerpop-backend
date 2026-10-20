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
