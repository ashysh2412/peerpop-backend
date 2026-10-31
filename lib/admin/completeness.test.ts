import { describe, expect, it } from "vitest";
import { profileGaps } from "./completeness";

const full = { hasProfile: true, photo: true, city: true, bio: true, skills: 2, niches: 1, channels: 1, videos: 3 };

describe("profileGaps", () => {
  it("is empty for a complete profile", () => {
    expect(profileGaps(full)).toEqual([]);
  });

  it("lists what is missing in order", () => {
    expect(profileGaps({ ...full, photo: false, bio: false, videos: 0 })).toEqual(["Photo", "Bio", "Videos"]);
  });

  it("says the whole profile is missing when there is none", () => {
    expect(profileGaps({ ...full, hasProfile: false })).toEqual(["Profile"]);
  });
});
