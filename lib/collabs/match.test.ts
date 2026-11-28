import { describe, expect, it } from "vitest";
import type { JodiCandidate } from "@/lib/jodi/match";
import { ideaMatchMessage, pickIdeaMatches } from "./match";

const p = (id: string, niches: string[], followers: number, city: string | null = null): JodiCandidate => ({
  id,
  name: `${id} Kumar`,
  handle: id,
  city,
  cityName: city,
  niches,
  followers,
  connections: 0,
  joined: "2026-11-01T00:00:00Z",
});

describe("pickIdeaMatches", () => {
  const me = p("me", ["food"], 5000, "pune");

  it("keeps creators within 3x and with a matching niche, shared niche first", () => {
    const pool = [p("big", ["food"], 50000), p("same", ["food"], 6000), p("rel", ["travel"], 5000), p("off", ["gaming"], 5000), me];
    const ids = pickIdeaMatches(me, { niches: ["food"], city: null }, pool, new Set()).map((m) => m.b.id);
    expect(ids).toEqual(["same", "rel"]);
  });

  it("uses the author's niches when the idea has none, and prefers the shoot city", () => {
    const pool = [p("far", ["food"], 5000, "delhi"), p("near", ["food"], 5000, "pune")];
    const ids = pickIdeaMatches(me, { niches: [], city: "pune" }, pool, new Set()).map((m) => m.b.id);
    expect(ids).toEqual(["near", "far"]);
  });

  it("skips blocked pairs and people without a follower count", () => {
    const pool = [p("blocked", ["food"], 5000), p("nofollow", ["food"], 0), p("ok", ["food"], 4000)];
    const ids = pickIdeaMatches(me, { niches: ["food"], city: null }, pool, new Set(["blocked:me"])).map((m) => m.b.id);
    expect(ids).toEqual(["ok"]);
  });

  it("without the author's size, any size counts and smaller comes first", () => {
    const anon = p("anon", [], 0);
    const pool = [p("huge", ["food"], 900000), p("small", ["food"], 900)];
    const ids = pickIdeaMatches(anon, { niches: ["food"], city: null }, pool, new Set()).map((m) => m.b.id);
    expect(ids).toEqual(["small", "huge"]);
  });

  it("returns nothing when there's no niche to go on", () => {
    expect(pickIdeaMatches(p("x", [], 0), { niches: [], city: null }, [p("a", ["food"], 10)], new Set())).toEqual([]);
  });
});

describe("ideaMatchMessage", () => {
  it("is short, uses first names and links the idea", () => {
    const text = ideaMatchMessage({ name: "Aman Singh" }, { id: "abc", title: "Street food" }, { name: "Priya Shah" });
    expect(text).toContain("Hi Aman");
    expect(text).toContain('"Street food" by Priya');
    expect(text).toContain("www.peerpop.in/collabs/abc");
    expect(text.split("\n").length).toBeLessThan(8);
  });
});
