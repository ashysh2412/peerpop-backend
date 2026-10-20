"use client";

import { useEffect } from "react";
import { markAllRead } from "./actions";

/** Marks everything read once the list has been seen, so the bell count clears. */
export function MarkRead({ unread }: { unread: number }) {
  useEffect(() => {
    if (unread > 0) void markAllRead();
  }, [unread]);
  return null;
}
