"use client";

import { Check, Copy, Link2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/** The creator's short profile link, ready to copy into an Instagram bio. */
export function ProfileLink({ handle }: { handle: string }) {
  // The site's address is only known in the browser (it differs between previews and the live site).
  const origin = useSyncExternalStore(noSubscribe, () => window.location.host, () => "");
  const [copied, setCopied] = useState(false);
  const link = `${origin}/${handle}`;

  async function copy() {
    await navigator.clipboard.writeText(`https://${link}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-brand-soft px-4 py-3">
      <Link2 size={18} className="shrink-0 text-brand" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-brand-ink">Your Peerpop link. Put it in your Instagram bio.</p>
        <p className="truncate text-sm font-semibold text-ink">{origin ? link : " "}</p>
      </div>
      <button type="button" onClick={copy} disabled={!origin} className="btn-primary btn-sm shrink-0">
        {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
