import { describe, expect, it } from "vitest";
import { assEscape, assTime, buildAss } from "../src/captions.js";

describe("assTime", () => {
  it("formats h:mm:ss.cc", () => {
    expect(assTime(0)).toBe("0:00:00.00");
    expect(assTime(65.5)).toBe("0:01:05.50");
    expect(assTime(3599.999)).toBe("0:59:59.99");
  });
});

describe("assEscape", () => {
  it("drops override braces and turns newlines into ASS breaks", () => {
    expect(assEscape("hi {\\b1}there\nfriend")).toBe("hi \\b1there\\Nfriend");
  });
});

describe("buildAss", () => {
  it("writes one dialogue line per cue on the right canvas, skipping empty cues", () => {
    const ass = buildAss([{ start: 0, end: 4, text: "Ek reel. Do audience." }, { start: 4, end: 8, text: "  " }, { start: 8, end: 12, text: "Tag your Robin" }], "9:16");
    expect(ass).toContain("PlayResX: 1080");
    expect(ass).toContain("PlayResY: 1920");
    expect(ass).toContain("Style: Caption,Inter,");
    expect(ass.match(/^Dialogue:/gm)).toHaveLength(2);
    expect(ass).toContain("Dialogue: 0,0:00:00.00,0:00:04.00,Caption,,0,0,0,,Ek reel. Do audience.");
  });
  it("centres hooks and uppercases when asked", () => {
    const ass = buildAss([{ start: 0, end: 2, text: "hook" }], "16:9", { position: "center", uppercase: true });
    const style = ass.split("\n").find((l) => l.startsWith("Style:"))!;
    expect(style.split(",")[18]).toBe("5"); // alignment field
    expect(ass).toContain(",,HOOK");
  });
});
