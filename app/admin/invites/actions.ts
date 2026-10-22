"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isConfirmedAdmin } from "@/lib/admin/access";
import { allAuthUsers } from "@/lib/admin/data";
import { firstName, parseInvitees } from "@/lib/admin/invites";
import { sendEmail, sendEmails } from "@/lib/email/send";
import { inviteEmail } from "@/lib/email/templates";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function admin() {
  const supabase = await createClient();
  if (!(await isConfirmedAdmin(supabase))) notFound();
  const { data } = await supabase.auth.getUser();
  const user = data.user!;
  return { db: createAdminClient(), me: user.email!, myName: firstName((user.user_metadata?.full_name as string | undefined) ?? null) };
}

async function siteUrl() {
  const h = await headers();
  return `https://${h.get("x-forwarded-host") ?? h.get("host")}`;
}

export async function addInvites(form: FormData) {
  const { db } = await admin();
  const people = parseInvitees(String(form.get("list") ?? "").slice(0, 500_000)).slice(0, 5000);
  if (people.length) await db.from("invites").upsert(people, { onConflict: "email", ignoreDuplicates: true });
  revalidatePath("/admin/invites");
  redirect(`/admin/invites?note=added&n=${people.length}`);
}

export async function removeInvite(form: FormData) {
  const { db } = await admin();
  await db.from("invites").delete().eq("email", String(form.get("email") ?? "").toLowerCase());
  revalidatePath("/admin/invites");
}

export async function sendTestInvite() {
  const { me, myName } = await admin();
  const ok = await sendEmail({ to: me, ...inviteEmail({ name: myName, siteUrl: await siteUrl() }) });
  redirect(`/admin/invites?note=${ok ? "test-sent" : "no-email"}`);
}

/** Emails the next 100 people who haven't been invited and haven't joined yet. */
export async function sendInvites(form: FormData) {
  const { db } = await admin();
  if (form.get("confirm") !== "yes") redirect("/admin/invites?note=confirm");
  const [{ data }, users] = await Promise.all([
    db.from("invites").select("email, name").is("sent_at", null).order("added_at").limit(300),
    allAuthUsers(db),
  ]);
  const joined = new Set(users.map((u) => u.email?.toLowerCase()).filter(Boolean));
  const batch = (data ?? []).filter((p) => !joined.has(p.email)).slice(0, 100);
  if (!batch.length) redirect("/admin/invites?note=none");
  const site = await siteUrl();
  const ok = await sendEmails(batch.map((p) => ({ to: p.email, ...inviteEmail({ name: firstName(p.name), siteUrl: site }) })));
  if (!ok) redirect("/admin/invites?note=no-email");
  await db
    .from("invites")
    .update({ sent_at: new Date().toISOString(), error: null })
    .in(
      "email",
      batch.map((p) => p.email),
    );
  revalidatePath("/admin/invites");
  redirect(`/admin/invites?note=sent&n=${batch.length}`);
}
