"use client";

import { Heart } from "lucide-react";
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
      className={`btn-ghost btn-sm ${state.liked ? "text-rose-500 hover:text-rose-600" : ""}`}
    >
      <Heart size={17} className={state.liked ? "fill-current" : ""} />
      {state.liked ? "Liked" : "Like"}
      {state.count > 0 && <span className="tabular-nums">{state.count}</span>}
    </button>
  );
}
