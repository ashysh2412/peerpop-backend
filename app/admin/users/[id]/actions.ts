"use server";

import { refresh } from "next/cache";
import { notFound } from "next/navigation";
import { isConfirmedAdmin } from "@/lib/admin/access";
import { readBasics, saveBasics } from "@/lib/jodi/basics";
import type { FormState } from "@/lib/profile/types";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Admin: sets a member's niche and follower count by hand, so Auto Jodi can match them. */
export async function setMemberBasics(_prev: FormState, form: FormData): Promise<FormState> {
  if (!(await isConfirmedAdmin(await createClient()))) notFound();
  const id = String(form.get("user_id") ?? "");
  if (!UUID.test(id)) return { message: "Unknown member." };
  const read = readBasics(form);
  if (!read.ok) return { message: read.message };
  const error = await saveBasics(id, read.data);
  if (error) return { message: error };
  refresh();
  return { ok: true, message: "Saved. They'll get Jodis in the next run." };
}
