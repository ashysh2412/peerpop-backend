import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-next";

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/settings/profile")).toBe("/settings/profile");
    expect(safeNextPath("/creators?city=pune")).toBe("/creators?city=pune");
  });

  it("falls back to /home for missing or unsafe values", () => {
    for (const bad of [null, undefined, "", "home", "https://evil.com", "//evil.com", "/\\evil.com", "/\t/evil.com", "/\n/evil.com", "/ /evil.com"]) {
      expect(safeNextPath(bad)).toBe("/home");
    }
  });
});
