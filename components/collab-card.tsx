import { Calendar, MapPin } from "lucide-react";
import Link from "next/link";
import { CITIES, NICHES, SKILLS, labelFor } from "@/lib/catalog";
import type { Collab } from "@/lib/collabs/data";
import { Avatar } from "./avatar";
import { updatedLabel } from "./youtube-stats";

export function shootLabel(date: string | null) {
  if (!date) return null;
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function CollabCard({ collab, now }: { collab: Collab; now: number }) {
  const author = collab.author!;
  const shoot = shootLabel(collab.shoot_date);
  return (
    <Link href={`/collabs/${collab.id}`} className="card-link flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2.5 text-sm">
        <Avatar path={author.photo_path} name={author.display_name} size={32} />
        <span className="min-w-0 flex-1 truncate">
          <b>{author.display_name}</b> <span className="text-muted">· {updatedLabel(collab.created_at, now)}</span>
        </span>
      </div>
      <h3 className="text-lg leading-snug font-bold">{collab.title}</h3>
      <p className="line-clamp-2 text-sm leading-relaxed text-muted">{collab.description}</p>
      <div className="flex flex-wrap gap-1.5">
        {collab.roles_needed.map((r) => (
          <span key={r} className="chip-brand">
            Needs {labelFor(SKILLS, r).toLowerCase()}
          </span>
        ))}
        {collab.niches.map((n) => (
          <span key={n} className="chip">
            {labelFor(NICHES, n)}
          </span>
        ))}
      </div>
      <p className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-xs font-medium text-muted">
        <span className="flex items-center gap-1">
          <MapPin size={13} /> {collab.city_slug ? labelFor(CITIES, collab.city_slug) : "Anywhere / online"}
        </span>
        {shoot && (
          <span className="flex items-center gap-1">
            <Calendar size={13} /> Shoot {shoot}
          </span>
        )}
      </p>
    </Link>
  );
}
