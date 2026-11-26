// Mock footage: a labelled test pattern with a soft tone, rendered by ffmpeg.
// Lets you run and test the whole agent without paying for a single real clip.
import fs from "node:fs";
import path from "node:path";
import { ffmpeg } from "../ffmpeg.js";
import { canvasFor, snapDuration, type ClipProvider, type ClipRequest } from "./types.js";

const DURATIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

function hue(text: string) {
  let h = 0;
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export const mockProvider: ClipProvider = {
  name: "mock",
  durations: DURATIONS,
  async generateClip(req: ClipRequest) {
    const d = snapDuration(req.durationSeconds, DURATIONS);
    const { width, height } = canvasFor(req.aspect);
    // Small render; the assembler scales everything to the canvas anyway.
    const w = Math.round(width / 3), h = Math.round(height / 3);
    const textFile = req.outPath + ".txt";
    fs.writeFileSync(textFile, req.prompt.slice(0, 36) + (req.prompt.length > 36 ? "…" : ""));
    const bg = `0x${hsvToHex(hue(req.prompt))}`;
    const audio = req.audio ? ["-f", "lavfi", "-i", `sine=frequency=${220 + hue(req.prompt)}:duration=${d}`] : [];
    await ffmpeg([
      "-f", "lavfi", "-i", `color=c=${bg}:size=${w}x${h}:rate=30:duration=${d}`,
      ...audio,
      "-vf", `drawtext=textfile='${textFile.replace(/'/g, "\\'")}':fontcolor=white:fontsize=${Math.round(h / 24)}:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.4:boxborderw=12`,
      "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
      ...(req.audio ? ["-c:a", "aac", "-shortest"] : ["-an"]),
      req.outPath,
    ]);
    fs.rmSync(textFile, { force: true });
    return { path: req.outPath, model: "mock", durationSeconds: d, audio: req.audio, costNote: "free" };
  },
  async generateVoiceover({ text, outPath }) {
    // About 2.6 words per second of speech, as a hum so timings are realistic.
    const d = Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 2.6));
    await ffmpeg(["-f", "lavfi", "-i", `sine=frequency=160:duration=${d}`, "-af", "volume=0.4", "-c:a", audioCodec(outPath), outPath]);
    return { path: outPath, model: "mock" };
  },
  async generateMusic({ durationSeconds, outPath }) {
    await ffmpeg(["-f", "lavfi", "-i", `sine=frequency=110:duration=${durationSeconds}`, "-af", "tremolo=f=2:d=0.6,volume=0.5", "-c:a", audioCodec(outPath), outPath]);
    return { path: outPath, model: "mock" };
  },
};

/** The audio encoder that matches the container the caller asked for. */
function audioCodec(file: string) {
  const ext = path.extname(file).toLowerCase();
  return ext === ".mp3" ? "libmp3lame" : ext === ".wav" ? "pcm_s16le" : "aac";
}

function hsvToHex(h: number, s = 0.55, v = 0.4) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r, g, b].map((n) => Math.round((n + m) * 255).toString(16).padStart(2, "0")).join("");
}

export const _internal = { hue, hsvToHex, audioCodec };
