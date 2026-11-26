// End-to-end through the real ffmpeg: mock footage -> assemble with captions, voiceover and music -> contact sheet.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assemble, contactSheet } from "../src/assemble.js";
import { probe } from "../src/ffmpeg.js";
import { _internal, mockProvider } from "../src/providers/mock.js";
import { snapDuration } from "../src/providers/types.js";

const work = fs.mkdtempSync(path.join(os.tmpdir(), "video-agent-test-"));
afterAll(() => fs.rmSync(work, { recursive: true, force: true }));

describe("snapDuration", () => {
  it("picks the nearest allowed length, rounding up on ties", () => {
    expect(snapDuration(5, [4, 6, 8])).toBe(6);
    expect(snapDuration(3, [4, 6, 8])).toBe(4);
    expect(snapDuration(9.4, [4, 6, 8])).toBe(8);
    expect(snapDuration(7.3, undefined)).toBe(7);
    expect(snapDuration(40, undefined)).toBe(10);
  });
});

describe("mock audio", () => {
  it("encodes for the container the tool asks for", async () => {
    expect(_internal.audioCodec("x.mp3")).toBe("libmp3lame");
    expect(_internal.audioCodec("x.m4a")).toBe("aac");
    const mp3 = path.join(work, "vo.mp3");
    await mockProvider.generateVoiceover!({ text: "one two three four five six", outPath: mp3 });
    const info = await probe(mp3);
    expect(info.hasAudio).toBe(true);
    expect(info.durationSeconds).toBeGreaterThan(1.5);
  });
});

describe("mock provider + assemble", () => {
  const clipA = path.join(work, "a.mp4"), clipB = path.join(work, "b.mp4");
  beforeAll(async () => {
    await mockProvider.generateClip({ prompt: "Opening shot: a steaming chai glass at sunrise", durationSeconds: 3, aspect: "9:16", audio: true, outPath: clipA });
    await mockProvider.generateClip({ prompt: "Closing shot: two friends laughing", durationSeconds: 2, aspect: "9:16", audio: false, outPath: clipB });
  });

  it("renders clips of the asked length, with or without sound", async () => {
    const a = await probe(clipA), b = await probe(clipB);
    expect(a.durationSeconds).toBeGreaterThan(2.8);
    expect(a.durationSeconds).toBeLessThan(3.3);
    expect(a.hasAudio).toBe(true);
    expect(b.hasAudio).toBe(false);
    expect(a.width! / a.height!).toBeCloseTo(9 / 16, 1);
  });

  it("assembles to the canvas with captions, voiceover and music", async () => {
    const vo = path.join(work, "vo.m4a"), music = path.join(work, "music.m4a");
    await mockProvider.generateVoiceover!({ text: "Two creators. One reel. Both audiences.", outPath: vo });
    await mockProvider.generateMusic!({ prompt: "lofi", durationSeconds: 3, instrumental: true, outPath: music });
    const out = path.join(work, "final.mp4");
    const res = await assemble({
      segments: [
        { clip: clipA, caption: "Ek reel. Do audience.", trimStart: 0.5 },
        { clip: clipB, caption: "Tag your collab partner" },
      ],
      aspect: "9:16",
      output: out,
      workDir: work,
      voiceover: vo,
      music, // shorter than the video, so it must loop
      musicVolume: 0.2,
    });
    expect(res.width).toBe(1080);
    expect(res.height).toBe(1920);
    expect(res.hasAudio).toBe(true);
    expect(res.durationSeconds).toBeGreaterThan(4.3); // (3 - 0.5) + 2
    expect(res.durationSeconds).toBeLessThan(4.8);
    expect(res.segments).toEqual([
      expect.objectContaining({ start: 0, caption: "Ek reel. Do audience." }),
      expect.objectContaining({ caption: "Tag your collab partner" }),
    ]);
    expect(fs.existsSync(res.captionsFile!)).toBe(true);
    expect(fs.readFileSync(res.captionsFile!, "utf8")).toContain("Tag your collab partner");
  });

  it("fits 16:9 and 1:1 canvases and skips captions when told", async () => {
    const out = path.join(work, "square.mp4");
    const res = await assemble({ segments: [{ clip: clipB, caption: "ignored" }], aspect: "1:1", output: out, workDir: work, captions: false });
    expect([res.width, res.height]).toEqual([1080, 1080]);
    expect(res.captionsFile).toBeUndefined();
  });

  it("refuses segments that trim to nothing or point at missing files", async () => {
    await expect(assemble({ segments: [{ clip: clipB, trimStart: 1.9, trimEnd: 2 }], aspect: "9:16", output: path.join(work, "x.mp4"), workDir: work })).rejects.toThrow(/trimStart/);
    await expect(assemble({ segments: [{ clip: path.join(work, "nope.mp4") }], aspect: "9:16", output: path.join(work, "x.mp4"), workDir: work })).rejects.toThrow(/not found/);
  });

  it("makes a contact sheet strip", async () => {
    const sheet = await contactSheet(path.join(work, "final.mp4"), path.join(work, "sheet.png"), 4);
    const info = await probe(sheet.path);
    expect(info.width).toBe(270 * 4);
    expect(sheet.frames).toBe(4);
  });
});
