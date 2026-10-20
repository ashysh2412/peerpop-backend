"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/profile/data";

export async function markAllRead() {
  const { supabase, user } = await requireUser("/notifications");
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  refresh();
}
