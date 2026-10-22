"use client";

import { type ReactNode, useState } from "react";

/** Feed and Collabs on Home. Both are already loaded, so switching is instant. */
export function HomeTabs({ initial, collabCount, feed, collabs }: { initial: "feed" | "collabs"; collabCount: number; feed: ReactNode; collabs: ReactNode }) {
  const [tab, setTab] = useState(initial);

  function show(next: "feed" | "collabs") {
    setTab(next);
    // Keep the address in step, so refresh and Back land on the same tab.
    window.history.replaceState(null, "", next === "collabs" ? "/home?tab=collabs" : "/home");
  }

  const onCollabs = tab === "collabs";
  return (
    <>
      <nav className="tabs sticky top-[72px] z-20 w-full shadow-sm">
        <button type="button" onClick={() => show("feed")} className={`flex-1 text-center ${onCollabs ? "tab" : "tab-active"}`}>
          Feed
        </button>
        <button type="button" onClick={() => show("collabs")} className={`flex flex-1 items-center justify-center gap-1.5 ${onCollabs ? "tab-active" : "tab"}`}>
          Collabs
          {collabCount > 0 && (
            <span className={`rounded-full px-1.5 text-[11px] font-bold ${onCollabs ? "bg-card text-ink" : "bg-brand text-ink"}`}>{collabCount}</span>
          )}
        </button>
      </nav>
      <div className={onCollabs ? "hidden" : "contents"}>{feed}</div>
      <div className={onCollabs ? "contents" : "hidden"}>{collabs}</div>
    </>
  );
}
