import { ArrowRight, Calendar, Handshake, MapPin } from "lucide-react";
import Link from "next/link";
import { CITIES, SKILLS, labelFor } from "@/lib/catalog";
import type { Collab } from "@/lib/collabs/data";
import { Avatar } from "./avatar";
import { shootLabel } from "./collab-card";

/** An open collab, shown as a bold card between posts in the feed. */
export function CollabCall({ collab }: { collab: Collab }) {
  const author = collab.author!;
  const shoot = shootLabel(collab.shoot_date);
  return (
    <Link href={`/collabs/${collab.id}`} className="group block rounded-3xl border-2 border-ink bg-pop-yellow shadow-[4px_4px_0_var(--ink)] transition hover:-translate-y-0.5 hover:-rotate-[0.5deg] hover:shadow-[6px_6px_0_var(--ink)]">
      <div className="m-1.5 flex flex-col gap-3 rounded-[18px] border-2 border-ink bg-card p-5">
        <p className="flex items-center gap-2 text-xs font-bold tracking-wide text-brand uppercase">
          <Handshake size={15} /> Collab call
        </p>
        <h3 className="text-xl leading-snug font-semibold tracking-tight">{collab.title}</h3>
        <div className="flex flex-wrap gap-1.5">
          {collab.roles_needed.map((r) => (
            <span key={r} className="chip-brand">
              Needs {labelFor(SKILLS, r).toLowerCase()}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3 border-t border-line pt-3">
          <Avatar path={author.photo_path} name={author.display_name} size={32} />
          <div className="min-w-0 flex-1 text-xs text-muted">
            <p className="truncate text-sm font-semibold text-ink">{author.display_name}</p>
            <p className="flex flex-wrap gap-x-3">
              <span className="flex items-center gap-1">
                <MapPin size={12} /> {collab.city_slug ? labelFor(CITIES, collab.city_slug) : "Online"}
              </span>
              {shoot && (
                <span className="flex items-center gap-1">
                  <Calendar size={12} /> {shoot}
                </span>
              )}
            </p>
          </div>
          <span className="btn-primary btn-sm">
            I&apos;m in <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
}
