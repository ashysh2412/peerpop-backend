# video-agent

A command-line agent that turns a one-line brief into a finished short video. You type the idea; the agent plans the shots, generates the footage with a text-to-video model, writes captions (and optionally a voiceover and music), cuts everything together with ffmpeg, checks its own work from a contact sheet, and hands you an mp4 plus a short report.

It is built on the [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk): Claude runs the loop, and six custom tools do the video work. It is standalone: nothing here imports from the Peerpop app, so the folder can be moved into its own repository as-is.

```
brief ──▶ Claude (director) ──▶ storyboard.md
                │
                ├─▶ generate_clip ×N  ──▶ clips/*.mp4     (Runway / Veo / mock)
                ├─▶ generate_voiceover ──▶ audio/*.mp3     (Runway, optional)
                ├─▶ generate_music     ──▶ audio/*.mp3     (Runway, optional)
                ├─▶ assemble_video     ──▶ final.mp4       (ffmpeg: scale, concat, mix, burn captions)
                └─▶ contact_sheet + Read ──▶ QA, fix once, report
```

## Requirements

- Node 20+ and `ffmpeg` / `ffprobe` on your PATH (`brew install ffmpeg`, `apt install ffmpeg`).
- An Anthropic API key for the agent itself.
- A footage provider key, unless you use the free `mock` provider.

## Setup

```bash
cd video-agent
npm install
cp .env.example .env     # then fill in the keys you have
```

| Variable | What it is |
|---|---|
| `ANTHROPIC_API_KEY` | Claude, for the agent. |
| `VIDEO_PROVIDER` | `mock` (default, free test patterns), `runway`, or `veo`. |
| `RUNWAYML_API_SECRET` | Key from https://dev.runwayml.com. One key covers video (Veo 3.1, Veo 3.1 Fast, Gen-4.5, Kling, Hailuo, Seedance...), ElevenLabs voices and music. |
| `RUNWAY_VIDEO_MODEL` | Which Runway model to use for clips; default `veo3.1_fast`. |
| `RUNWAY_VOICE` | Preset voice name for voiceover; default `Arjun`. |
| `GEMINI_API_KEY`, `VEO_MODEL` | Google Veo straight from the Gemini API. Google rotates model IDs often; check the [Veo docs](https://ai.google.dev/gemini-api/docs/video) for the current one. |
| `MAX_CLIPS`, `MAX_CLIP_SECONDS` | Footage budget per run (defaults 10 clips, 80 seconds). The tools refuse to generate past it. |

## Use

```bash
# Free dry run: real agent, fake footage. Good for checking the flow and your prompts.
npm start -- "30s ad for a Pune chai cafe opening, warm and funny" --provider mock --music --voiceover

# The real thing
npm start -- "30s ad for a Pune chai cafe opening, warm and funny" --provider runway --music --voiceover
```

Options:

```
--aspect 9:16|16:9|1:1      canvas (default 9:16)
--duration <seconds>        target length (default 30)
--provider mock|runway|veo  footage model (default $VIDEO_PROVIDER or mock)
--out <dir>                 job folder (default out/<date>-<slug>)
--model <id>                Claude model for the agent (default claude-opus-5-5)
--effort low|medium|high|xhigh|max
--no-captions               do not burn captions
--voiceover                 add narration (needs a provider with text-to-speech: runway or mock)
--music                     add a generated music bed (runway or mock)
--max-clips <n>             footage budget, clips
--max-clip-seconds <n>      footage budget, seconds
--max-turns <n>             agent turn cap (default 60)
--budget-usd <n>            stop the agent past this estimated Claude spend
```

Each run gets a job folder under `out/` with `brief.txt`, `storyboard.md`, `clips/`, `audio/`, `final.mp4` and `contact-sheet.png`. The agent's progress prints as it goes; the report comes at the end.

## What it costs

- **Claude:** a 30-second video is usually 15 to 30 agent turns. The CLI prints the estimated Claude cost at the end; `--budget-usd` caps it.
- **Footage:** this is the real cost. Veo 3.1 Fast is roughly $0.10 to $0.15 per second of footage, Veo 3.1 about $0.40 per second, Runway Gen-4.5 is priced in credits. A 30-second video with 5 to 6 clips is about 40 seconds of generated footage. Set `MAX_CLIPS` / `MAX_CLIP_SECONDS` to what you are happy to spend on one run; the agent cannot exceed them.
- Voiceover and music through Runway cost a few credits each.

Always run with `--provider mock` first when you change prompts or options.

## How it keeps itself in check

- The agent only sees Read, Write, Glob, the six video tools, and Bash limited to `ffmpeg`/`ffprobe`. Anything else is denied without prompting; it never asks a human mid-run.
- File tools are jailed to the job folder.
- The clip budget is enforced in the tool, not in the prompt.
- Visual prompts are told to avoid on-screen text, logos, real people and copyrighted characters; captions are burned in by ffmpeg instead, so they are always legible.
- Captions are rendered as ASS subtitles with the bundled Inter font (SIL Open Font License, see `assets/fonts`).

## Development

```bash
npm run typecheck
npm test          # unit tests plus an end-to-end ffmpeg pipeline test with mock footage (needs ffmpeg)
```

Layout:

```
src/cli.ts            argument parsing, progress output
src/agent.ts          builds the Agent SDK query: system prompt, tools, permissions, budgets
src/prompt.ts         the director's system prompt
src/tools.ts          the six tools, as an in-process MCP server named "video"
src/assemble.ts       ffmpeg pipeline: normalise, concat, mix, burn captions, contact sheet
src/captions.ts       ASS subtitle builder
src/providers/        mock, runway, veo (implement ClipProvider to add another)
test/                 vitest suites
```

To add a provider, implement `ClipProvider` from `src/providers/types.ts` (`generateClip`, and optionally `generateVoiceover` / `generateMusic`) and register it in `src/providers/index.ts`.
