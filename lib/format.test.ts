import { describe, expect, it } from "vitest";
import { compactNumber } from "./format";

describe("compactNumber", () => {
  it("uses K and M, not lakh", () => {
    expect(compactNumber(950)).toBe("950");
    expect(compactNumber(8400)).toBe("8.4K");
    expect(compactNumber(150000)).toBe("150K");
    expect(compactNumber(1_230_000)).toBe("1.2M");
    expect(compactNumber(null)).toBeNull();
  });
});
