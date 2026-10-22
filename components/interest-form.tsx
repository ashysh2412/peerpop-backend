"use client";

import { useActionState } from "react";
import { expressInterest } from "@/app/collabs/actions";
import type { FormState } from "@/lib/profile/types";
import { FormMessage, SubmitButton } from "./ui";

export function InterestForm({ postId }: { postId: string }) {
  const [state, action] = useActionState<FormState, FormData>(expressInterest, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="post_id" value={postId} />
      <textarea name="message" maxLength={300} rows={3} placeholder="Say why you'd be a good fit (optional)" className="textarea" />
      <div className="flex items-center gap-4">
        <SubmitButton pendingText="Sending…">I&apos;m interested</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
