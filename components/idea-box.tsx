"use client";

import { Lightbulb } from "lucide-react";
import { useActionState, useState } from "react";
import { createIdea } from "@/app/collabs/actions";
import { NICHES } from "@/lib/catalog";
import type { FormState } from "@/lib/profile/types";
import { FormMessage, SubmitButton } from "./ui";

const chip =
  "inline-flex h-8 items-center rounded-full border border-line bg-card px-3 text-[13px] font-medium text-muted transition select-none hover:text-ink peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand-ink";

/** Home: write a collab idea in one line, pick its niche, and Peerpop finds creators for it. */
export function IdeaBox({ myNiches }: { myNiches: string[] }) {
  const [state, action] = useActionState<FormState, FormData>(createIdea, {});
  const [all, setAll] = useState(false);
  // Your own niches first (ticked), then the rest behind "More".
  const mine = NICHES.filter(([n]) => myNiches.includes(n));
  const shown = all || !mine.length ? NICHES : mine;
  return (
    <form id="idea" action={action} className="card flex flex-col gap-3 p-4">
      <p className="flex items-center gap-2 text-sm font-bold">
        <Lightbulb size={17} className="text-brand-ink" /> Collab idea
      </p>
      <textarea
        name="idea"
        required
        minLength={5}
        maxLength={120}
        rows={2}
        placeholder="Mumbai vs Delhi street food, ek reel mein!"
        className="textarea min-h-0 resize-none"
        aria-label="Your collab idea"
      />
      <div className="flex flex-wrap gap-1.5">
        {shown.map(([value, text]) => (
          <label key={value} className="cursor-pointer">
            <input type="checkbox" name="niches" value={value} defaultChecked={myNiches.includes(value)} className="peer sr-only" />
            <span className={chip}>{text}</span>
          </label>
        ))}
        {!all && mine.length > 0 && (
          <button type="button" onClick={() => setAll(true)} className="h-8 rounded-full bg-sunken px-3 text-[13px] font-medium text-muted hover:text-ink">
            + niche
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingText="Finding creators…">Post &amp; find my match</SubmitButton>
        <FormMessage state={state} />
      </div>
      <p className="text-xs text-muted">Peerpop matches you with creators of a similar size in your niche.</p>
    </form>
  );
}
