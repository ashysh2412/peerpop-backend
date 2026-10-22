"use client";

import { Check, Clock, UserPlus } from "lucide-react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { acceptConnection, declineConnection, removeConnection, sendConnectionRequest } from "@/app/network/actions";
import type { ConnectionState } from "@/lib/connections/data";
import type { FormState } from "@/lib/profile/types";
import { FormMessage } from "./ui";

function ConnectButton({ compact }: { compact: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`btn-primary ${compact ? "btn-sm w-full" : ""}`}>
      <UserPlus size={compact ? 15 : 17} /> {pending ? "Sending…" : "Connect"}
    </button>
  );
}

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
    return (
      <span className="chip-green justify-center py-1.5">
        <Check size={14} /> Connected
      </span>
    );
  }
  if (state.kind === "sent" && compact) {
    return (
      <span className="chip justify-center py-1.5">
        <Clock size={14} /> Request sent
      </span>
    );
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
        <span className="chip-green px-3.5 py-2 text-sm">
          <Check size={15} /> Connected
        </span>
        <input type="hidden" name="id" value={state.id} />
        <button type="submit" className="btn-ghost btn-sm">
          Remove
        </button>
      </form>
    );
  }

  if (state.kind === "sent") {
    return (
      <form action={removeConnection} className="flex items-center gap-3">
        <span className="chip px-3.5 py-2 text-sm">
          <Clock size={15} /> Request sent
        </span>
        <input type="hidden" name="id" value={state.id} />
        <button type="submit" className="btn-ghost btn-sm">
          Withdraw
        </button>
      </form>
    );
  }

  if (state.kind === "received" && compact) {
    return (
      <form action={acceptConnection}>
        <input type="hidden" name="id" value={state.id} />
        <button type="submit" className="btn-primary btn-sm w-full">
          <Check size={15} /> Accept request
        </button>
      </form>
    );
  }

  if (state.kind === "received") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm">
          <b>{name}</b> wants to connect
          {state.message && <span className="text-muted">: &ldquo;{state.message}&rdquo;</span>}
        </p>
        <div className="flex gap-2">
          <form action={acceptConnection}>
            <input type="hidden" name="id" value={state.id} />
            <button type="submit" className="btn-primary">
              <Check size={17} /> Accept
            </button>
          </form>
          <form action={declineConnection}>
            <input type="hidden" name="id" value={state.id} />
            <button type="submit" className="btn-secondary">
              Decline
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (state.kind === "declined" && !state.canRetry) {
    return <span className="chip justify-center py-1.5">Request declined</span>;
  }

  return (
    <form action={send} className="flex flex-col gap-2">
      <input type="hidden" name="to_user" value={otherId} />
      {writing && <textarea name="message" maxLength={300} rows={2} placeholder={`Say hi to ${name} (optional)`} className="textarea" />}
      <div className={`flex items-center gap-2 ${compact ? "flex-col items-stretch" : "flex-wrap"}`}>
        <ConnectButton compact={compact} />
        {!writing && !compact && (
          <button type="button" onClick={() => setWriting(true)} className="btn-ghost btn-sm">
            Add a note
          </button>
        )}
        <FormMessage state={sendState} />
      </div>
    </form>
  );
}
