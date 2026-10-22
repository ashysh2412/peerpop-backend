"use client";

import { useActionState, useEffect, useRef } from "react";
import { addComment } from "@/app/posts/actions";
import type { FormState } from "@/lib/profile/types";
import { FormMessage, SubmitButton } from "./ui";

export function CommentForm({ postId }: { postId: string }) {
  const [state, action] = useActionState<FormState, FormData>(addComment, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} action={action} className="flex flex-col gap-2">
      <input type="hidden" name="post_id" value={postId} />
      <textarea name="body" required maxLength={1000} rows={2} placeholder="Add a comment…" className="textarea" />
      <div className="flex items-center gap-3">
        <SubmitButton pendingText="Posting…">Comment</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
