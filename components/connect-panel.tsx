"use client";

import { useActionState, useState } from "react";
import { acceptConnection, declineConnection, removeConnection, sendConnectionRequest } from "@/app/network/actions";
import type { ConnectionState } from "@/lib/connections/data";
import type { FormState } from "@/lib/profile/types";
import { FormMessage, SubmitButton, inputClass, secondaryButton } from "./ui";

const primary =
  "inline-flex h-10 items-center rounded-full bg-violet-600 px-5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60";

/** The Connect / Pending / Connected controls on someone's profile. */
export function ConnectPanel({
  otherId,
  name,
  state,
  compact = false,
}: {
  otherId: string;
  name: string;
  state: ConnectionState;
  /** Search cards: no note field, and no remove or decline buttons. */
  compact?: boolean;
}) {
  const [sendState, send] = useActionState<FormState, FormData>(sendConnectionRequest, {});
  const [writing, setWriting] = useState(false);

  if (state.kind === "connected" && compact) {
    return <span className="text-sm text-green-700 dark:text-green-400">✓ Connected</span>;
  }
  if (state.kind === "sent" && compact) {
    return <span className="text-sm text-zinc-500">Request sent</span>;
  }

  if (state.kind === "connected") {
    return (
      <form
        action={removeConnection}
        onSubmit={(e) => {
          if (!confirm(`Remove ${name} from your connections?`)) e.preventDefault();
        }}
        className="flex items-center gap-3"
      >
        <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-800 dark:bg-green-950 dark:text-green-300">
          ✓ Connected
        </span>
        <input type="hidden" name="id" value={state.id} />
        <button type="submit" className="text-sm text-zinc-500 hover:underline">
          Remove
        </button>
      </form>
    );
  }

  if (state.kind === "sent") {
    return (
      <form action={removeConnection} className="flex items-center gap-3">
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm dark:bg-zinc-900">Request sent</span>
        <input type="hidden" name="id" value={state.id} />
        <button type="submit" className="text-sm text-zinc-500 hover:underline">
          Withdraw
        </button>
      </form>
    );
  }

  if (state.kind === "received" && compact) {
    return (
      <form action={acceptConnection} className="flex items-center gap-2">
        <input type="hidden" name="id" value={state.id} />
        <button type="submit" className={primary}>
          Accept request
        </button>
      </form>
    );
  }

  if (state.kind === "received") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm">
          {name} wants to connect{state.message && <>: &ldquo;{state.message}&rdquo;</>}
        </p>
        <div className="flex gap-2">
          <form action={acceptConnection}>
            <input type="hidden" name="id" value={state.id} />
            <button type="submit" className={primary}>
              Accept
            </button>
          </form>
          <form action={declineConnection}>
            <input type="hidden" name="id" value={state.id} />
            <button type="submit" className={secondaryButton}>
              Decline
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (state.kind === "declined" && !state.canRetry) {
    return <span className="text-sm text-zinc-500">Request declined</span>;
  }

  return (
    <form action={send} className="flex flex-col gap-2">
      <input type="hidden" name="to_user" value={otherId} />
      {writing && (
        <textarea
          name="message"
          maxLength={300}
          rows={2}
          placeholder={`Say hi to ${name} (optional)`}
          className={`${inputClass} h-auto py-2`}
        />
      )}
      <div className="flex items-center gap-3">
        <SubmitButton pendingText="Sending…">Connect</SubmitButton>
        {!writing && !compact && (
          <button type="button" onClick={() => setWriting(true)} className="text-sm text-zinc-500 hover:underline">
            Add a note
          </button>
        )}
        <FormMessage state={sendState} />
      </div>
    </form>
  );
}
