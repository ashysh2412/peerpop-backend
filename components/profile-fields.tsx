"use client";

import { CITIES, LANGUAGES, NICHES, SKILLS } from "@/lib/catalog";
import type { PlatformAccount, Profile } from "@/lib/profile/types";
import { ChipGroup, Field, inputClass } from "./ui";

type Errors = Record<string, string> | undefined;

export function IdentityFields({ profile, errors }: { profile?: Partial<Profile>; errors: Errors }) {
  return (
    <>
      <Field label="Name" name="display_name" error={errors?.display_name}>
        <input
          id="display_name"
          name="display_name"
          required
          maxLength={80}
          defaultValue={profile?.display_name}
          aria-invalid={!!errors?.display_name}
          className={inputClass}
        />
      </Field>
      <Field
        label="Handle"
        name="handle"
        hint="Your profile link: peerpop/creators/yourhandle"
        error={errors?.handle}
      >
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">@</span>
          <input
            id="handle"
            name="handle"
            required
            minLength={3}
            maxLength={31}
            pattern="@?[a-zA-Z0-9_]{3,30}"
            autoCapitalize="none"
            autoCorrect="off"
            defaultValue={profile?.handle}
            aria-invalid={!!errors?.handle}
            className={inputClass}
          />
        </div>
      </Field>
      <Field label="Bio" name="bio" hint="A line or two about what you make." error={errors?.bio}>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          maxLength={500}
          defaultValue={profile?.bio ?? ""}
          className="w-full rounded-lg border border-zinc-300 bg-transparent p-3 dark:border-zinc-700"
        />
      </Field>
    </>
  );
}

export function InterestFields({ profile, errors }: { profile?: Partial<Profile>; errors: Errors }) {
  return (
    <>
      <Field label="City" name="city_slug" error={errors?.city_slug}>
        <select id="city_slug" name="city_slug" defaultValue={profile?.city_slug ?? "pune"} className={inputClass}>
          {CITIES.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <ChipGroup label="Niches" name="niches" options={NICHES} selected={profile?.niches ?? []} error={errors?.niches} />
      <ChipGroup label="Skills you offer" name="skills" options={SKILLS} selected={profile?.skills ?? []} />
      <ChipGroup label="Languages" name="languages" options={LANGUAGES} selected={profile?.languages ?? []} />
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          name="open_to_collab"
          defaultChecked={profile?.open_to_collab ?? true}
          className="h-5 w-5 accent-violet-600"
        />
        <span>I&apos;m open to collabs</span>
      </label>
    </>
  );
}

export function LinkFields({ platforms, errors }: { platforms: PlatformAccount[]; errors: Errors }) {
  const yt = platforms.find((p) => p.platform === "youtube");
  const ig = platforms.find((p) => p.platform === "instagram");
  const ytVerified = yt?.source === "verified";
  return (
    <>
      <Field
        label="YouTube channel"
        name="youtube_url"
        hint={ytVerified ? "Verified. Contact us to change it." : "Like youtube.com/@yourname. You can verify it later."}
        error={errors?.youtube_url}
      >
        <input
          id="youtube_url"
          name="youtube_url"
          inputMode="url"
          placeholder="youtube.com/@yourname"
          defaultValue={yt?.url ?? ""}
          disabled={ytVerified}
          aria-invalid={!!errors?.youtube_url}
          className={inputClass}
        />
      </Field>
      <Field label="Instagram username" name="instagram_handle" error={errors?.instagram_handle}>
        <input
          id="instagram_handle"
          name="instagram_handle"
          placeholder="@yourname"
          autoCapitalize="none"
          defaultValue={ig?.handle?.replace(/^@/, "") ?? ""}
          aria-invalid={!!errors?.instagram_handle}
          className={inputClass}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Instagram followers" name="instagram_followers" error={errors?.instagram_followers}>
          <input
            id="instagram_followers"
            name="instagram_followers"
            inputMode="numeric"
            placeholder="12K"
            defaultValue={ig?.self_followers ?? ""}
            aria-invalid={!!errors?.instagram_followers}
            className={inputClass}
          />
        </Field>
        <Field label="Average views (optional)" name="instagram_avg_views" error={errors?.instagram_avg_views}>
          <input
            id="instagram_avg_views"
            name="instagram_avg_views"
            inputMode="numeric"
            placeholder="3.5K"
            defaultValue={ig?.self_avg_views ?? ""}
            aria-invalid={!!errors?.instagram_avg_views}
            className={inputClass}
          />
        </Field>
      </div>
      <p className="text-sm text-zinc-500">
        Instagram numbers are shown as self-reported. Instagram verification is coming soon.
      </p>
    </>
  );
}
