import { describe, expect, it } from "vitest";
import { jodiMessage, pairKey, pickJodiPairs, type JodiCandidate } from "./match";

const p = (id: string, o: Partial<JodiCandidate> = {}): JodiCandidate => ({
  id,
  name: id.toUpperCase() + " Test",
  handle: id,
  city: "pune",
  cityName: "Pune",
  niches: ["fashion"],
  followers: 1000,
  connections: 0,
  joined: "2026-11-20T00:00:00Z",
  ...o,
});
const none = { busy: new Set<string>(), avoid: new Set<string>(), maxPairs: 10 };
const ids = (pairs: ReturnType<typeof pickJodiPairs>) => pairs.map((x) => [x.a.id, x.b.id]);

describe("pickJodiPairs", () => {
  it("pairs similar sizes and never pairs anyone twice in one night", () => {
    const pairs = pickJodiPairs([p("a"), p("b"), p("c")], none);
    expect(pairs).toHaveLength(1);
  });
  it("skips sizes more than 3x apart", () => {
    expect(pickJodiPairs([p("a", { followers: 1000 }), p("b", { followers: 3500 })], none)).toEqual([]);
  });
  it("needs a shared or related niche", () => {
    expect(pickJodiPairs([p("a", { niches: ["fashion"] }), p("b", { niches: ["finance"] })], none)).toEqual([]);
    const related = pickJodiPairs([p("a", { niches: ["fashion"] }), p("b", { niches: ["beauty"] })], none);
    expect(related[0].related).toBe(true);
  });
  it("prefers a different city", () => {
    const pairs = pickJodiPairs([p("a"), p("b"), p("c", { city: "kolkata", cityName: "Kolkata", connections: 1 })], none);
    expect(ids(pairs)).toEqual([["a", "c"]]);
  });
  it("skips busy people, past pairs, and people without a niche or followers", () => {
    expect(pickJodiPairs([p("a"), p("b")], { ...none, busy: new Set(["a"]) })).toEqual([]);
    expect(pickJodiPairs([p("a"), p("b")], { ...none, avoid: new Set([pairKey("b", "a")]) })).toEqual([]);
    expect(pickJodiPairs([p("a", { niches: [] }), p("b")], none)).toEqual([]);
    expect(pickJodiPairs([p("a", { followers: 0 }), p("b")], none)).toEqual([]);
  });
  it("stops at the daily limit, lonely members first", () => {
    const people = [p("a", { connections: 5 }), p("b", { connections: 5 }), p("c"), p("d")];
    expect(ids(pickJodiPairs(people, { ...none, maxPairs: 1 }))).toEqual([["c", "d"]]);
  });
});

describe("jodiMessage", () => {
  it("names the partner and links their profile, without any Instagram ID", () => {
    const [pair] = pickJodiPairs([p("sheta", { name: "Sheta Halder", city: "kolkata", cityName: "Kolkata", niches: ["beauty", "fashion"] }), p("kerlin", { name: "Kerlin", city: "shillong", cityName: "Shillong", niches: ["fashion", "beauty"] })], none);
    const text = jodiMessage(pair, "sheta");
    expect(text).toContain("Hi Sheta");
    expect(text).toContain("Meet Kerlin from Shillong");
    expect(text).toContain("both into beauty and fashion");
    expect(text).toContain("different cities");
    expect(text).toContain("www.peerpop.in/kerlin");
    expect(jodiMessage(pair, "kerlin")).toContain("www.peerpop.in/sheta");
  });
  it("explains a related-niche mix", () => {
    const [pair] = pickJodiPairs([p("a", { niches: ["food"] }), p("b", { niches: ["travel"] })], none);
    expect(jodiMessage(pair, "a")).toContain("You do food and B does travel, a great mix");
    expect(jodiMessage(pair, "a")).toContain("both in Pune");
  });
});
