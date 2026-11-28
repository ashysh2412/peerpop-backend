import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => null }));
vi.mock("@/lib/youtube/api", () => ({ findChannel: async () => null }));
const { parseFollowers, readBasics } = await import("./basics");

const form = (entries: [string, string][]) => {
  const f = new FormData();
  for (const [k, v] of entries) f.append(k, v);
  return f;
};

describe("parseFollowers", () => {
  it("reads plain numbers and K / L / M", () => {
    expect(parseFollowers("12000")).toBe(12000);
    expect(parseFollowers("12K")).toBe(12000);
    expect(parseFollowers("1.2L")).toBe(120000);
    expect(parseFollowers("1.5m")).toBe(1500000);
    expect(parseFollowers("12,500")).toBe(12500);
    expect(parseFollowers("")).toBeNull();
    expect(parseFollowers("lots")).toBe("invalid");
  });
});

describe("readBasics", () => {
  it("needs a niche and followers or a YouTube link", () => {
    expect(readBasics(form([["followers", "5K"]])).ok).toBe(false);
    expect(readBasics(form([["niches", "food"]])).ok).toBe(false);
    expect(readBasics(form([["niches", "food"], ["followers", "5K"]]))).toEqual({
      ok: true,
      data: { niches: ["food"], followers: 5000, youtube: null, instagram: null },
    });
    expect(readBasics(form([["niches", "food"], ["youtube", "youtube.com/@riya"]])).ok).toBe(true);
  });
  it("cleans the Instagram username and ignores unknown niches", () => {
    const r = readBasics(form([["niches", "food"], ["niches", "nope"], ["followers", "900"], ["instagram", "https://instagram.com/riya.eats/"]]));
    expect(r).toEqual({ ok: true, data: { niches: ["food"], followers: 900, youtube: null, instagram: "riya.eats" } });
  });
});
