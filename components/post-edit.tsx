"use client";

import { Pencil } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { updatePost } from "@/app/posts/actions";
import type { FormState } from "@/lib/profile/types";
import { ExpandableText } from "./expandable-text";
import { FormMessage, SubmitButton } from "./ui";

const EVENT = "peerpop:edit-post";

/** The pencil in a post's header; opens the text editor below it. */
export function EditPostButton({ postId }: { postId: string }) {
  return (
    <button
      type="button"
      aria-label="Edit post"
      onClick={() => window.dispatchEvent(new CustomEvent(EVENT, { detail: postId }))}
      className="btn-ghost btn-sm h-9 w-9 px-0"
    >
      <Pencil size={16} />
    </button>
  );
}

/** A post's text, which its author can edit in place. */
export function PostText({ postId, text, expandable, editable }: { postId: string; text: string; expandable: boolean; editable: boolean }) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState<FormState, FormData>(async (prev, data) => {
    const result = await updatePost(prev, data);
    if (result.ok) setEditing(false);
    return result;
  }, {});

  useEffect(() => {
    if (!editable) return;
    const open = (e: Event) => {
      if ((e as CustomEvent<string>).detail === postId) setEditing(true);
    };
    window.addEventListener(EVENT, open);
    return () => window.removeEventListener(EVENT, open);
  }, [editable, postId]);

  if (editing) {
    return (
      <form action={action} className="flex flex-col gap-2">
        <input type="hidden" name="id" value={postId} />
        <textarea
          name="body"
          required
          maxLength={3000}
          rows={4}
          defaultValue={text}
          autoFocus
          className="input min-h-32 resize-y py-2.5 text-[15px] leading-relaxed"
        />
        <div className="flex items-center gap-2">
          <SubmitButton pendingText="Saving…">Save</SubmitButton>
          <button type="button" onClick={() => setEditing(false)} className="btn-secondary">
            Cancel
          </button>
          <FormMessage state={state} />
        </div>
      </form>
    );
  }
  return expandable ? <ExpandableText text={text} /> : <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{text}</p>;
}
