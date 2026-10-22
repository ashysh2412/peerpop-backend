import { describe, expect, it } from "vitest";
import { slugFromName, slugWithSuffix } from "./slug";

describe("slugFromName", () => {
  it("turns a name into a readable address", () => {
    expect(slugFromName("Pune Food Creators!")).toBe("pune-food-creators");
  });
  it("drops accents and stray dashes", () => {
    expect(slugFromName("  Café — Vlogs  ")).toBe("cafe-vlogs");
  });
  it("pads very short names", () => {
    expect(slugFromName("AI")).toBe("ai-group");
  });
  it("always fits the database rule", () => {
    for (const name of ["x".repeat(100), "!!", "Mumbai Dance Crew 2026"]) {
      expect(slugFromName(name)).toMatch(/^[a-z0-9-]{3,40}$/);
      expect(slugWithSuffix(slugFromName(name), () => 0.5)).toMatch(/^[a-z0-9-]{3,40}$/);
    }
  });
});
