"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { isConfirmedAdmin } from "@/lib/admin/access";
import type { FormState } from "@/lib/profile/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { safeLink, TREND_KINDS, TREND_ROWS } from "@/lib/trends/data";


/** Replaces this week's trends with what's in the form. Empty rows are skipped; all rows empty clears the box. */
export async function saveTrends(_prev: FormState, form: FormData): Promise<FormState> {
  if (!(await isConfirmedAdmin(await createClient()))) notFound();
  const kinds = TREND_KINDS.map(([k]) => k as string);
  const rows = [];
  for (let i = 0; i < TREND_ROWS; i++) {
    const title = String(form.get(`title-${i}`) ?? "").trim();
    if (!title) continue;
    const idea = String(form.get(`idea-${i}`) ?? "").trim();
    const rawLink = String(form.get(`link-${i}`) ?? "").trim();
    const link = safeLink(rawLink);
    if (rawLink && !link) return { message: `Trend ${i + 1}: that link doesn't look right. Paste the full link, or leave it empty.` };
    const kind = String(form.get(`kind-${i}`) ?? "");
    rows.push({
      position: i,
      kind: kinds.includes(kind) ? kind : "audio",
      title: title.slice(0, 120),
      idea: idea ? idea.slice(0, 200) : null,
      link,
    });
  }

  const db = createAdminClient();
  const { error: delError } = await db.from("trends").delete().gte("position", 0);
  if (delError) {
    console.error("saveTrends delete", delError.code);
    return { message: delError.code === "42P01" ? "Run SQL 20 in Supabase first, then try again." : "Couldn't save. Please try again." };
  }
  if (rows.length) {
    const { error } = await db.from("trends").insert(rows);
    if (error) {
      console.error("saveTrends insert", error.code);
      return { message: "Couldn't save. Please try again." };
    }
  }
  revalidatePath("/home");
  return { ok: true, message: rows.length ? `Saved. ${rows.length} trend${rows.length === 1 ? "" : "s"} now on everyone's Home.` : "Cleared. The box is hidden on Home." };
}
