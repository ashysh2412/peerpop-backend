"use client";

import { useOptimistic, useTransition } from "react";
import { toggleLike } from "@/app/posts/actions";

export function LikeButton({ postId, liked, count }: { postId: string; liked: boolean; count: number }) {
  const [state, setState] = useOptimistic({ liked, count });
  const [, startTransition] = useTransition();

  function onClick() {
    const next = !state.liked;
    startTransition(async () => {
      setState({ liked: next, count: state.count + (next ? 1 : -1) });
      await toggleLike(postId, next);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={state.liked}
      className={`rounded-full px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 ${
        state.liked ? "text-violet-600" : "text-zinc-600 dark:text-zinc-400"
      }`}
    >
      {state.liked ? "♥ Liked" : "♡ Like"}
      {state.count > 0 && <span className="ml-1">{state.count}</span>}
    </button>
  );
}
