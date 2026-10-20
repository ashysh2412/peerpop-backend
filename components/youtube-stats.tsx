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

export function updatedLabel(iso: string, now = Date.now()) {
  const minutes = Math.floor((now - Date.parse(iso)) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
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
    <div className="flex flex-col gap-2">
      <dl className="grid grid-cols-2 gap-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-sunken px-3 py-2.5">
            <dt className="text-[11px] font-medium text-muted">{label}</dt>
            <dd className="font-bold">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted">Updated {updatedLabel(stats.computed_at)} · from YouTube</p>
    </div>
  );
}
