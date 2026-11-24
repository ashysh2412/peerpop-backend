"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/ui";
import type { FormState } from "@/lib/profile/types";
import { TREND_KINDS, type Trend } from "@/lib/trends/data";
import { saveTrends } from "./actions";

export function TrendsForm({ trends, rows }: { trends: Trend[]; rows: number }) {
  const [state, action] = useActionState<FormState, FormData>(saveTrends, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      {Array.from({ length: rows }, (_, i) => {
        const t = trends[i];
        return (
          <fieldset key={i} className="card flex flex-col gap-3 p-4">
            <legend className="sr-only">Trend {i + 1}</legend>
            <div className="flex items-center gap-3">
              <span className="chip">{i + 1}</span>
              <select name={`kind-${i}`} defaultValue={t?.kind ?? "audio"} className="input h-10 w-auto">
                {TREND_KINDS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <input name={`title-${i}`} defaultValue={t?.title ?? ""} maxLength={120} placeholder="The trend, e.g. “Jab saiyaan” audio with outfit change" className="input" />
            <input name={`idea-${i}`} defaultValue={t?.idea ?? ""} maxLength={200} placeholder="Collab idea, e.g. Two creators, one switch each, swap cities" className="input" />
            <input name={`link-${i}`} defaultValue={t?.link ?? ""} maxLength={500} placeholder="Link to the audio or an example reel (optional)" className="input" />
          </fieldset>
        );
      })}
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton>Save and show on Home</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
