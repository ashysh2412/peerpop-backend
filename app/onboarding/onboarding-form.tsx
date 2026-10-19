"use client";

import { useActionState, useRef, useState } from "react";
import { IdentityFields, InterestFields, LinkFields } from "@/components/profile-fields";
import { PhotoUpload } from "@/components/photo-upload";
import { FormMessage, SubmitButton, secondaryButton } from "@/components/ui";
import type { FormState } from "@/lib/profile/types";
import { completeOnboarding } from "../settings/profile/actions";

const STEPS = ["About you", "What you make", "Your channels"] as const;
// Which step each server-side field error belongs to.
const FIELD_STEP: Record<string, number> = {
  display_name: 0,
  handle: 0,
  bio: 0,
  city_slug: 1,
  niches: 1,
};

export function OnboardingForm({ userId, suggestedName }: { userId: string; suggestedName: string }) {
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const sections = useRef<(HTMLElement | null)[]>([]);
  const [state, action] = useActionState<FormState, FormData>(async (prev, form) => {
    const result = await completeOnboarding(prev, form);
    // Jump back to the first step that has an error.
    const keys = Object.keys(result.errors ?? {});
    if (keys.length) setStep(Math.min(...keys.map((k) => FIELD_STEP[k] ?? 2)));
    return result;
  }, {});

  function next() {
    const current = sections.current[step];
    const invalid = current?.querySelector<HTMLInputElement>(":invalid");
    if (invalid) return invalid.reportValidity();
    if (step === 1 && !current?.querySelector('input[name="niches"]:checked')) {
      return setStepError("Pick at least one niche.");
    }
    setStepError(null);
    setStep(step + 1);
  }

  return (
    <form action={action} className="flex flex-col gap-8">
      <ol className="flex gap-2 text-sm">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`flex-1 border-t-4 pt-2 ${i <= step ? "border-violet-600 text-zinc-900 dark:text-zinc-100" : "border-zinc-200 text-zinc-500 dark:border-zinc-800"}`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      <section ref={(el) => void (sections.current[0] = el)} className={step === 0 ? "flex flex-col gap-5" : "hidden"}>
        <PhotoUpload userId={userId} initialPath={null} name="photo_path" />
        <IdentityFields profile={{ display_name: suggestedName }} errors={state.errors} />
      </section>

      <section ref={(el) => void (sections.current[1] = el)} className={step === 1 ? "flex flex-col gap-5" : "hidden"}>
        <InterestFields errors={state.errors} />
      </section>

      <section ref={(el) => void (sections.current[2] = el)} className={step === 2 ? "flex flex-col gap-5" : "hidden"}>
        <p className="text-zinc-600 dark:text-zinc-400">
          Link your channels so other creators can see your work. You can skip this and add them later.
        </p>
        <LinkFields platforms={[]} errors={state.errors} />
      </section>

      {stepError && <p className="text-sm text-red-600">{stepError}</p>}
      <FormMessage state={state} />

      <div className="flex items-center justify-between">
        {step > 0 ? (
          <button type="button" onClick={() => setStep(step - 1)} className={secondaryButton}>
            Back
          </button>
        ) : (
          <span />
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={next}
            className="inline-flex h-11 items-center rounded-full bg-violet-600 px-6 font-medium text-white hover:bg-violet-700"
          >
            Next
          </button>
        ) : (
          <SubmitButton pendingText="Creating your profile…">Create my profile</SubmitButton>
        )}
      </div>
    </form>
  );
}
