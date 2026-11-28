import { describe, expect, it } from "vitest";
import { validateCollab, validateIdea } from "./validate";

function form(fields: Record<string, string | string[]>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const x of [v].flat()) f.append(k, x);
  return f;
}

const good = {
  title: "Marathi anchor for a food series",
  description: "Shooting 4 episodes around Pune.",
  city_slug: "pune",
  roles_needed: ["anchor"],
  niches: ["food"],
};

describe("validateCollab", () => {
  it("accepts a complete post", () => {
    const r = validateCollab(form({ ...good, shoot_date: "2026-11-01" }), "2026-10-20");
    expect(r.ok && r.data).toMatchObject({ city_slug: "pune", roles_needed: ["anchor"], shoot_date: "2026-11-01" });
  });

  it("needs a title, a description and a role", () => {
    const r = validateCollab(form({ title: "Hey" }), "2026-10-20");
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(["description", "roles_needed", "title"]);
  });

  it("drops unknown chips and rejects unknown cities", () => {
    const r = validateCollab(form({ ...good, niches: ["food", "nope"], city_slug: "atlantis" }), "2026-10-20");
    expect(!r.ok && r.errors.city_slug).toBeTruthy();
    const ok = validateCollab(form({ ...good, niches: ["food", "nope"] }), "2026-10-20");
    expect(ok.ok && ok.data.niches).toEqual(["food"]);
  });

  it("rejects past or malformed shoot dates", () => {
    expect(validateCollab(form({ ...good, shoot_date: "2026-10-01" }), "2026-10-20").ok).toBe(false);
    expect(validateCollab(form({ ...good, shoot_date: "soon" }), "2026-10-20").ok).toBe(false);
  });
});

describe("validateIdea", () => {
  const f = (entries: [string, string][]) => {
    const fd = new FormData();
    for (const [k, v] of entries) fd.append(k, v);
    return fd;
  };
  it("saves a one-line idea as an open collab for any creator", () => {
    const r = validateIdea(f([["idea", "  Mumbai vs Delhi   street food "], ["niches", "food"], ["niches", "bogus"]]), []);
    expect(r).toEqual({
      ok: true,
      data: { title: "Mumbai vs Delhi street food", description: "Mumbai vs Delhi street food", city_slug: null, niches: ["food"], roles_needed: ["content_creator"], languages: [], shoot_date: null },
    });
  });
  it("falls back to the author's niches", () => {
    const r = validateIdea(f([["idea", "Dance workout reel"]]), ["dance", "fitness"]);
    expect(r.ok && r.data.niches).toEqual(["dance", "fitness"]);
  });
  it("needs a few words", () => {
    expect(validateIdea(f([["idea", "hi"]]), []).ok).toBe(false);
  });
});
