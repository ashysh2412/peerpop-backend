"use client";

import { Loader2, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

/** Starts filtering after this many letters. */
const MIN_LETTERS = 2;

/**
 * Name search on the Creators page. Results update as you type (from 2 letters),
 * and Enter or the Search button still works without JavaScript.
 */
export function CreatorNameSearch({ q }: { q: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(q ?? "");
  const [pending, startTransition] = useTransition();
  // The name we last asked the page for, so we don't ask twice.
  const [requested, setRequested] = useState(q ?? "");
  // Follow the page when the name changes from outside, e.g. "Clear filters".
  const [shownQ, setShownQ] = useState(q);
  if (q !== shownQ) {
    setShownQ(q);
    if ((q ?? "") !== requested) {
      setRequested(q ?? "");
      setValue(q ?? "");
    }
  }

  useEffect(() => {
    const term = value.trim();
    if (term === requested || (term.length > 0 && term.length < MIN_LETTERS)) return;
    const timer = setTimeout(() => {
      setRequested(term);
      startTransition(() => {
        router.replace(term ? `/creators?q=${encodeURIComponent(term)}` : "/creators", { scroll: false });
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [value, requested, router]);

  return (
    <form method="get" action="/creators" role="search" className="relative">
      {pending ? (
        <Loader2 size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 animate-spin text-muted" />
      ) : (
        <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
      )}
      <input
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search creators by name"
        aria-label="Search creators by name"
        maxLength={50}
        autoComplete="off"
        enterKeyHint="search"
        className="input h-12 rounded-full pr-24 pl-11 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-[5.25rem] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-sunken"
        >
          <X size={16} />
        </button>
      )}
      <button type="submit" className="btn-dark absolute top-1/2 right-1.5 h-9 -translate-y-1/2 rounded-full px-4 text-sm">
        Search
      </button>
    </form>
  );
}
