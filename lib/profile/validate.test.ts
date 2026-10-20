import { describe, expect, it } from "vitest";
import { validateContacts, validateLinks, validateProfile } from "./validate";

function form(entries: [string, string][]) {
  const f = new FormData();
  for (const [k, v] of entries) f.append(k, v);
  return f;
}

describe("validateProfile", () => {
  it("accepts a complete profile and normalises the handle", () => {
    const r = validateProfile(
      form([
        ["handle", "@Asha_Cooks"],
        ["display_name", " Asha "],
        ["city_slug", "pune"],
        ["niches", "food"],
        ["niches", "food"],
        ["niches", "bogus"],
        ["skills", "anchor"],
        ["languages", "marathi"],
        ["open_to_collab", "on"],
      ]),
    );
    expect(r).toEqual({
      ok: true,
      data: {
        handle: "asha_cooks",
        display_name: "Asha",
        bio: null,
        city_slug: "pune",
        niches: ["food"],
        skills: ["anchor"],
        languages: ["marathi"],
        open_to_collab: true,
        is_listed: true,
      },
    });
  });

  it("reads the listed checkbox with its hidden fallback", () => {
    const base: [string, string][] = [["handle", "asha"], ["display_name", "Asha"], ["niches", "food"]];
    const listed = (extra: [string, string][]) => {
      const r = validateProfile(form([...base, ...extra]));
      return r.ok && r.data.is_listed;
    };
    expect(listed([])).toBe(true);
    expect(listed([["is_listed", "off"]])).toBe(false);
    expect(listed([["is_listed", "off"], ["is_listed", "on"]])).toBe(true);
  });

  it("reports each problem", () => {
    const r = validateProfile(form([["handle", "a b"], ["city_slug", "atlantis"]]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["city_slug", "display_name", "handle", "niches"]);
  });
});

describe("validateLinks", () => {
  it("cleans up YouTube and Instagram input", () => {
    const r = validateLinks(
      form([
        ["youtube_url", "youtube.com/@ashacooks/"],
        ["instagram_handle", "https://instagram.com/asha.cooks/"],
        ["instagram_followers", "12.5K"],
        ["instagram_avg_views", "3,400"],
      ]),
    );
    expect(r).toEqual({
      ok: true,
      data: {
        youtube_url: "https://www.youtube.com/@ashacooks",
        instagram_handle: "asha.cooks",
        instagram_followers: 12500,
        instagram_avg_views: 3400,
      },
    });
  });

  it("allows leaving everything empty", () => {
    expect(validateLinks(form([]))).toEqual({
      ok: true,
      data: { youtube_url: null, instagram_handle: null, instagram_followers: null, instagram_avg_views: null },
    });
  });

  it("needs followers with an Instagram handle and rejects other sites", () => {
    const r = validateLinks(form([["youtube_url", "https://vimeo.com/x"], ["instagram_handle", "asha"]]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["instagram_followers", "youtube_url"]);
  });
});

describe("validateContacts", () => {
  it("adds +91 to a 10-digit Indian mobile", () => {
    expect(validateContacts(form([["contact_whatsapp", "98765 43210"]]))).toEqual({
      ok: true,
      data: { contact_email: null, contact_whatsapp: "+919876543210", contact_note: null },
    });
  });

  it("rejects a bad email", () => {
    expect(validateContacts(form([["contact_email", "nope"]])).ok).toBe(false);
  });
});
