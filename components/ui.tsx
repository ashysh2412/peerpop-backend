"use client";

import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/profile/types";

export const inputClass = "input";

export function Field({
  label,
  name,
  hint,
  error,
  children,
}: {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="label">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-[13px] text-muted">{hint}</p>}
      {error && (
        <p id={`${name}-error`} className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/** A group of toggleable chips backed by checkboxes, so forms submit them natively. */
export function ChipGroup({
  label,
  name,
  options,
  selected,
  error,
}: {
  label: string;
  name: string;
  options: readonly (readonly [string, string])[];
  selected: readonly string[];
  error?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="label mb-1.5">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([value, text]) => (
          <label key={value} className="cursor-pointer">
            <input
              type="checkbox"
              name={name}
              value={value}
              defaultChecked={selected.includes(value)}
              className="peer sr-only"
            />
            <span className="inline-flex h-9 items-center rounded-full border border-line bg-card px-4 text-sm font-medium text-muted transition select-none hover:border-brand/40 hover:text-ink peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand-ink peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40">
              {text}
            </span>
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </fieldset>
  );
}

export function SubmitButton({ children, pendingText = "Saving…" }: { children: React.ReactNode; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary h-11 px-6"
    >
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <p role="status" className={`text-sm font-medium ${state.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600"}`}>
      {state.message}
    </p>
  );
}

export const secondaryButton = "btn-secondary btn-sm";
