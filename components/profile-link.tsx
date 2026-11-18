"use client";

import { Check, Copy, Link2, Pencil } from "lucide-react";
import { useActionState, useState, useSyncExternalStore } from "react";
import { changeHandle } from "@/app/settings/profile/actions";
import type { FormState } from "@/lib/profile/types";
import { SubmitButton } from "./ui";

const noSubscribe = () => () => {};

/** The creator's short profile link, ready to copy into an Instagram bio, and changeable. */
export function ProfileLink({ handle, editable = false }: { handle: string; editable?: boolean }) {
  // The site's address is only known in the browser (it differs between previews and the live site).
  const origin = useSyncExternalStore(
    noSubscribe,
    () => window.location.host,
    () => "",
  );
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState<FormState & { handle?: string }, FormData>(async (prev, data) => {
    const result = await changeHandle(prev, data);
    if (result.ok) setEditing(false);
    return result;
  }, {});
  const current = state.handle ?? handle;
  const link = `${origin}/${current}`;

  async function copy() {
    await navigator.clipboard.writeText(`https://${link}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (editing) {
    const error = state.errors?.handle;
    return (
      <form action={action} className="flex flex-col gap-2 rounded-2xl bg-brand-soft px-4 py-3">
        <label htmlFor="new-handle" className="text-xs font-semibold text-brand-ink">
          Choose your Peerpop link. Your Instagram username works well.
        </label>
        <div className="flex items-center rounded-xl border border-line bg-card pl-3 focus-within:border-brand">
          <span className="shrink-0 text-sm text-muted">{origin || "peerpop.in"}/</span>
          <input
            id="new-handle"
            name="handle"
            defaultValue={current}
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={30}
            aria-invalid={!!error}
            className="min-w-0 flex-1 bg-transparent py-2.5 pr-3 text-sm font-semibold outline-none"
          />
        </div>
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <p className="text-xs text-muted">Letters, numbers and _ only. Your old link stops working, so update it wherever you shared it.</p>
        )}
        <div className="flex items-center gap-2">
          <SubmitButton pendingText="Saving…">Save link</SubmitButton>
          <button type="button" onClick={() => setEditing(false)} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-brand-soft px-4 py-3">
      <Link2 size={18} className="shrink-0 text-brand-ink" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-brand-ink">{state.ok ? "✓ Link changed. " : ""}Your Peerpop link. Put it in your Instagram bio.</p>
        <p className="truncate text-sm font-semibold text-ink">{origin ? link : " "}</p>
      </div>
      {editable && (
        <button type="button" onClick={() => setEditing(true)} aria-label="Change my link" className="btn-ghost btn-sm h-9 w-9 shrink-0 px-0">
          <Pencil size={15} />
        </button>
      )}
      <button type="button" onClick={copy} disabled={!origin} className="btn-primary btn-sm shrink-0">
        {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
