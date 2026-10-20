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
    <Link
      href={`/collabs/${collab.id}`}
      className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
    >
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Avatar path={author.photo_path} name={author.display_name} size={24} />
        <span className="truncate">
          {author.display_name} · {updatedLabel(collab.created_at, now)}
        </span>
      </div>
      <h3 className="font-semibold">{collab.title}</h3>
      <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{collab.description}</p>
      <div className="flex flex-wrap gap-1.5 text-xs">
        {collab.roles_needed.map((r) => (
          <span key={r} className="rounded-full bg-violet-100 px-2.5 py-1 text-violet-800 dark:bg-violet-950 dark:text-violet-200">
            Needs {labelFor(SKILLS, r).toLowerCase()}
          </span>
        ))}
        {collab.niches.map((n) => (
          <span key={n} className="rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800">
            {labelFor(NICHES, n)}
          </span>
        ))}
      </div>
      <p className="text-xs text-zinc-500">
        📍 {collab.city_slug ? labelFor(CITIES, collab.city_slug) : "Anywhere / online"}
        {shoot && ` · 🎬 ${shoot}`}
      </p>
    </Link>
  );
}
