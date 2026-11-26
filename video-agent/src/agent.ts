// Wires the brief, the tools and the Claude Agent SDK together.
import { query, type Options, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import fs from "node:fs";
import path from "node:path";
import { pickProvider } from "./providers/index.js";
import type { Aspect } from "./providers/types.js";
import { systemPrompt } from "./prompt.js";
import { createVideoTools, type Budget } from "./tools.js";

export type JobOptions = {
  brief: string;
  aspect: Aspect;
  targetSeconds: number;
  outDir: string;
  provider?: string;
  captions: boolean;
  voiceover: boolean;
  music: boolean;
  model: string;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  maxTurns: number;
  maxBudgetUsd?: number;
  maxClips: number;
  maxClipSeconds: number;
  onEvent?: (line: string) => void;
};

export type JobResult = {
  outDir: string;
  finalVideo: string | null;
  report: string;
  costUsd: number | null;
  turns: number;
  budget: Budget;
  error?: string;
};

/** Builds the query. Separate from run() so tests and other front-ends can reuse it. */
export function buildJob(opts: JobOptions) {
  const provider = pickProvider(opts.provider);
  const workDir = path.resolve(opts.outDir);
  fs.mkdirSync(workDir, { recursive: true });
  fs.writeFileSync(path.join(workDir, "brief.txt"), opts.brief + "\n");
  const budget: Budget = { maxClips: opts.maxClips, maxClipSeconds: opts.maxClipSeconds, usedClips: 0, usedSeconds: 0 };
  const server = createVideoTools({ provider, workDir, aspect: opts.aspect, budget, onEvent: opts.onEvent });

  const options: Options = {
    cwd: workDir,
    model: opts.model,
    effort: opts.effort,
    systemPrompt: systemPrompt({
      text: opts.brief,
      aspect: opts.aspect,
      targetSeconds: opts.targetSeconds,
      captions: opts.captions,
      voiceover: opts.voiceover && !!provider.generateVoiceover,
      music: opts.music && !!provider.generateMusic,
      providerName: provider.name,
      clipDurations: provider.durations,
      maxClips: opts.maxClips,
      maxClipSeconds: opts.maxClipSeconds,
    }),
    // Only these tools exist for the agent; of those, only the listed forms are pre-approved.
    // "dontAsk" denies everything else (any other Bash command, for instance) without ever prompting a human.
    tools: ["Read", "Write", "Glob", "Bash"],
    allowedTools: ["Read", "Write", "Glob", "Bash(ffmpeg *)", "Bash(ffprobe *)", "mcp__video__*"],
    permissionMode: "dontAsk",
    mcpServers: { video: server },
    settingSources: [],
    maxTurns: opts.maxTurns,
    maxBudgetUsd: opts.maxBudgetUsd,
    persistSession: false,
  };

  const prompt = `Brief: ${opts.brief}\n\nFormat: ${opts.aspect}, about ${opts.targetSeconds} seconds.${opts.captions ? " Burn in captions." : " No captions."}${opts.voiceover ? " Add a voiceover." : ""}${opts.music ? " Add music." : ""}\n\nMake the video now and end with the report.`;
  return { provider, workDir, budget, run: () => query({ prompt, options }) };
}

/** Runs a job to completion, streaming progress through onMessage. */
export async function runJob(opts: JobOptions, onMessage?: (m: SDKMessage) => void): Promise<JobResult> {
  const job = buildJob(opts);
  let report = "";
  let costUsd: number | null = null;
  let turns = 0;
  let error: string | undefined;
  try {
    for await (const message of job.run()) {
      onMessage?.(message);
      if (message.type === "result") {
        costUsd = message.total_cost_usd ?? null;
        turns = message.num_turns;
        if (message.subtype === "success") report = message.result;
        else error = `${message.subtype}${"errors" in message && message.errors?.length ? ": " + message.errors.join("; ") : ""}`;
      }
    }
  } catch (err) {
    // The SDK also throws after an error result (turn cap, budget cap, API failure); keep what we have.
    error = error ?? (err instanceof Error ? err.message : String(err));
  }
  const finalVideo = path.join(job.workDir, "final.mp4");
  return { outDir: job.workDir, finalVideo: fs.existsSync(finalVideo) ? finalVideo : null, report, costUsd, turns, budget: job.budget, error };
}
