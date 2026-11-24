import { ArrowUpRight, Flame, Hash, Music2, Clapperboard, Trophy } from "lucide-react";
import Link from "next/link";
import { kindLabel, type Trend } from "@/lib/trends/data";

const ICONS = { audio: Music2, format: Clapperboard, hashtag: Hash, challenge: Trophy } as const;

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

/** "Trending this week" on Home: a few Instagram trends the Peerpop team picked, each with a collab idea. */
export function TrendingBox({ trends }: { trends: Trend[] }) {
  if (trends.length === 0) return null;
  const updated = dateFormat.format(new Date(Math.max(...trends.map((t) => Date.parse(t.created_at)))));
  return (
    <section className="card flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Flame size={16} className="text-brand-ink" /> Trending on Insta
        </h2>
        <span className="text-xs text-muted">Updated {updated}</span>
      </div>
      <ul className="-mx-2 flex flex-col">
        {trends.map((t) => {
          const Icon = ICONS[t.kind as keyof typeof ICONS] ?? Flame;
          const body = (
            <>
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-ink">
                <Icon size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold tracking-wide text-muted uppercase">{kindLabel(t.kind)}</span>
                <span className="block text-sm leading-snug font-semibold">{t.title}</span>
                {t.idea && <span className="mt-0.5 block text-xs leading-snug text-muted">🤝 {t.idea}</span>}
              </span>
              {t.link && <ArrowUpRight size={14} className="mt-1 shrink-0 text-muted" />}
            </>
          );
          return (
            <li key={t.id}>
              {t.link ? (
                <a href={t.link} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 rounded-xl p-2 transition hover:bg-sunken">
                  {body}
                </a>
              ) : (
                <div className="flex items-start gap-3 p-2">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      <Link href="/collabs/new" className="text-xs font-semibold text-brand-ink hover:underline">
        Try one with a collab partner →
      </Link>
    </section>
  );
}
