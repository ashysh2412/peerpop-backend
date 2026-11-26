import { describe, expect, it } from "vitest";
import { defaultOutDir, parseArgs } from "../src/cli.js";

describe("parseArgs", () => {
  it("reads the brief and defaults", () => {
    const a = parseArgs(["Chai cafe opening ad"]);
    expect(a.brief).toBe("Chai cafe opening ad");
    expect(a.aspect).toBe("9:16");
    expect(a.duration).toBe(30);
    expect(a.captions).toBe(true);
    expect(a.model).toBe("claude-opus-5-5");
  });
  it("reads options", () => {
    const a = parseArgs(["--aspect", "16:9", "--duration", "20", "--provider", "mock", "--no-captions", "--music", "--max-clips", "4", "brief", "words"]);
    expect(a).toMatchObject({ aspect: "16:9", duration: 20, provider: "mock", captions: false, music: true, maxClips: 4, brief: "brief words" });
  });
  it("rejects bad values", () => {
    expect(() => parseArgs(["x", "--aspect", "4:3"])).toThrow(/--aspect/);
    expect(() => parseArgs(["x", "--provider", "sora"])).toThrow(/--provider/);
    expect(() => parseArgs(["x", "--duration", "-3"])).toThrow(/positive/);
    expect(() => parseArgs(["--music"])).toThrow(/brief/);
    expect(() => parseArgs(["x", "--wat"])).toThrow(/Unknown option/);
  });
  it("help needs no brief", () => {
    expect(parseArgs(["--help"]).help).toBe(true);
  });
});

describe("defaultOutDir", () => {
  it("is dated and slugged", () => {
    expect(defaultOutDir("Hello, World! Ad #1", new Date("2026-11-26T19:30:00Z"))).toMatch(/out[\\/]20261126-1930-hello-world-ad-1$/);
  });
});
