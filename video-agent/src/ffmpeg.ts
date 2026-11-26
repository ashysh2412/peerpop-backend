// Thin wrappers around the ffmpeg and ffprobe binaries on PATH.
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const FFMPEG = process.env.FFMPEG_PATH ?? "ffmpeg";
const FFPROBE = process.env.FFPROBE_PATH ?? "ffprobe";

export class FfmpegError extends Error {
  constructor(message: string, readonly args: string[], readonly stderr: string) {
    super(message);
  }
}

/** Runs ffmpeg quietly; on failure the last lines of stderr are in the error. */
export async function ffmpeg(args: string[]) {
  try {
    await exec(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...args], { maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    const e = err as { stderr?: string; message?: string };
    const tail = (e.stderr ?? "").trim().split("\n").slice(-12).join("\n");
    throw new FfmpegError(`ffmpeg failed: ${tail || e.message}`, args, e.stderr ?? "");
  }
}

export type MediaInfo = {
  path: string;
  durationSeconds: number;
  width: number | null;
  height: number | null;
  fps: number | null;
  hasVideo: boolean;
  hasAudio: boolean;
  bytes: number;
};

type ProbeStream = { codec_type?: string; width?: number; height?: number; r_frame_rate?: string; duration?: string };
type ProbeOut = { streams?: ProbeStream[]; format?: { duration?: string; size?: string } };

export async function probe(file: string): Promise<MediaInfo> {
  let out: string;
  try {
    ({ stdout: out } = await exec(FFPROBE, ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file]));
  } catch (err) {
    const e = err as { stderr?: string; message?: string };
    throw new Error(`ffprobe failed for ${file}: ${(e.stderr ?? e.message ?? "").trim().split("\n").slice(-3).join(" ")}`);
  }
  const data = JSON.parse(out) as ProbeOut;
  const video = data.streams?.find((s) => s.codec_type === "video");
  const audio = data.streams?.find((s) => s.codec_type === "audio");
  const duration = Number(data.format?.duration ?? video?.duration ?? audio?.duration ?? 0);
  let fps: number | null = null;
  if (video?.r_frame_rate) {
    const [n, d] = video.r_frame_rate.split("/").map(Number);
    if (n && d) fps = Math.round((n / d) * 100) / 100;
  }
  return {
    path: file,
    durationSeconds: Math.round(duration * 1000) / 1000,
    width: video?.width ?? null,
    height: video?.height ?? null,
    fps,
    hasVideo: !!video,
    hasAudio: !!audio,
    bytes: Number(data.format?.size ?? 0),
  };
}

/** Escapes a value for use inside an ffmpeg filter option (e.g. a file path in `ass=...`). */
export function filterEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'").replace(/\[/g, "\\[").replace(/\]/g, "\\]").replace(/,/g, "\\,").replace(/;/g, "\;");
}
