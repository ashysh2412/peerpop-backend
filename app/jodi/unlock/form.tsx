"use client";

import { useActionState } from "react";
import { ChipGroup, FormMessage, SubmitButton } from "@/components/ui";
import type { FormState } from "@/lib/profile/types";
import { unlockJodis } from "./actions";

export function UnlockForm({ niches, popular, more }: { niches: string[]; popular: readonly (readonly [string, string])[]; more: readonly (readonly [string, string])[] }) {
  const [state, action] = useActionState<FormState, FormData>(unlockJodis, {});
  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <ChipGroup label="1. Your niche (up to 3)" name="niches" options={popular} selected={niches} />
        <details open={niches.some((n) => more.some(([k]) => k === n))}>
          <summary className="cursor-pointer text-sm font-medium text-brand-ink">More niches</summary>
          <div className="mt-2">
            <ChipGroup label="" name="niches" options={more} selected={niches} />
          </div>
        </details>
      </div>
      <div className="flex flex-col gap-2">
        <span className="label">2. Your followers</span>
        <input name="followers" className="input" placeholder="Instagram followers, like 12K" inputMode="text" />
        <input name="instagram" className="input" placeholder="Instagram username (optional)" />
        <p className="text-center text-xs text-muted">or</p>
        <input name="youtube" className="input" placeholder="YouTube channel link, like youtube.com/@you" inputMode="url" />
        <p className="text-[13px] text-muted">With a YouTube link, we fetch your subscribers automatically.</p>
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Unlocking…">Unlock my Jodis 🔓</SubmitButton>
    </form>
  );
}
