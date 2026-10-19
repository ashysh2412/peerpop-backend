// Pure maths behind the verified stats (search spec 3.3 to 3.5).

export type VideoFacts = {
  publishedAt: string;
  durationSeconds: number;
  views: number;
  isPublic: boolean;
  isLive: boolean;
};

export type Snapshot = { captured_on: string; followers: number | null };

const DAY = 24 * 60 * 60 * 1000;
const SHORTS_MAX_SECONDS = 180;

/** ISO 8601 durations as YouTube returns them, like PT1H2M3S or P1DT2H. */
export function parseDuration(iso: string): number {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso);
  if (!m) return 0;
  const [, d, h, min, s] = m.map((part) => Number(part ?? 0));
  return d * 86400 + h * 3600 + min * 60 + s;
}

/** Mean views of the 10 latest long-form videos older than a week, or null if fewer than 3 qualify. */
export function averageViews(videos: VideoFacts[], now: Date): number | null {
  const cutoff = now.getTime() - 7 * DAY;
  const eligible = videos
    .filter((v) => v.isPublic && !v.isLive && v.durationSeconds > SHORTS_MAX_SECONDS)
    .filter((v) => Date.parse(v.publishedAt) <= cutoff)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 10);
  if (eligible.length < 3) return null;
  return Math.round(eligible.reduce((sum, v) => sum + v.views, 0) / eligible.length);
}

/** Public uploads (Shorts included) in the last 28 days, per week, to one decimal. */
export function uploadsPerWeek(videos: VideoFacts[], now: Date): number {
  const cutoff = now.getTime() - 28 * DAY;
  const count = videos.filter((v) => v.isPublic && !v.isLive && Date.parse(v.publishedAt) >= cutoff).length;
  return Math.round((count / 4) * 10) / 10;
}

/** Follower change against the snapshot nearest 30 days ago (27 to 33 days accepted). */
export function growth30d(
  followersToday: number | null,
  snapshots: Snapshot[],
  today: string,
): { abs: number; pct: number | null } | null {
  if (followersToday === null) return null;
  const todayMs = Date.parse(today);
  let best: { gap: number; followers: number } | null = null;
  for (const s of snapshots) {
    if (s.followers === null) continue;
    const age = Math.round((todayMs - Date.parse(s.captured_on)) / DAY);
    if (age < 27 || age > 33) continue;
    const gap = Math.abs(age - 30);
    if (!best || gap < best.gap) best = { gap, followers: s.followers };
  }
  if (!best) return null;
  const abs = followersToday - best.followers;
  const pct = best.followers > 0 ? Math.round((abs / best.followers) * 10000) / 100 : null;
  return { abs, pct };
}
