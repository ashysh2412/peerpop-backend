// The tools the agent can call, exposed as an in-process MCP server named "video"
// (so the model sees them as mcp__video__generate_clip and so on).
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { assemble, contactSheet } from "./assemble.js";
import { probe } from "./ffmpeg.js";
import type { ClipProvider } from "./providers/index.js";
import { ASPECTS, type Aspect } from "./providers/types.js";

export type Budget = { maxClips: number; maxClipSeconds: number; usedClips: number; usedSeconds: number };

export type ToolContext = {
  provider: ClipProvider;
  workDir: string;
  aspect: Aspect;
  budget: Budget;
  /** Called whenever something costs money or time, for the CLI's progress line. */
  onEvent?: (line: string) => void;
};

const ok = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });
const fail = (message: string) => ({ content: [{ type: "text" as const, text: message }], isError: true });
// Files get a running number, so a leading "03-" in the agent's own name is dropped.
const slug = (s: string) => s.toLowerCase().replace(/^\d+[-_ ]*/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "clip";

/** Only lets the agent touch files inside its job folder. */
function inside(workDir: string, p: string) {
  const abs = path.resolve(workDir, p);
  if (!abs.startsWith(path.resolve(workDir) + path.sep) && abs !== path.resolve(workDir)) throw new Error(`Path must stay inside the job folder: ${p}`);
  return abs;
}

/** The raw tool definitions; tests call their handlers directly. */
export function videoToolDefinitions(ctx: ToolContext) {
  const { provider, workDir, budget } = ctx;
  const say = (line: string) => ctx.onEvent?.(line);
  fs.mkdirSync(path.join(workDir, "clips"), { recursive: true });
  fs.mkdirSync(path.join(workDir, "audio"), { recursive: true });

  const generateClip = tool(
    "generate_clip",
    `Generate one piece of AI footage with the ${provider.name} model and save it as an mp4 in clips/. ` +
      `Describe a single continuous shot: subject, action, setting, camera move, lens, lighting, mood, style. ` +
      `Never ask for on-screen text, logos, or real people; text is garbled by video models and captions are burned later by assemble_video. ` +
      (provider.durations ? `Allowed durations: ${provider.durations.join(", ")} seconds (your request is snapped to the nearest). ` : "Durations: 2-10 seconds. ") +
      `Budget left is reported in every result; plan shots so the total fits.`,
    {
      name: z.string().min(1).max(60).describe("Short slug for the file name, e.g. 'opening-street'"),
      prompt: z.string().min(10).max(1000).describe("The visual prompt for this shot"),
      duration_seconds: z.number().min(2).max(10).describe("Wanted length of the shot"),
      negative_prompt: z.string().max(500).optional().describe("What to avoid (text, blur, extra limbs...)"),
      audio: z.boolean().default(true).describe("Ask the model for ambient sound where supported"),
      seed: z.number().int().optional(),
    },
    async (args) => {
      const wanted = provider.durations ? [...provider.durations].sort((a, b) => Math.abs(a - args.duration_seconds) - Math.abs(b - args.duration_seconds))[0] : Math.round(args.duration_seconds);
      if (budget.usedClips + 1 > budget.maxClips) return fail(`Clip budget reached (${budget.maxClips} clips). Assemble with what you have, or reuse clips with trims.`);
      if (budget.usedSeconds + wanted > budget.maxClipSeconds) return fail(`Footage budget reached (${budget.maxClipSeconds}s). You have ${budget.maxClipSeconds - budget.usedSeconds}s left.`);
      const file = path.join(workDir, "clips", `${String(budget.usedClips + 1).padStart(2, "0")}-${slug(args.name)}.mp4`);
      say(`generating clip ${budget.usedClips + 1}: "${args.prompt.slice(0, 70)}" (${wanted}s, ${provider.name})`);
      try {
        const started = Date.now();
        const res = await provider.generateClip({ prompt: args.prompt, negativePrompt: args.negative_prompt, durationSeconds: wanted, aspect: ctx.aspect, audio: args.audio, seed: args.seed, outPath: file });
        const info = await probe(res.path);
        budget.usedClips += 1;
        budget.usedSeconds += info.durationSeconds;
        say(`clip ready: ${path.relative(workDir, res.path)} (${info.durationSeconds}s, ${Math.round((Date.now() - started) / 1000)}s wait)`);
        return ok({
          path: path.relative(workDir, res.path),
          duration_seconds: info.durationSeconds,
          width: info.width,
          height: info.height,
          has_audio: info.hasAudio,
          model: res.model,
          cost: res.costNote,
          budget_left: { clips: budget.maxClips - budget.usedClips, seconds: Math.round((budget.maxClipSeconds - budget.usedSeconds) * 10) / 10 },
        });
      } catch (err) {
        fs.rmSync(file, { force: true });
        return fail(`generate_clip failed: ${(err as Error).message}`);
      }
    },
  );

  const generateVoiceover = tool(
    "generate_voiceover",
    provider.generateVoiceover
      ? "Turn a narration script into speech (saved in audio/). Write it the way a person talks: short sentences, about 2.5 words per second of video."
      : "Voiceover is not available with the current footage provider. Do not call this; make the video work with captions and music.",
    {
      text: z.string().min(1).max(5000).describe("The full narration script"),
      voice: z.string().optional().describe("Voice name supported by the provider; leave empty for the default"),
      name: z.string().min(1).max(60).default("voiceover"),
    },
    async (args) => {
      if (!provider.generateVoiceover) return fail("This provider cannot generate voiceover.");
      const file = path.join(workDir, "audio", `${slug(args.name)}.mp3`);
      say(`generating voiceover (${args.text.split(/\s+/).length} words)`);
      try {
        const res = await provider.generateVoiceover({ text: args.text, voice: args.voice, outPath: file });
        const info = await probe(res.path);
        return ok({ path: path.relative(workDir, res.path), duration_seconds: info.durationSeconds, model: res.model });
      } catch (err) {
        return fail(`generate_voiceover failed: ${(err as Error).message}`);
      }
    },
  );

  const generateMusic = tool(
    "generate_music",
    provider.generateMusic
      ? "Generate a background music track (saved in audio/). Describe genre, mood, tempo and instruments. assemble_video loops or trims it to fit and fades it out."
      : "Music generation is not available with the current footage provider. Do not call this.",
    {
      prompt: z.string().min(5).max(2000),
      duration_seconds: z.number().min(5).max(180).describe("Roughly the video length"),
      instrumental: z.boolean().default(true),
      name: z.string().min(1).max(60).default("music"),
    },
    async (args) => {
      if (!provider.generateMusic) return fail("This provider cannot generate music.");
      const file = path.join(workDir, "audio", `${slug(args.name)}.mp3`);
      say(`generating music: "${args.prompt.slice(0, 60)}"`);
      try {
        const res = await provider.generateMusic({ prompt: args.prompt, durationSeconds: args.duration_seconds, instrumental: args.instrumental, outPath: file });
        const info = await probe(res.path);
        return ok({ path: path.relative(workDir, res.path), duration_seconds: info.durationSeconds, model: res.model });
      } catch (err) {
        return fail(`generate_music failed: ${(err as Error).message}`);
      }
    },
  );

  const probeMedia = tool(
    "probe_media",
    "Read duration, size and streams of a video or audio file in the job folder.",
    { path: z.string() },
    async (args) => {
      try {
        const info = await probe(inside(workDir, args.path));
        return ok({ ...info, path: path.relative(workDir, info.path) });
      } catch (err) {
        return fail((err as Error).message);
      }
    },
    { annotations: { readOnlyHint: true } },
  );

  const assembleVideo = tool(
    "assemble_video",
    "Cut the clips together in order into one mp4: every clip is scaled to the canvas, captions are burned in, " +
      "voiceover and music are mixed under the clips' own sound, and the result is probed. Call it again with changes if the contact sheet shows a problem.",
    {
      segments: z
        .array(
          z.object({
            clip: z.string().describe("Path returned by generate_clip (relative to the job folder)"),
            caption: z.string().max(90).optional().describe("One short line shown while this clip plays; leave empty for none"),
            trim_start: z.number().min(0).optional().describe("Seconds into the clip to start"),
            trim_end: z.number().min(0).optional().describe("Seconds into the clip to stop (absolute)"),
          }),
        )
        .min(1),
      output: z.string().default("final.mp4").describe("Output file name, relative to the job folder"),
      voiceover: z.string().optional().describe("Path from generate_voiceover"),
      voiceover_start: z.number().min(0).default(0.3).describe("Seconds before the narration starts"),
      music: z.string().optional().describe("Path from generate_music"),
      music_volume: z.number().min(0).max(1).default(0.18),
      keep_clip_audio: z.boolean().default(true).describe("Keep the ambience/foley the video model generated"),
      caption_position: z.enum(["low", "center", "high"]).default("low"),
      caption_uppercase: z.boolean().default(false),
    },
    async (args) => {
      try {
        say(`assembling ${args.segments.length} segments into ${args.output}`);
        const res = await assemble({
          segments: args.segments.map((s) => ({ clip: inside(workDir, s.clip), caption: s.caption, trimStart: s.trim_start, trimEnd: s.trim_end })),
          aspect: ctx.aspect,
          output: inside(workDir, args.output),
          workDir,
          voiceover: args.voiceover ? inside(workDir, args.voiceover) : undefined,
          voiceoverStart: args.voiceover_start,
          music: args.music ? inside(workDir, args.music) : undefined,
          musicVolume: args.music_volume,
          keepClipAudio: args.keep_clip_audio,
          captionStyle: { position: args.caption_position, uppercase: args.caption_uppercase },
        });
        say(`assembled ${path.relative(workDir, res.path)}: ${res.durationSeconds}s, ${res.width}x${res.height}`);
        return ok({
          path: path.relative(workDir, res.path),
          duration_seconds: res.durationSeconds,
          width: res.width,
          height: res.height,
          megabytes: Math.round((res.bytes / 1048576) * 10) / 10,
          timeline: res.segments.map((s) => ({ ...s, clip: path.relative(workDir, s.clip) })),
        });
      } catch (err) {
        return fail(`assemble_video failed: ${(err as Error).message}`);
      }
    },
  );

  const sheet = tool(
    "contact_sheet",
    "Make a PNG strip of evenly spaced frames from a video, then look at it with the Read tool to check framing, caption overlap and pacing.",
    { video: z.string().default("final.mp4"), frames: z.number().int().min(2).max(12).default(6), output: z.string().default("contact-sheet.png") },
    async (args) => {
      try {
        const res = await contactSheet(inside(workDir, args.video), inside(workDir, args.output), args.frames);
        return ok({ path: path.relative(workDir, res.path), frames: res.frames, seconds_per_frame: res.secondsPerFrame, hint: "Open it with Read." });
      } catch (err) {
        return fail(`contact_sheet failed: ${(err as Error).message}`);
      }
    },
  );

  return [generateClip, generateVoiceover, generateMusic, probeMedia, assembleVideo, sheet];
}

export function createVideoTools(ctx: ToolContext) {
  return createSdkMcpServer({ name: "video", version: "0.1.0", tools: videoToolDefinitions(ctx) });
}

export const TOOL_ASPECTS = ASPECTS;
