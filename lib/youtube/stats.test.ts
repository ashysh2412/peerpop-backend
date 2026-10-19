import { describe, expect, it } from "vitest";
import { averageViews, growth30d, parseDuration, uploadsPerWeek, type VideoFacts } from "./stats";

const now = new Date("2026-10-19T00:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();
const video = (over: Partial<VideoFacts>): VideoFacts => ({
  publishedAt: daysAgo(10),
  durationSeconds: 600,
  views: 1000,
  isPublic: true,
  isLive: false,
  ...over,
});

describe("parseDuration", () => {
  it.each([
    ["PT45S", 45],
    ["PT3M", 180],
    ["PT1H2M3S", 3723],
    ["P1DT1S", 86401],
    ["P0D", 0],
    ["garbage", 0],
  ])("%s is %i seconds", (iso, seconds) => {
    expect(parseDuration(iso)).toBe(seconds);
  });
});

describe("averageViews", () => {
  it("averages the 10 most recent long videos older than a week", () => {
    const videos = Array.from({ length: 12 }, (_, i) => video({ publishedAt: daysAgo(8 + i), views: (i + 1) * 100 }));
    expect(averageViews(videos, now)).toBe(550);
  });

  it("skips Shorts, live streams, private and fresh uploads", () => {
    const videos = [
      video({ views: 300 }),
      video({ views: 600 }),
      video({ views: 900 }),
      video({ durationSeconds: 59, views: 1_000_000 }),
      video({ durationSeconds: 180, views: 1_000_000 }),
      video({ isLive: true, views: 1_000_000 }),
      video({ isPublic: false, views: 1_000_000 }),
      video({ publishedAt: daysAgo(2), views: 1_000_000 }),
    ];
    expect(averageViews(videos, now)).toBe(600);
  });

  it("needs at least 3 qualifying videos", () => {
    expect(averageViews([video({}), video({})], now)).toBeNull();
  });
});

describe("uploadsPerWeek", () => {
  it("counts public uploads in the last 28 days, Shorts included", () => {
    const videos = [
      video({ publishedAt: daysAgo(1), durationSeconds: 30 }),
      video({ publishedAt: daysAgo(20) }),
      video({ publishedAt: daysAgo(27) }),
      video({ publishedAt: daysAgo(40) }),
      video({ publishedAt: daysAgo(3), isPublic: false }),
    ];
    expect(uploadsPerWeek(videos, now)).toBe(0.8);
  });
});

describe("growth30d", () => {
  it("compares with the snapshot nearest 30 days ago", () => {
    const snapshots = [
      { captured_on: "2026-09-21", followers: 900 },
      { captured_on: "2026-09-19", followers: 1000 },
      { captured_on: "2026-09-10", followers: 500 },
    ];
    expect(growth30d(1100, snapshots, "2026-10-19")).toEqual({ abs: 100, pct: 10 });
  });

  it("is null until there is a snapshot in the window", () => {
    expect(growth30d(1100, [{ captured_on: "2026-10-10", followers: 1000 }], "2026-10-19")).toBeNull();
    expect(growth30d(null, [{ captured_on: "2026-09-19", followers: 1000 }], "2026-10-19")).toBeNull();
  });
});
