import "server-only";
import { CITIES, labelFor } from "@/lib/catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "./send";
import { connectionRequestEmail } from "./templates";

const DAY_MS = 24 * 3600 * 1000;

/** Emails `toUser` about a new request from `fromUser`, at most once a day per sender. */
export async function emailConnectionRequest(fromUser: string, toUser: string, message: string | null, siteUrl: string) {
  const admin = createAdminClient();
  // The trigger has already written this request's notification, so more than one means a recent resend.
  const { count } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", toUser)
    .eq("actor_id", fromUser)
    .eq("kind", "connection_request")
    .gte("created_at", new Date(Date.now() - DAY_MS).toISOString());
  if ((count ?? 0) > 1) return;

  const [{ data: profile }, { data: recipient }] = await Promise.all([
    admin.from("creator_profiles").select("display_name, handle, city_slug").eq("user_id", fromUser).maybeSingle(),
    admin.auth.admin.getUserById(toUser),
  ]);
  const to = recipient?.user?.email;
  if (!profile || !to) return;

  const email = connectionRequestEmail({
    name: profile.display_name,
    handle: profile.handle,
    city: profile.city_slug ? labelFor(CITIES, profile.city_slug) : null,
    message,
    siteUrl,
  });
  await sendEmail({ to, ...email });
}
