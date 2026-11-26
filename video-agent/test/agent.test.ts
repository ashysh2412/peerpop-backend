// The agent wiring without calling Claude: tool server shape, budget guard, path jail, prompt content.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { buildJob } from "../src/agent.js";
import { mockProvider } from "../src/providers/mock.js";
import { systemPrompt } from "../src/prompt.js";
import { createVideoTools, videoToolDefinitions } from "../src/tools.js";

const work = fs.mkdtempSync(path.join(os.tmpdir(), "video-agent-tools-"));
afterAll(() => fs.rmSync(work, { recursive: true, force: true }));

type Handler = (args: Record<string, unknown>, extra: unknown) => Promise<{ content: { type: string; text?: string }[]; isError?: boolean }>;

describe("video tool server", () => {
  const budget = { maxClips: 2, maxClipSeconds: 100, usedClips: 0, usedSeconds: 0 };
  const ctx = { provider: mockProvider, workDir: work, aspect: "9:16" as const, budget };
  const defs = videoToolDefinitions(ctx);
  const handler = (name: string) => defs.find((d) => d.name === name)!.handler as unknown as Handler;

  it("registers the six tools under the 'video' server", () => {
    const server = createVideoTools(ctx);
    expect(server.name).toBe("video");
    expect(server.type).toBe("sdk");
    expect(defs.map((d) => d.name).sort()).toEqual(["assemble_video", "contact_sheet", "generate_clip", "generate_music", "generate_voiceover", "probe_media"]);
  });

  it("generates clips until the budget runs out, reporting what is left", async () => {
    const call = handler("generate_clip");
    const first = await call({ name: "hook", prompt: "A chai glass steaming at sunrise, slow push-in", duration_seconds: 3, audio: true }, {});
    expect(first.isError).toBeUndefined();
    const data = JSON.parse(first.content[0].text!);
    expect(data.path).toBe(path.join("clips", "01-hook.mp4"));
    expect(data.budget_left.clips).toBe(1);
    await call({ name: "second", prompt: "Two friends laughing on a scooter, handheld", duration_seconds: 2, audio: false }, {});
    const third = await call({ name: "third", prompt: "Another shot that should be refused by budget", duration_seconds: 2, audio: false }, {});
    expect(third.isError).toBe(true);
    expect(third.content[0].text).toMatch(/budget/i);
    expect(budget.usedClips).toBe(2);
  });

  it("keeps file access inside the job folder", async () => {
    const probeCall = handler("probe_media");
    const res = await probeCall({ path: "../../etc/passwd" }, {});
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/inside the job folder/);
  });

  it("assembles from relative clip paths and makes a contact sheet", async () => {
    const assembleCall = handler("assemble_video");
    const res = await assembleCall({ segments: [{ clip: "clips/01-hook.mp4", caption: "Hook" }, { clip: "clips/02-second.mp4" }], output: "final.mp4", voiceover_start: 0, music_volume: 0.2, keep_clip_audio: true, caption_position: "low", caption_uppercase: false }, {});
    expect(res.isError).toBeUndefined();
    const data = JSON.parse(res.content[0].text!);
    expect(data.path).toBe("final.mp4");
    expect(data.width).toBe(1080);
    expect(data.timeline).toHaveLength(2);
    const sheet = await handler("contact_sheet")({ video: "final.mp4", frames: 3, output: "contact-sheet.png" }, {});
    expect(JSON.parse(sheet.content[0].text!).frames).toBe(3);
    expect(fs.existsSync(path.join(work, "contact-sheet.png"))).toBe(true);
  });
});

describe("buildJob", () => {
  it("prepares the job folder, brief and budget without calling Claude", () => {
    const dir = path.join(work, "job");
    const job = buildJob({ brief: "Test brief", aspect: "16:9", targetSeconds: 20, outDir: dir, provider: "mock", captions: true, voiceover: true, music: true, model: "claude-opus-5-5", maxTurns: 5, maxClips: 3, maxClipSeconds: 30 });
    expect(fs.readFileSync(path.join(dir, "brief.txt"), "utf8")).toBe("Test brief\n");
    expect(job.budget).toEqual({ maxClips: 3, maxClipSeconds: 30, usedClips: 0, usedSeconds: 0 });
    expect(job.provider.name).toBe("mock");
  });
});

describe("systemPrompt", () => {
  it("tells the agent the format, budget and which optional steps are on", () => {
    const p = systemPrompt({ text: "x", aspect: "9:16", targetSeconds: 30, captions: true, voiceover: false, music: true, providerName: "runway/veo3.1_fast", clipDurations: [4, 6, 8], maxClips: 10, maxClipSeconds: 80 });
    expect(p).toContain("runway/veo3.1_fast");
    expect(p).toContain("4, 6, 8 seconds");
    expect(p).toContain("at most 10 clips and 80 seconds");
    expect(p).toContain("No voiceover for this job");
    expect(p).toContain("Call generate_music once");
    expect(p).toContain("one caption per clip");
  });
});
