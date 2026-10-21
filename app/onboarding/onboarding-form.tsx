"use client";

import { Pencil } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { PhotoUpload } from "@/components/photo-upload";
import { ChipGroup, Field, FormMessage, SubmitButton } from "@/components/ui";
import { CITIES, LANGUAGES, NICHES, SKILLS } from "@/lib/catalog";
import { handleFromName } from "@/lib/profile/handle";
import type { FormState, Profile } from "@/lib/profile/types";
import { completeOnboarding } from "../settings/profile/actions";

// Marathi, Hindi and English show first; the rest open with "More languages".
const TOP_LANGUAGES = 3;

/** One short, skippable screen: photo, name, what you make. Bio, videos and channels can wait. */
export function OnboardingForm({ userId, profile }: { userId: string; profile: Profile }) {
  const [state, action] = useActionState<FormState, FormData>(completeOnboarding, {});
  const [name, setName] = useState(profile.display_name);
  const [customHandle, setCustomHandle] = useState<string | null>(null);
  const [editingHandle, setEditingHandle] = useState(false);
  const [allLanguages, setAllLanguages] = useState(false);
  // Keep the handle we already made until they change their name.
  const handle = customHandle ?? (name === profile.display_name ? profile.handle : handleFromName(name || "creator"));
  const errors = state.errors;
  const showHandleInput = editingHandle || !!errors?.handle;

  return (
    <form action={action} className="card flex flex-col gap-6 p-5 sm:p-7">
      <PhotoUpload userId={userId} initialPath={profile.photo_path} name="photo_path" />

      <Field label="Your name" name="display_name" error={errors?.display_name}>
        <input
          id="display_name"
          name="display_name"
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Riya Sharma"
          aria-invalid={!!errors?.display_name}
          className="input"
        />
      </Field>

      <ChipGroup label="What do you make?" name="niches" options={NICHES} selected={profile.niches} />
      <ChipGroup label="What do you do?" name="skills" options={SKILLS} selected={profile.skills} />
      <div className="flex flex-col gap-2">
        <ChipGroup label="Languages you shoot in" name="languages" options={allLanguages ? LANGUAGES : LANGUAGES.slice(0, TOP_LANGUAGES)} selected={profile.languages} />
        {!allLanguages && (
          <button type="button" onClick={() => setAllLanguages(true)} className="self-start text-sm font-semibold text-brand hover:underline">
            + {LANGUAGES.length - TOP_LANGUAGES} more languages
          </button>
        )}
      </div>

      <Field label="Your city" name="city_slug" error={errors?.city_slug}>
        <select id="city_slug" name="city_slug" defaultValue={profile.city_slug ?? "pune"} className="input">
          {CITIES.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      <input type="hidden" name="open_to_collab" value="on" />
      <input type="hidden" name="handle_auto" value={customHandle === null ? "1" : "0"} />
      {showHandleInput ? (
        <Field label="Your handle" name="handle" hint="Lowercase letters, numbers or underscores." error={errors?.handle}>
          <div className="flex items-center gap-2">
            <span className="text-muted">@</span>
            <input
              id="handle"
              name="handle"
              required
              minLength={3}
              maxLength={31}
              pattern="@?[a-zA-Z0-9_]{3,30}"
              autoCapitalize="none"
              autoCorrect="off"
              value={handle}
              onChange={(e) => setCustomHandle(e.target.value)}
              aria-invalid={!!errors?.handle}
              className="input"
            />
          </div>
        </Field>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted">
          <input type="hidden" name="handle" value={handle} />
          Your handle is <span className="font-semibold text-ink">@{handle}</span>
          <button type="button" onClick={() => setEditingHandle(true)} className="inline-flex items-center gap-1 font-semibold text-brand hover:underline">
            <Pencil size={13} /> Change
          </button>
        </p>
      )}

      <FormMessage state={state} />
      <div className="flex flex-col gap-3 border-t border-line pt-5">
        <SubmitButton pendingText="Saving…">Save and see the feed</SubmitButton>
        <Link href="/home" className="text-center text-sm font-semibold text-muted hover:text-ink">
          Skip for now
        </Link>
      </div>
    </form>
  );
}
