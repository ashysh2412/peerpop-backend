# Rhyme agent: lip sync and motion for animated kids' songs

Song in, finished video out. You bring the songs and the characters; this pipeline makes the characters
sing the words and dance to the beat, frames the camera, renders, and muxes the audio.

```
song.mp3 ──► tempo + sections ──► dance plan (which clip, when, stretched to the beat)
         └─► Rhubarb Lip Sync ──► mouth shapes per frame
                                        │
character.blend ───────────────────────►│ Blender: shape keys + NLA strips + camera ──► frames ──► ffmpeg ──► song.mp4
```

Everything is deterministic and scriptable, so a folder of songs becomes a folder of videos with one command.

## Install

Two ways to run it. The first is simplest; the second gives GPU rendering and a denoiser.

**A. Blender as a Python module** (needs the Python version the `bpy` wheel is built for: 3.11 for bpy 4.x, 3.13 for bpy 5.x)

```bash
cd rhymes
python3 -m venv venv && . venv/bin/activate
pip install -r requirements.txt
```

**B. A normal Blender install** (4.2 or newer)

```bash
blender -b --python blender_run.py -- make --audio song.mp3 --character chars/bunny.blend --out out/song.mp4 --gpu
```

Also needed:

- `ffmpeg` and `ffprobe` on the PATH.
- [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync/releases): download, unzip, and either put `rhubarb`
  on the PATH, set `RHUBARB=/path/to/rhubarb`, or pass `--rhubarb`. Without it the pipeline still runs, opening the mouth
  from the vocal's loudness, which is noticeably worse than real phonemes.

## Use

```bash
# one song
python -m rhyme_agent make --audio songs/twinkle.mp3 --lyrics songs/twinkle.txt --character chars/bunny.blend --out out/twinkle.mp4

# quick look before the long render: 640x360, 12 fps, first 10 seconds
python -m rhyme_agent make --audio songs/twinkle.mp3 --character chars/bunny.blend --out out/test.mp4 --preview --max-seconds 10

# every song in a folder (lyrics as twinkle.txt, subtitles as twinkle.srt, separated vocals as twinkle.vocals.wav are picked up by name)
python -m rhyme_agent batch --songs-dir songs --out-dir out --character chars/bunny.blend

# is my character ready?
python -m rhyme_agent check-character --character chars/bunny.blend

# only the mouth timing and dance plan, for a 2D tool or another renderer
python -m rhyme_agent cues --audio songs/twinkle.mp3 --lyrics songs/twinkle.txt --out-dir out/twinkle_cues

# the built-in rabbit as a .blend, to see the contract or to use as a start
python -m rhyme_agent demo-character --out chars/rabbit.blend
```

Useful flags: `--vocals` (a separated vocal track for lip sync, strongly recommended; see below), `--srt` (burn in
sing-along captions), `--recognizer phonetic` (any language other than English), `--seed` (a different dance pick),
`--bars` (how many bars per dance section, default 4), `--save-blend` (keep the animated scene to open in Blender),
`--mouth-map` (your own shape key names), `--width --height --fps --samples` (final quality).

## Getting the best lip sync

1. **Feed Rhubarb the vocal only.** On a full mix the drums open the mouth. Separate the vocal once with
   [Demucs](https://github.com/facebookresearch/demucs) (`demucs --two-stems=vocals song.mp3`) and pass it as
   `--vocals`. The final video still uses the full mix.
2. **Give it the lyrics** as a plain text file with `--lyrics`. Rhubarb uses them to resolve what it hears.
3. **English songs** use the default recognizer. **Hindi, Tamil, or any other language**: `--recognizer phonetic`.

## The character contract

Your `.blend` needs three things. `check-character` tells you which are missing.

1. **Mouth shapes as shape keys** on the face or mouth mesh, named after Rhubarb's mouth shapes:
   `A` (closed, m b p), `B` (slightly open, teeth), `C` (open, eh), `D` (wide open, ah), `E` (rounded, oh),
   `F` (puckered, oo), `G` (upper teeth on lip, f v), `H` (l), `X` (rest). Reference drawings are in the
   [Rhubarb README](https://github.com/DanielSWolf/rhubarb-lip-sync#mouth-shapes). G, H and X are optional.

   If your character already has visemes under other names (ARKit blend shapes from Character Creator, VRoid,
   Ready Player Me, or your own set), don't rename anything: write a mouth map and pass `--mouth-map`.
   See `examples/mouth_map_arkit.json` and `examples/mouth_map_simple.json`. Each Rhubarb letter maps to one or
   more of your shape keys with a weight.

2. **Dance clips as actions on the armature**, named `dance_<anything>`. Each one should loop and have two custom
   properties on the action: `loop_beats` (how many beats one playthrough lasts) and `energy` (`low`, `mid` or `high`;
   calm verses get low, choruses get high). Mark every action with a **fake user** (the shield icon in the Action editor),
   otherwise Blender throws it away when you save because nothing is using it.

   To get clips without animating: download dance FBX files from [Mixamo](https://www.mixamo.com) for your character,
   import them into the .blend, rename the imported actions to `dance_...`, set the two properties, and delete the
   duplicate armatures the importer creates. The pipeline time-stretches each clip so `loop_beats` beats land on
   the song's beats, then repeats it to fill the section and cross-fades into the next clip.

3. **Optional**: a shape key named `blink` on the eyes (random blinks are added), a camera (keep yours by setting
   a custom property `rhyme_auto = False` on it; otherwise a camera is placed and cut automatically), and lights
   (a sun is added if the file has none).

The built-in rabbit (`demo-character`) follows this contract and is a reasonable template.

### Two characters in one scene

Every mesh with mouth shapes sings and every armature dances. Rigs get different dance picks so they don't mirror
each other. Put both characters in one .blend.

### 2D characters

This renderer is 3D. If your characters are flat art, run `cues` instead: it writes `mouth_cues.json` in Rhubarb's
format, which After Effects (via scripts), Moho, OpenToonz and Adobe Character Animator can drive directly, plus a
per-frame CSV and the dance plan with section timings, so the body animation can be built in that tool on the beat.

## Render time

Rendering is the slow part. The demo rabbit at 640x360, 12 fps, 8 samples takes about 0.75 s per frame on 4 CPU cores.
A finished 1080p, 24 fps, 48 sample video is roughly 100x more work per second of song, so for real production use
`blender_run.py` with `--gpu` on a machine with a graphics card, or render in chunks with `--max-seconds` while testing.

## Tests

```bash
python -m unittest discover -s tests
```

They cover tempo detection, sectioning, mouth cues and the plan, and run in a second without Blender.
