#!/usr/bin/env node
// video-agent: one brief in, one finished mp4 out.
import path from "node:path";
import { PACKAGE_DIR, envInt, loadDotEnv } from "./env.js";
import { PROVIDER_NAMES } from "./providers/index.js";
import { ASPECTS, type Aspect } from "./providers/types.js";
import { runJob } from "./agent.js";

export type CliArgs = {
  brief: string;
  aspect: Aspect;
  duration: number;
  provider?: string;
  out?: string;
  model: string;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  captions: boolean;
  voiceover: boolean;
  music: boolean;
  maxClips?: number;
  maxClipSeconds?: number;
  maxTurns: number;
  budgetUsd?: number;
  help: boolean;
};

export const USAGE = `Usage: npm start -- "<brief>" [options]

  --aspect 9:16|16:9|1:1      canvas (default 9:16)
  --duration <seconds>        target length (default 30)
  --provider mock|runway|veo  footage model (default $VIDEO_PROVIDER or mock)
  --out <dir>                 job folder (default out/<date>-<slug>)
  --model <id>                Claude model for the agent (default claude-opus-5-5)
  --effort low|medium|high|xhigh|max
  --no-captions               do not burn captions
  --voiceover                 add narration (needs a provider with text-to-speech, e.g. runway)
  --music                     add a generated music bed (runway or mock)
  --max-clips <n>             footage budget, clips (default $MAX_CLIPS or 10)
  --max-clip-seconds <n>      footage budget, seconds (default $MAX_CLIP_SECONDS or 80)
  --max-turns <n>             agent turn cap (default 60)
  --budget-usd <n>            stop the agent past this estimated Claude spend
  -h, --help

Example:
  npm start -- "30s ad for a Pune chai cafe opening, warm and funny" --aspect 9:16 --provider runway --music`;

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { brief: "", aspect: "9:16", duration: 30, model: "claude-opus-5-5", captions: true, voiceover: false, music: false, maxTurns: 60, help: false };
  const positional: string[] = [];
  const need = (flag: string, i: number) => {
    const v = argv[i];
    if (v === undefined || v.startsWith("--")) throw new Error(`${flag} needs a value`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "-h": case "--help": args.help = true; break;
      case "--aspect": {
        const v = need(a, ++i) as Aspect;
        if (!ASPECTS.includes(v)) throw new Error(`--aspect must be one of ${ASPECTS.join(", ")}`);
        args.aspect = v; break;
      }
      case "--duration": args.duration = positiveNumber(a, need(a, ++i)); break;
      case "--provider": {
        const v = need(a, ++i);
        if (!(PROVIDER_NAMES as readonly string[]).includes(v)) throw new Error(`--provider must be one of ${PROVIDER_NAMES.join(", ")}`);
        args.provider = v; break;
      }
      case "--out": args.out = need(a, ++i); break;
      case "--model": args.model = need(a, ++i); break;
      case "--effort": {
        const v = need(a, ++i);
        if (!["low", "medium", "high", "xhigh", "max"].includes(v)) throw new Error("--effort must be low, medium, high, xhigh or max");
        args.effort = v as CliArgs["effort"]; break;
      }
      case "--no-captions": args.captions = false; break;
      case "--captions": args.captions = true; break;
      case "--voiceover": args.voiceover = true; break;
      case "--music": args.music = true; break;
      case "--max-clips": args.maxClips = positiveNumber(a, need(a, ++i)); break;
      case "--max-clip-seconds": args.maxClipSeconds = positiveNumber(a, need(a, ++i)); break;
      case "--max-turns": args.maxTurns = positiveNumber(a, need(a, ++i)); break;
      case "--budget-usd": args.budgetUsd = positiveNumber(a, need(a, ++i)); break;
      default:
        if (a.startsWith("--")) throw new Error(`Unknown option ${a}`);
        positional.push(a);
    }
  }
  args.brief = positional.join(" ").trim();
  if (!args.help && !args.brief) throw new Error("Give the brief as the first argument, in quotes.");
  return args;
}

function positiveNumber(flag: string, raw: string) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${flag} needs a positive number`);
  return n;
}

export function defaultOutDir(brief: string, now = new Date()) {
  const stamp = now.toISOString().slice(0, 16).replace(/[-:]/g, "").replace("T", "-");
  const slug = brief.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "video";
  return path.join(PACKAGE_DIR, "out", `${stamp}-${slug}`);
}

async function main() {
  loadDotEnv();
  let args: CliArgs;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error((err as Error).message + "\n\n" + USAGE);
    process.exit(2);
  }
  if (args.help) {
    console.log(USAGE);
    return;
  }
  const outDir = args.out ? path.resolve(args.out) : defaultOutDir(args.brief);
  const log = (line: string) => console.error(`\x1b[2m[${new Date().toLocaleTimeString()}]\x1b[0m ${line}`);
  log(`job folder: ${outDir}`);

  const result = await runJob(
    {
      brief: args.brief,
      aspect: args.aspect,
      targetSeconds: args.duration,
      outDir,
      provider: args.provider,
      captions: args.captions,
      voiceover: args.voiceover,
      music: args.music,
      model: args.model,
      effort: args.effort,
      maxTurns: args.maxTurns,
      maxBudgetUsd: args.budgetUsd,
      maxClips: args.maxClips ?? envInt("MAX_CLIPS", 10),
      maxClipSeconds: args.maxClipSeconds ?? envInt("MAX_CLIP_SECONDS", 80),
      onEvent: log,
    },
    (m) => {
      if (m.type === "assistant") {
        for (const block of m.message.content) {
          if (block.type === "text" && block.text.trim()) console.log(`\n${block.text.trim()}\n`);
          else if (block.type === "tool_use") log(`→ ${block.name.replace("mcp__video__", "")} ${summarize(block.input)}`);
        }
      } else if (m.type === "system" && m.subtype === "init") {
        log(`agent started (model ${m.model}, ${m.tools.length} tools)`);
      }
    },
  );

  console.log("\n" + "=".repeat(60));
  if (result.error) console.log(`Agent stopped early: ${result.error}`);
  console.log(result.finalVideo ? `Video: ${result.finalVideo}` : "No final.mp4 was produced.");
  console.log(`Job folder: ${result.outDir}`);
  console.log(`Footage used: ${result.budget.usedClips} clips, ${Math.round(result.budget.usedSeconds)}s${result.costUsd !== null ? `; Claude cost about $${result.costUsd.toFixed(2)}` : ""}; ${result.turns} turns`);
  process.exit(result.finalVideo ? 0 : 1);
}

function summarize(input: unknown) {
  if (!input || typeof input !== "object") return "";
  const o = input as Record<string, unknown>;
  const key = ["name", "prompt", "output", "video", "path", "file_path", "command", "pattern"].find((k) => typeof o[k] === "string");
  const value = key ? String(o[key]) : JSON.stringify(input);
  return value.length > 90 ? value.slice(0, 87) + "..." : value;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) main().catch((err) => { console.error(err instanceof Error ? err.message : err); process.exit(1); });
