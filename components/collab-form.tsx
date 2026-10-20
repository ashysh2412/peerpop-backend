"use client";

import { useActionState } from "react";
import { createCollab } from "@/app/collabs/actions";
import { CITIES, LANGUAGES, NICHES, SKILLS } from "@/lib/catalog";
import type { FormState } from "@/lib/profile/types";
import { ChipGroup, Field, FormMessage, SubmitButton, inputClass } from "./ui";

export function CollabForm({ city }: { city: string | null }) {
  const [state, action] = useActionState<FormState, FormData>(createCollab, {});
  const e = state.errors ?? {};
  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="Title" name="title" hint="For example: Looking for a Marathi anchor for a food series" error={e.title}>
        <input id="title" name="title" required minLength={5} maxLength={120} className={inputClass} aria-invalid={!!e.title} />
      </Field>
      <Field label="What's the collab?" name="description" hint="The idea, what you'll shoot, and what each side gets." error={e.description}>
        <textarea
          id="description"
          name="description"
          required
          maxLength={1500}
          rows={5}
          aria-invalid={!!e.description}
          className="textarea"
        />
      </Field>
      <ChipGroup label="Who do you need?" name="roles_needed" options={SKILLS} selected={[]} error={e.roles_needed} />
      <Field label="City" name="city_slug" error={e.city_slug}>
        <select id="city_slug" name="city_slug" defaultValue={city ?? ""} className={inputClass}>
          <option value="">Anywhere / online</option>
          {CITIES.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <ChipGroup label="Niches" name="niches" options={NICHES} selected={[]} />
      <ChipGroup label="Languages" name="languages" options={LANGUAGES} selected={[]} />
      <Field label="Shoot date (optional)" name="shoot_date" error={e.shoot_date}>
        <input id="shoot_date" name="shoot_date" type="date" className={inputClass} />
      </Field>
      <p className="rounded-xl bg-sunken px-4 py-3 text-sm text-muted">Your post stays open for 30 days, or until you close it.</p>
      <div className="flex items-center gap-4">
        <SubmitButton pendingText="Posting…">Post collab</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
