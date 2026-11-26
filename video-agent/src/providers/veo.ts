// Google Veo through the Gemini API (https://ai.google.dev/gemini-api/docs/video).
// Veo 3.x clips are 4, 6 or 8 seconds, 16:9 or 9:16, and come with generated sound.
import { GoogleGenAI } from "@google/genai";
import { sleep } from "../download.js";
import { snapDuration, type ClipProvider, type ClipRequest } from "./types.js";

const DURATIONS = [4, 6, 8] as const;
const POLL_MS = 10_000;
const TIMEOUT_MS = 15 * 60 * 1000;

export function veoProvider(opts: { apiKey?: string; model?: string } = {}): ClipProvider {
  const apiKey = opts.apiKey ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set. Create one at https://aistudio.google.com/apikey and put it in video-agent/.env");
  const ai = new GoogleGenAI({ apiKey });
  const model = opts.model ?? process.env.VEO_MODEL ?? "veo-3.1-fast-generate-preview";

  return {
    name: `veo/${model}`,
    durations: DURATIONS,
    async generateClip(req: ClipRequest) {
      const durationSeconds = snapDuration(req.durationSeconds, DURATIONS);
      let op = await ai.models.generateVideos({
        model,
        prompt: req.prompt,
        config: {
          numberOfVideos: 1,
          durationSeconds,
          aspectRatio: req.aspect === "9:16" ? "9:16" : "16:9",
          resolution: "1080p",
          negativePrompt: req.negativePrompt,
          seed: req.seed,
        },
      });
      const started = Date.now();
      while (!op.done) {
        if (Date.now() - started > TIMEOUT_MS) throw new Error(`Veo operation ${op.name} did not finish within ${TIMEOUT_MS / 60000} minutes`);
        await sleep(POLL_MS);
        op = await ai.operations.getVideosOperation({ operation: op });
      }
      if (op.error) throw new Error(`Veo failed: ${JSON.stringify(op.error)}`);
      const video = op.response?.generatedVideos?.[0]?.video;
      if (!video) {
        const why = op.response?.raiMediaFilteredReasons?.join("; ");
        throw new Error(why ? `Veo filtered the clip: ${why}. Rephrase the prompt.` : "Veo returned no video");
      }
      await ai.files.download({ file: video, downloadPath: req.outPath });
      return { path: req.outPath, model: `veo/${model}`, durationSeconds, audio: true };
    },
  };
}
