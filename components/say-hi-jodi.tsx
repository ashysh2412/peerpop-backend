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

function SendButton({ label, title }: { label: string; title: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} title={title} className="btn-dark btn-sm w-full">
      <Hand size={15} /> {pending ? "Saying hi…" : label}
    </button>
  );
}

/**
 * One tap that sends connection requests to your best Jodi matches, each with a ready-made
 * hello, so the first step to a collab is easy. Hidden with fewer than 2 matches.
 */
export function SayHiJodi({ hellos, all = false }: { hellos: Hello[]; /** Every person shown gets the hello: "Say hi to all 3". */ all?: boolean }) {
  const [state, send] = useActionState<FormState, FormData>(sayHiToJodi, {});
  // With just one match, its own Connect button already sends the hello.
  if (hellos.length < 2) return null;
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={send} className="flex flex-col gap-1.5">
      {hellos.map((h) => (
        <span key={h.user_id} hidden>
          <input type="hidden" name="to_user" value={h.user_id} />
          <input type="hidden" name="message" value={h.note} />
        </span>
      ))}
      <SendButton label={all ? `Say hi to all ${hellos.length}` : `Say hi to your top ${hellos.length}`} title={`Sends ${names(hellos)} a friendly collab hello`} />
      <FormMessage state={state} />
    </form>
  );
}
