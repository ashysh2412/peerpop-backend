"use client";

import { useActionState } from "react";
import { ChipGroup, FormMessage, SubmitButton } from "@/components/ui";
import { NICHES } from "@/lib/catalog";
import type { FormState } from "@/lib/profile/types";
import { setMemberBasics } from "./actions";

/** Admin: set a member's niche and followers by hand (for creators who never fill them in). */
export function BasicsForm({ userId, niches }: { userId: string; niches: string[] }) {
  const [state, action] = useActionState<FormState, FormData>(setMemberBasics, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="user_id" value={userId} />
      <ChipGroup label="Niche (up to 3)" name="niches" options={NICHES} selected={niches} />
      <div className="grid gap-2 sm:grid-cols-3">
        <input name="followers" className="input" placeholder="Instagram followers, like 12K" />
        <input name="instagram" className="input" placeholder="Instagram username (optional)" />
        <input name="youtube" className="input" placeholder="or YouTube channel link" inputMode="url" />
      </div>
      <FormMessage state={state} />
      <div>
        <SubmitButton>Save for Auto Jodi</SubmitButton>
      </div>
    </form>
  );
}
