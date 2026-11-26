import fs from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

/** Streams a URL to disk. Provider result URLs expire, so callers download right away. */
export async function downloadTo(url: string, outPath: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, { headers, redirect: "follow" });
  if (!res.ok || !res.body) throw new Error(`Download failed (${res.status}) for ${url.split("?")[0]}`);
  await pipeline(Readable.fromWeb(res.body as import("stream/web").ReadableStream), fs.createWriteStream(outPath));
  return outPath;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
