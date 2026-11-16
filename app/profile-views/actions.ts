"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/profile/data";
import type { FormState } from "@/lib/profile/types";

export async function saveBrowsePrivately(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser("/settings/profile");
  const { error } = await supabase
    .from("view_settings")
    .upsert(
      { user_id: user.id, browse_privately: form.get("browse_privately") === "on", updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (error) return { message: "Couldn't save. Please try again." };
  refresh();
  return { ok: true, message: "Saved." };
}
