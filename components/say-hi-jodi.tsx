"use client";

import { Hand } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { sayHiToJodi } from "@/app/network/actions";
import type { FormState } from "@/lib/profile/types";
import { FormMessage } from "./ui";

export type Hello = { user_id: string; name: string; note: string };

function names(list: Hello[]) {
  const first = list.map((h) => h.name.split(" ")[0]);
  return first.length < 2 ? first.join("") : `${first.slice(0, -1).join(", ")} and ${first[first.length - 1]}`;
}

function SendButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-dark btn-sm w-full">
      <Hand size={15} /> {pending ? "Saying hi…" : count === 1 ? "Say hi to your top Jodi" : `Say hi to your top ${count}`}
    </button>
  );
}

/**
 * One tap that sends connection requests to your best Jodi matches, each with a ready-made
 * hello, so the first step to a collab is easy. Shows who it goes to before you tap.
 */
export function SayHiJodi({ hellos }: { hellos: Hello[] }) {
  const [state, send] = useActionState<FormState, FormData>(sayHiToJodi, {});
  if (hellos.length === 0) return null;
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={send} className="flex flex-col gap-1.5">
      {hellos.map((h) => (
        <span key={h.user_id} hidden>
          <input type="hidden" name="to_user" value={h.user_id} />
          <input type="hidden" name="message" value={h.note} />
        </span>
      ))}
      <SendButton count={hellos.length} />
      <p className="text-center text-xs text-muted">
        Sends {names(hellos)} a hello: &ldquo;{hellos[0].note}&rdquo;
      </p>
      <FormMessage state={state} />
    </form>
  );
}
