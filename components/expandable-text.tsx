"use client";

import { useState } from "react";

const LIMIT = 280;

/** Post text that folds after a few lines, with "See more" to open it. */
export function ExpandableText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > LIMIT || text.split("\n").length > 5;
  return (
    <div className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">
      <p className={long && !open ? "line-clamp-4" : undefined}>{text}</p>
      {long && (
        <button type="button" onClick={() => setOpen(!open)} className="mt-1 text-sm font-semibold text-muted hover:text-ink">
          {open ? "See less" : "See more"}
        </button>
      )}
    </div>
  );
}
