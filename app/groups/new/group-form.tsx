"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/ui";
import type { FormState } from "@/lib/profile/types";
import { createGroup } from "../actions";

export function GroupForm() {
  const [state, action] = useActionState<FormState, FormData>(createGroup, {});
  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="Group name" name="name" error={state.errors?.name}>
        <input id="name" name="name" required minLength={3} maxLength={60} placeholder="Pune food creators" className="input" />
      </Field>
      <Field label="What's it about? (optional)" name="about" error={state.errors?.about}>
        <textarea id="about" name="about" maxLength={500} rows={3} placeholder="Share reels, swap tips and plan food walks together." className="textarea" />
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="label mb-1.5">Who can join?</legend>
        <label className="card flex cursor-pointer items-start gap-3 p-3.5 has-checked:border-brand has-checked:bg-brand-soft">
          <input type="radio" name="join_type" value="open" defaultChecked className="mt-1 accent-[var(--brand)]" />
          <span>
            <span className="block font-semibold">Anyone</span>
            <span className="text-sm text-muted">Creators join with one tap and everyone can read the posts.</span>
          </span>
        </label>
        <label className="card flex cursor-pointer items-start gap-3 p-3.5 has-checked:border-brand has-checked:bg-brand-soft">
          <input type="radio" name="join_type" value="approval" className="mt-1 accent-[var(--brand)]" />
          <span>
            <span className="block font-semibold">Only people I approve</span>
            <span className="text-sm text-muted">Creators ask to join, and only members can read the posts.</span>
          </span>
        </label>
      </fieldset>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingText="Starting…">Start group</SubmitButton>
      </div>
    </form>
  );
}
