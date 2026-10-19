import { compactNumber } from "@/lib/format";
import type { AccountStats } from "@/lib/profile/types";

export function uploadsLabel(perWeek: number | null) {
  if (perWeek === null) return null;
  if (perWeek >= 1) return `${perWeek} videos/week`;
  if (perWeek > 0) return `${Math.round(perWeek * 4)} videos/month`;
  return "No uploads in the last 4 weeks";
}

export function growthLabel(stats: AccountStats) {
  if (stats.growth_30d_abs === null) return "Growth shows after 30 days of tracking";
  if (stats.growth_30d_abs === 0) return "No change in 30 days";
  const sign = stats.growth_30d_abs > 0 ? "+" : "−";
  const pct = stats.growth_30d_pct === null ? "" : ` (${sign}${Math.abs(stats.growth_30d_pct)}%)`;
  return `${sign}${compactNumber(Math.abs(stats.growth_30d_abs))}${pct} in 30 days`;
}

/** Verified YouTube numbers, as a small definition list. */
export function YouTubeStats({ stats }: { stats: AccountStats }) {
  const rows: [string, string][] = [
    ["Subscribers", stats.followers_hidden ? "Hidden" : (compactNumber(stats.followers) ?? "–")],
    ["Avg views", stats.avg_views_last10 === null ? "Not enough videos yet" : (compactNumber(stats.avg_views_last10) ?? "–")],
    ["Uploads", uploadsLabel(stats.uploads_per_week) ?? "–"],
    ["Growth", growthLabel(stats)],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-zinc-500">{label}</dt>
          <dd className="font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
