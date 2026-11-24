import { describe, expect, it } from "vitest";
import { jodiNote } from "./jodi-note";

const m = (why: { city: boolean; niches: string[]; size: boolean }) => ({ display_name: "Neha Kulkarni", city_slug: "pune", why });

describe("jodiNote", () => {
  it("mentions both city and niche when both match", () => {
    expect(jodiNote("Test User", m({ city: true, niches: ["food"], size: true }))).toBe(
      "Hi Neha! I'm Test, a food creator from Pune too. Ek collab reel karein? Ek reel, do audience.",
    );
  });
  it("falls back to niche, city, size, then a plain hello", () => {
    expect(jodiNote("Test", m({ city: false, niches: ["food"], size: false }))).toContain("I also make food content.");
    expect(jodiNote("Test", m({ city: true, niches: [], size: false }))).toContain("also a creator in Pune.");
    expect(jodiNote("Test", m({ city: false, niches: [], size: true }))).toContain("similar size");
    expect(jodiNote("Test", m({ city: false, niches: [], size: false }))).toContain("new on Peerpop");
  });
  it("stays under the 300-character note limit", () => {
    expect(jodiNote("A".repeat(80), { display_name: "B".repeat(80), city_slug: "pune", why: { city: true, niches: ["food"], size: true } }).length).toBeLessThan(300);
  });
});
