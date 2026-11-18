"use client";

import { Send } from "lucide-react";
import { useActionState, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/ui";
import { personalise, type BroadcastAudience } from "@/lib/admin/broadcast";
import type { FormState } from "@/lib/profile/types";
import { sendBroadcast } from "./actions";

const STARTER = `Hi {name}! 👋 Ashish here, founder of Peerpop.

Ek reel. Do audience. 🤝 Collab with a creator your size and you both grow.

But other creators can only find you if your profile is complete. It takes 2 minutes:
📸 Add a photo
🎯 Pick your niche
🎬 Add one video of your work

Finish it here: www.peerpop.in/settings/profile

Stuck anywhere? Just reply here. I read every message.`;

export function BroadcastForm({ counts, sampleName }: { counts: Record<BroadcastAudience, number>; sampleName: string }) {
  const [audience, setAudience] = useState<BroadcastAudience>("incomplete");
  const [text, setText] = useState(STARTER);
  const [confirming, setConfirming] = useState(false);
  const [state, action] = useActionState<FormState, FormData>(async (prev, data) => {
    const result = await sendBroadcast(prev, data);
    setConfirming(false);
    return result;
  }, {});
  const count = counts[audience];

  if (state.ok) {
    return (
      <div className="card flex flex-col gap-2 p-5">
        <p className="text-lg font-semibold">✅ {state.message}</p>
        <p className="text-sm text-muted">Replies show up in the Peerpop account&apos;s Messages.</p>
      </div>
    );
  }

  return (
    <form action={action} className="card flex flex-col gap-5 p-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">Who gets it</legend>
        {(
          [
            ["incomplete", "Creators missing something in their profile"],
            ["everyone", "Every creator"],
          ] as const
        ).map(([value, label]) => (
          <label
            key={value}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 has-[:checked]:border-brand has-[:checked]:bg-brand-soft"
          >
            <input
              type="radio"
              name="audience"
              value={value}
              checked={audience === value}
              onChange={() => {
                setAudience(value);
                setConfirming(false);
              }}
              className="h-4 w-4 accent-[var(--brand)]"
            />
            <span className="flex-1 text-sm font-medium">{label}</span>
            <span className="chip">{counts[value]}</span>
          </label>
        ))}
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold">Message</span>
        <textarea
          name="body"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setConfirming(false);
          }}
          maxLength={2000}
          rows={14}
          className="input min-h-80 resize-y py-2.5 leading-relaxed"
        />
        <span className="text-xs text-muted">{"{name}"} becomes each creator&apos;s first name.</span>
      </label>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">How {sampleName} will see it</p>
        <p className="rounded-2xl rounded-bl-md bg-sunken px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">{personalise(text, sampleName)}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {confirming ? (
          <>
            <SubmitButton pendingText="Sending…">
              <Send size={16} /> Yes, send to {count} now
            </SubmitButton>
            <button type="button" onClick={() => setConfirming(false)} className="btn-secondary">
              Cancel
            </button>
          </>
        ) : (
          <button type="button" disabled={!text.trim() || count === 0} onClick={() => setConfirming(true)} className="btn-primary">
            <Send size={16} /> Send to {count} creator{count === 1 ? "" : "s"}
          </button>
        )}
        <FormMessage state={state} />
      </div>
      {confirming && (
        <p className="text-sm text-muted">Each creator gets this as a personal chat from Peerpop, plus an email. This can&apos;t be undone.</p>
      )}
    </form>
  );
}
