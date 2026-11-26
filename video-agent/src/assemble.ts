// Turns generated clips into one finished mp4: normalise, concatenate, mix audio, burn captions.
import fs from "node:fs";
import path from "node:path";
import { buildAss, type CaptionCue, type CaptionStyle } from "./captions.js";
import { PACKAGE_DIR } from "./env.js";
import { ffmpeg, filterEscape, probe, type MediaInfo } from "./ffmpeg.js";
import { canvasFor, type Aspect } from "./providers/types.js";

export type Segment = {
  clip: string;
  caption?: string;
  /** Seconds into the clip to start from. */
  trimStart?: number;
  /** Seconds into the clip to stop at (absolute, not a length). */
  trimEnd?: number;
};

export type AssembleOptions = {
  segments: Segment[];
  aspect: Aspect;
  output: string;
  workDir: string;
  voiceover?: string;
  voiceoverStart?: number;
  music?: string;
  musicVolume?: number;
  keepClipAudio?: boolean;
  /** Volume of the clips' own sound; defaults to 1, or 0.3 under a voiceover. */
  clipAudioVolume?: number;
  captions?: boolean;
  captionStyle?: Partial<CaptionStyle>;
  fps?: number;
};

export type AssembleResult = MediaInfo & { segments: { clip: string; start: number; end: number; caption?: string }[]; captionsFile?: string };

export const FONTS_DIR = path.join(PACKAGE_DIR, "assets", "fonts");

export async function assemble(opts: AssembleOptions): Promise<AssembleResult> {
  if (!opts.segments.length) throw new Error("assemble needs at least one segment");
  const { width, height } = canvasFor(opts.aspect);
  const fps = opts.fps ?? 30;
  const work = path.join(opts.workDir, ".assemble");
  fs.mkdirSync(work, { recursive: true });

  // 1. Normalise every clip to the same canvas, frame rate and audio layout so concat is lossless and safe.
  const timeline: AssembleResult["segments"] = [];
  const parts: string[] = [];
  let cursor = 0;
  for (const [i, seg] of opts.segments.entries()) {
    if (!fs.existsSync(seg.clip)) throw new Error(`Clip not found: ${seg.clip}`);
    const info = await probe(seg.clip);
    if (!info.hasVideo) throw new Error(`${seg.clip} has no video stream`);
    const start = Math.max(0, seg.trimStart ?? 0);
    const end = Math.min(info.durationSeconds, seg.trimEnd ?? info.durationSeconds);
    const length = Math.round((end - start) * 1000) / 1000;
    if (length <= 0.2) throw new Error(`Segment ${i + 1} (${path.basename(seg.clip)}) would be ${length}s long; check trimStart/trimEnd`);
    const out = path.join(work, `seg-${String(i).padStart(2, "0")}.mp4`);
    const useOwnAudio = info.hasAudio && (opts.keepClipAudio ?? true);
    await ffmpeg([
      "-ss", String(start), "-t", String(length), "-i", seg.clip,
      ...(useOwnAudio ? [] : ["-f", "lavfi", "-t", String(length), "-i", "anullsrc=r=48000:cl=stereo"]),
      "-filter_complex",
      `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fps=${fps},format=yuv420p[v];` +
        `[${useOwnAudio ? "0:a" : "1:a"}]aresample=48000,aformat=channel_layouts=stereo,apad[a]`,
      "-map", "[v]", "-map", "[a]", "-t", String(length),
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
      out,
    ]);
    parts.push(out);
    timeline.push({ clip: seg.clip, start: cursor, end: cursor + length, caption: seg.caption });
    cursor += length;
  }
  const total = Math.round(cursor * 1000) / 1000;

  // 2. Concatenate.
  const list = path.join(work, "list.txt");
  fs.writeFileSync(list, parts.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n") + "\n");
  const joined = path.join(work, "joined.mp4");
  await ffmpeg(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", joined]);

  // 3. Captions.
  const cues: CaptionCue[] = timeline.filter((t) => t.caption).map((t) => ({ start: t.start, end: t.end - 0.05, text: t.caption! }));
  let captionsFile: string | undefined;
  if ((opts.captions ?? true) && cues.length) {
    captionsFile = path.join(work, "captions.ass");
    fs.writeFileSync(captionsFile, buildAss(cues, opts.aspect, opts.captionStyle));
  }

  // 4. Final pass: mix voiceover and music under the clips, burn captions, encode once.
  const inputs = ["-i", joined];
  const filters: string[] = [];
  const mixIn: string[] = [];
  const clipVol = opts.clipAudioVolume ?? (opts.voiceover ? 0.3 : 1);
  filters.push(`[0:a]volume=${clipVol}[a0]`);
  mixIn.push("[a0]");
  let n = 1;
  if (opts.voiceover) {
    if (!fs.existsSync(opts.voiceover)) throw new Error(`Voiceover not found: ${opts.voiceover}`);
    inputs.push("-i", opts.voiceover);
    const delay = Math.round((opts.voiceoverStart ?? 0) * 1000);
    filters.push(`[${n}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${delay}|${delay},apad[a${n}]`);
    mixIn.push(`[a${n}]`);
    n++;
  }
  if (opts.music) {
    if (!fs.existsSync(opts.music)) throw new Error(`Music not found: ${opts.music}`);
    inputs.push("-stream_loop", "-1", "-i", opts.music);
    const fade = Math.min(2, total / 4);
    filters.push(`[${n}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:${total},volume=${opts.musicVolume ?? 0.2},afade=t=out:st=${Math.max(0, total - fade)}:d=${fade}[a${n}]`);
    mixIn.push(`[a${n}]`);
    n++;
  }
  filters.push(`${mixIn.join("")}amix=inputs=${mixIn.length}:duration=first:normalize=0,alimiter=limit=0.95[aout]`);
  const vf = captionsFile ? ["-vf", `ass=${filterEscape(captionsFile)}:fontsdir=${filterEscape(FONTS_DIR)}`] : [];
  fs.mkdirSync(path.dirname(opts.output), { recursive: true });
  await ffmpeg([
    ...inputs,
    "-filter_complex", filters.join(";"),
    ...vf,
    "-map", "0:v", "-map", "[aout]", "-t", String(total),
    "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    "-c:a", "aac", "-b:a", "192k",
    opts.output,
  ]);
  const info = await probe(opts.output);
  return { ...info, segments: timeline, captionsFile };
}

/** One row of evenly spaced frames, so the agent (or you) can eyeball the whole video at once. */
export async function contactSheet(video: string, output: string, frames = 6) {
  const info = await probe(video);
  const every = Math.max(0.1, info.durationSeconds / frames);
  const w = info.width && info.height && info.width > info.height ? 480 : 270;
  await ffmpeg(["-i", video, "-vf", `fps=1/${every},scale=${w}:-2,tile=${frames}x1`, "-frames:v", "1", "-update", "1", output]);
  return { path: output, frames, secondsPerFrame: Math.round(every * 100) / 100 };
}
