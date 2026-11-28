"use server";

import { redirect } from "next/navigation";
import { readBasics, saveBasics } from "@/lib/jodi/basics";
import { requireUser } from "@/lib/profile/data";
import type { FormState } from "@/lib/profile/types";

/** The quick "unlock your Jodis" form: niche + followers. */
export async function unlockJodis(_prev: FormState, form: FormData): Promise<FormState> {
  const { user } = await requireUser("/jodi/unlock");
  const read = readBasics(form);
  if (!read.ok) return { message: read.message };
  const error = await saveBasics(user.id, read.data);
  if (error) return { message: error };
  redirect("/home?unlocked=1");
}
