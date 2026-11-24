import type { SupabaseClient } from "@supabase/supabase-js";

export const TREND_KINDS = [
  ["audio", "Trending audio"],
  ["format", "Reel format"],
  ["hashtag", "Hashtag"],
  ["challenge", "Challenge"],
] as const;
export type TrendKind = (typeof TREND_KINDS)[number][0];

export type Trend = { id: string; kind: TrendKind; title: string; idea: string | null; link: string | null; created_at: string };

/** Trends older than this are hidden on Home, so the box never shows last month's news. */
export const TREND_MAX_AGE_DAYS = 14;

/** How many trends the admin page offers. */
export const TREND_ROWS = 5;

export function kindLabel(kind: string) {
  return TREND_KINDS.find(([k]) => k === kind)?.[1] ?? "Trend";
}

/** Only http(s) links, so nothing odd ends up behind a click. */
export function safeLink(link: string | null | undefined) {
  const value = (link ?? "").trim();
  if (!value) return null;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** The current trends in the admin's order. Empty (and the box hidden) if the table isn't there yet or they've gone stale. */
export async function getTrends(supabase: SupabaseClient, now: number, { includeStale = false } = {}): Promise<Trend[]> {
  const { data, error } = await supabase.from("trends").select("id, kind, title, idea, link, created_at").order("position").limit(8);
  if (error || !data) return [];
  const rows = data as Trend[];
  if (includeStale) return rows;
  const newest = Math.max(...rows.map((t) => Date.parse(t.created_at)));
  return now - newest > TREND_MAX_AGE_DAYS * 86_400_000 ? [] : rows;
}
