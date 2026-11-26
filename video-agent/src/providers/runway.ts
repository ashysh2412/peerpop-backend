// Runway's API (https://docs.dev.runwayml.com) fronts several video models under one key:
// Runway Gen-4.5, Google Veo 3.1 (+ fast), Kling, Hailuo, Seedance... plus ElevenLabs voices and music.
import RunwayML from "@runwayml/sdk";
import { downloadTo } from "../download.js";
import { snapDuration, type Aspect, type ClipProvider, type ClipRequest, type MusicRequest, type VoiceoverRequest } from "./types.js";

const TASK_TIMEOUT_MS = 15 * 60 * 1000;

/** Models whose request shape we know; anything else is passed through with a best guess. */
const MODEL_RULES: Record<string, { durations?: readonly number[]; ratios: Record<Aspect, string>; audio: boolean }> = {
  "gen4.5": { ratios: { "9:16": "720:1280", "16:9": "1280:720", "1:1": "1280:720" }, audio: false },
  "veo3.1": { durations: [4, 6, 8], ratios: { "9:16": "1080:1920", "16:9": "1920:1080", "1:1": "1920:1080" }, audio: true },
  "veo3.1_fast": { durations: [4, 6, 8], ratios: { "9:16": "1080:1920", "16:9": "1920:1080", "1:1": "1920:1080" }, audio: true },
};
const DEFAULT_RULE = { ratios: { "9:16": "720:1280", "16:9": "1280:720", "1:1": "1280:720" } as Record<Aspect, string>, audio: true };

export function runwayProvider(opts: { apiKey?: string; model?: string; voice?: string } = {}): ClipProvider {
  const apiKey = opts.apiKey ?? process.env.RUNWAYML_API_SECRET;
  if (!apiKey) throw new Error("RUNWAYML_API_SECRET is not set. Create a key at https://dev.runwayml.com and put it in video-agent/.env");
  const client = new RunwayML({ apiKey });
  const model = opts.model ?? process.env.RUNWAY_VIDEO_MODEL ?? "veo3.1_fast";
  const rule = MODEL_RULES[model] ?? DEFAULT_RULE;
  const voice = opts.voice ?? process.env.RUNWAY_VOICE ?? "Arjun";

  return {
    name: `runway/${model}`,
    durations: rule.durations,
    async generateClip(req: ClipRequest) {
      const duration = rule.durations ? snapDuration(req.durationSeconds, rule.durations) : Math.min(10, Math.max(2, Math.round(req.durationSeconds)));
      const body: Record<string, unknown> = { model, promptText: req.prompt.slice(0, 1000), ratio: rule.ratios[req.aspect], duration };
      if (rule.audio) body.audio = req.audio;
      if (req.negativePrompt && model.startsWith("veo")) body.negativePrompt = req.negativePrompt;
      if (req.seed !== undefined) body.seed = req.seed;
      const task = await client.textToVideo.create(body as unknown as RunwayML.TextToVideoCreateParams).waitForTaskOutput({ timeout: TASK_TIMEOUT_MS });
      const url = task.output[0];
      if (!url) throw new Error(`Runway task ${task.id} succeeded but returned no output`);
      await downloadTo(url, req.outPath);
      return { path: req.outPath, model: `runway/${model}`, durationSeconds: duration, audio: rule.audio && req.audio, costNote: `${task.cost.credits} credits` };
    },
    async generateVoiceover(req: VoiceoverRequest) {
      const task = await client.textToSpeech
        .create({ model: "eleven_v4", promptText: req.text.slice(0, 5000), voice: { type: "runway-preset", presetId: (req.voice ?? voice) as never } })
        .waitForTaskOutput({ timeout: TASK_TIMEOUT_MS });
      await downloadTo(task.output[0], req.outPath);
      return { path: req.outPath, model: "runway/eleven_v4" };
    },
    async generateMusic(req: MusicRequest) {
      const task = await client.textToMusic
        .create({ model: "eleven_music_v2_5", promptText: req.prompt.slice(0, 2000), duration: Math.round(req.durationSeconds), instrumental: req.instrumental })
        .waitForTaskOutput({ timeout: TASK_TIMEOUT_MS });
      await downloadTo(task.output[0], req.outPath);
      return { path: req.outPath, model: "runway/eleven_music_v2_5" };
    },
  };
}
