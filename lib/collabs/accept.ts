import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { acceptedChatMessage } from "./accept-chat";

/**
 * After a collab request is accepted: connect the two creators (if they aren't already)
 * and start their chat with a short message, so they can plan the collab on Peerpop.
 * The message is sent from the author's account, since they accepted. Skips blocked pairs,
 * and never sends the same opening message twice for one collab.
 */
export async function connectAndOpenChat(postId: string, authorId: string, userId: string) {
  const db = createAdminClient();
  const [{ data: post }, { data: people }, { data: blocked }, { data: link }] = await Promise.all([
    db.from("collab_posts").select("title").eq("id", postId).maybeSingle(),
    db.from("creator_profiles").select("user_id, display_name").in("user_id", [authorId, userId]),
    db
      .from("blocks")
      .select("blocker_id")
      .or(`and(blocker_id.eq.${authorId},blocked_id.eq.${userId}),and(blocker_id.eq.${userId},blocked_id.eq.${authorId})`)
      .limit(1),
    db
      .from("connections")
      .select("id, status")
      .or(`and(from_user.eq.${authorId},to_user.eq.${userId}),and(from_user.eq.${userId},to_user.eq.${authorId})`)
      .maybeSingle(),
  ]);
  if (!post || blocked?.length) return;

  if (!link) {
    // Saved as the creator's request, then accepted by the author: the creator gets the
    // usual "accepted your connection" alert. The author's "wants to connect" alert is removed.
    const { data: made, error } = await db.from("connections").insert({ from_user: userId, to_user: authorId }).select("id").single();
    if (error || !made) throw error ?? new Error("connection not saved");
    await db.from("connections").update({ status: "accepted" }).eq("id", made.id);
    await db.from("notifications").delete().eq("kind", "connection_request").eq("entity_id", made.id);
  } else if (link.status !== "accepted") {
    await db.from("connections").update({ status: "accepted" }).eq("id", link.id);
  }

  const name = new Map((people ?? []).map((p) => [p.user_id as string, p.display_name as string]));
  const body = acceptedChatMessage(name.get(authorId) ?? null, name.get(userId) ?? null, post.title as string);
  const { data: already } = await db.from("messages").select("id").eq("sender_id", authorId).eq("recipient_id", userId).eq("body", body).limit(1);
  if (already?.length) return;
  const { error } = await db.from("messages").insert({ sender_id: authorId, recipient_id: userId, body });
  if (error) throw error;
}
