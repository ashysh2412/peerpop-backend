import { describe, expect, it } from "vitest";
import { pickUploadsToShare } from "./auto-share-pick";

const v = (id: string, publishedAt: string, extra: Partial<{ isPublic: boolean; isLive: boolean; title: string }> = {}) => ({
  id,
  title: `Video ${id}`,
  publishedAt,
  durationSeconds: 60,
  views: 0,
  isPublic: true,
  isLive: false,
  ...extra,
});

describe("pickUploadsToShare", () => {
  it("shares only public, finished uploads after the start time, oldest first", () => {
    const picked = pickUploadsToShare(
      [
        v("new2", "2026-11-18T10:00:00Z"),
        v("old", "2026-11-17T10:00:00Z"),
        v("new1", "2026-11-18T09:00:00Z"),
        v("private", "2026-11-18T11:00:00Z", { isPublic: false }),
        v("live", "2026-11-18T12:00:00Z", { isLive: true }),
      ],
      "2026-11-18T00:00:00Z",
    );
    expect(picked).toEqual([
      { url: "https://www.youtube.com/watch?v=new1", body: "Video new1" },
      { url: "https://www.youtube.com/watch?v=new2", body: "Video new2" },
    ]);
  });

  it("keeps only the 3 newest when many are new, and falls back when the title is empty", () => {
    const many = ["a", "b", "c", "d"].map((id, i) => v(id, `2026-11-18T0${i}:00:00Z`));
    expect(pickUploadsToShare(many, "2026-11-01T00:00:00Z").map((p) => p.url.slice(-1))).toEqual(["b", "c", "d"]);
    expect(pickUploadsToShare([v("x", "2026-11-18T01:00:00Z", { title: " " })], "2026-11-01T00:00:00Z")[0].body).toBe("New video on my channel");
  });
});
