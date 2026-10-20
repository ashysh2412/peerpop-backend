import { describe, expect, it } from "vitest";
import { parseFilters, toQueryString, toRpcArgs } from "./params";

describe("parseFilters", () => {
  it("reads comma lists and repeated params, dropping unknown values", () => {
    const f = parseFilters({ city: "pune", niche: ["food,tech", "nope"], skill: "editor", lang: ["hindi", "marathi"] });
    expect(f.city).toBe("pune");
    expect(f.niches).toEqual(["food", "tech"]);
    expect(f.skills).toEqual(["editor"]);
    expect(f.langs).toEqual(["marathi", "hindi"]);
  });

  it("falls back to safe defaults", () => {
    expect(parseFilters({ city: "atlantis", followers: "huge", page: "-3", sort: "random" })).toMatchObject({
      city: null,
      followers: null,
      page: 1,
      sort: "audience",
      collab: false,
      verified: false,
    });
  });
});

describe("toRpcArgs", () => {
  it("maps follower buckets and pages", () => {
    const args = toRpcArgs(parseFilters({ followers: "10k-50k", page: "3", collab: "1" }));
    expect(args).toMatchObject({ p_min: 10000, p_max: 50000, p_offset: 48, p_limit: 24, p_collab: true, p_niches: null });
    expect(toRpcArgs(parseFilters({ followers: "200k" }))).toMatchObject({ p_min: 200000, p_max: null });
    expect(toRpcArgs(parseFilters({ followers: "lt10k" }))).toMatchObject({ p_min: null, p_max: 10000 });
  });
});

describe("toQueryString", () => {
  it("round-trips through parseFilters", () => {
    const f = parseFilters({ city: "mumbai", niche: "food,tech", followers: "50k-200k", verified: "1", sort: "views" });
    const qs = toQueryString(f, { page: 2 });
    expect(qs).toBe("?city=mumbai&niche=food%2Ctech&followers=50k-200k&verified=1&sort=views&page=2");
    expect(parseFilters(Object.fromEntries(new URLSearchParams(qs)))).toEqual({ ...f, page: 2 });
  });

  it("is empty with no filters", () => {
    expect(toQueryString(parseFilters({}))).toBe("");
  });
});
