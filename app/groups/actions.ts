"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { slugFromName, slugWithSuffix } from "@/lib/groups/slug";
import { requireUser } from "@/lib/profile/data";
import type { FormState } from "@/lib/profile/types";

const TRY_AGAIN = "Something went wrong. Please try again.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function str(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function createGroup(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser("/groups/new");
  const name = str(form, "name");
  const about = str(form, "about") || null;
  const joinType = str(form, "join_type") === "approval" ? "approval" : "open";
  if (name.length < 3) return { errors: { name: "Give your group a name of at least 3 letters." } };
  if (name.length > 60) return { errors: { name: "Keep the name under 60 characters." } };
  if (about && about.length > 500) return { errors: { about: "Keep this under 500 characters." } };

  let slug = slugFromName(name);
  for (let attempt = 0; attempt < 4; attempt++) {
    const { error } = await supabase.from("groups").insert({ slug, name, about, join_type: joinType, created_by: user.id });
    if (!error) redirect(`/groups/${slug}`);
    if (error.message.includes("daily group limit")) return { message: "You've started 5 groups today. Try again tomorrow." };
    if (error.code !== "23505") return { message: TRY_AGAIN };
    slug = slugWithSuffix(slugFromName(name));
  }
  return { message: TRY_AGAIN };
}

export async function joinGroup(form: FormData) {
  const { supabase, user } = await requireUser("/groups");
  const id = str(form, "group_id");
  if (!UUID.test(id)) return;
  await supabase.from("group_members").insert({ group_id: id, user_id: user.id });
  refresh();
}

/** Leave a group, or take back a request to join. */
export async function leaveGroup(form: FormData) {
  const { supabase, user } = await requireUser("/groups");
  const id = str(form, "group_id");
  if (!UUID.test(id)) return;
  const { error } = await supabase.from("group_members").delete().eq("group_id", id).eq("user_id", user.id);
  if (error?.message.includes("last admin")) {
    const { data } = await supabase.from("groups").select("slug").eq("id", id).maybeSingle();
    redirect(`/groups/${data?.slug ?? ""}?note=last-admin`);
  }
  refresh();
}

export async function respondToRequest(form: FormData) {
  const { supabase } = await requireUser("/groups");
  const group = str(form, "group_id");
  const member = str(form, "user_id");
  if (!UUID.test(group) || !UUID.test(member)) return;
  await supabase.rpc("respond_group_request", { g: group, member, accept: str(form, "accept") === "1" });
  refresh();
}

export async function removeMember(form: FormData) {
  const { supabase } = await requireUser("/groups");
  const group = str(form, "group_id");
  const member = str(form, "user_id");
  if (!UUID.test(group) || !UUID.test(member)) return;
  // The database only lets admins remove someone else.
  await supabase.from("group_members").delete().eq("group_id", group).eq("user_id", member);
  refresh();
}
