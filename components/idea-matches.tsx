import { Sparkles } from "lucide-react";
import Link from "next/link";
import { NICHES, labelFor } from "@/lib/catalog";
import type { IdeaMatchView } from "@/lib/collabs/matching";
import { compactNumber } from "@/lib/format";
import { Avatar } from "./avatar";

/** On your own idea: the creators Peerpop matched to it. */
export function IdeaMatches({ matches, fresh }: { matches: IdeaMatchView[]; fresh: boolean }) {
  return (
    <section className="card flex flex-col gap-3 p-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Sparkles size={18} className="text-brand-ink" />
          {matches.length ? `Peerpop matched ${matches.length} creator${matches.length > 1 ? "s" : ""}` : "No matches yet"}
        </h2>
        <p className="text-sm text-muted">
          {matches.length
            ? "Similar followers, matching niche. Open a profile and tap Connect."
            : fresh
              ? "We'll keep looking. Add a niche to your profile and follower count for better matches."
              : "Nobody fits this idea's niche and size yet. New creators join every day."}
        </p>
      </div>
      {matches.length > 0 && (
        <ul className="flex flex-col gap-3">
          {matches.map((m) => (
            <li key={m.user_id}>
              <Link href={`/creators/${m.handle}`} className="flex items-center gap-3 rounded-2xl p-1 hover:bg-sunken">
                <Avatar path={m.photo_path} name={m.name} size={40} />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block truncate">
                    <b>{m.name}</b>
                    {m.city && <span className="text-muted">, {m.city}</span>}
                  </span>
                  <span className="text-xs text-muted">
                    {[m.niche ? labelFor(NICHES, m.niche) : null, m.followers ? compactNumber(m.followers) : null].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="btn-secondary btn-sm">View</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
