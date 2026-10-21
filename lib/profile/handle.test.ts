import { describe, expect, it } from "vitest";
import { handleFromName, withSuffix } from "./handle";

describe("handleFromName", () => {
  it("joins the name into lowercase letters and numbers", () => {
    expect(handleFromName("Riya Sharma")).toBe("riyasharma");
    expect(handleFromName("  Om  K. 2  ")).toBe("omk2");
  });

  it("drops accents and other scripts", () => {
    expect(handleFromName("Zoë")).toBe("zoe");
    expect(handleFromName("प्रिया")).toBe("creator");
  });

  it("never takes the name of a page", () => {
    expect(handleFromName("Home")).toBe("home1");
  });

  it("pads short names and trims long ones", () => {
    expect(handleFromName("Al")).toBe("alcreator");
    expect(handleFromName("a".repeat(40))).toHaveLength(24);
  });
});

describe("withSuffix", () => {
  it("adds four digits and stays within 30 characters", () => {
    expect(withSuffix("riyasharma", () => 0)).toBe("riyasharma1000");
    expect(withSuffix("a".repeat(30), () => 0.5)).toMatch(/^a{26}\d{4}$/);
  });
});
