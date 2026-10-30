"""Command line: `python -m rhyme_agent make --audio song.mp3 --out song.mp4` and friends."""

from __future__ import annotations

import argparse
import glob
import json
import os
import random
import shutil
import sys
import tempfile
import time

from . import audio, choreo, lipsync

AUDIO_EXT = (".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac")


def log(msg: str) -> None:
    print(f"[rhyme] {msg}", file=sys.stderr, flush=True)


def analyse(args, work: str) -> tuple[choreo.Plan, list[lipsync.Cue], list[str]]:
    """Everything that doesn't need Blender: tempo, sections, mouth cues."""
    mix, sr = audio.decode(args.audio)
    total = mix.size / sr
    if args.max_seconds:
        total = min(total, args.max_seconds)
    fps = args.fps
    n_frames = int(total * fps)
    tempo = audio.estimate_tempo(mix, sr)
    log(f"{total:.1f}s, {tempo.bpm} bpm (confidence {tempo.confidence:.2f}), first beat at {tempo.beat_offset:.2f}s")
    sections = audio.split_sections(mix[: int(total * sr)], sr, tempo, bars=args.bars)
    log(f"{len(sections)} sections: " + " ".join(s.energy for s in sections))

    vocal_path = args.vocals or args.audio
    rhubarb = lipsync.find_rhubarb(args.rhubarb)
    if rhubarb and not args.no_rhubarb:
        log(f"lip sync with Rhubarb ({args.recognizer})" + (" and lyrics" if args.lyrics else ""))
        cues = lipsync.rhubarb_cues(vocal_path, work, rhubarb, args.lyrics, args.recognizer)
    else:
        log("Rhubarb not found, lip sync from vocal loudness (install Rhubarb for phoneme-accurate mouths)")
        vocal, vsr = audio.decode(vocal_path) if vocal_path != args.audio else (mix, sr)
        cues = lipsync.loudness_cues(vocal, vsr, fps, n_frames)
    per_frame = lipsync.cues_per_frame(cues, fps, n_frames)
    return choreo.Plan(fps=fps, duration=total, tempo=tempo, sections=sections), cues, per_frame


def make(args) -> str:
    t0 = time.time()
    work = args.work_dir or tempfile.mkdtemp(prefix="rhyme_")
    os.makedirs(work, exist_ok=True)
    plan, cues, per_frame = analyse(args, work)
    lipsync.save_cues(cues, os.path.join(work, "mouth_cues.json"))

    # Blender from here on.
    from . import render

    log(f"loading character {args.character}")
    render.load_character(args.character)
    clips = render.dance_clips()
    plan = choreo.make_plan(plan.duration, plan.fps, plan.tempo, plan.sections, clips, seed=args.seed)
    with open(os.path.join(work, "plan.json"), "w") as f:
        json.dump(plan.to_dict(), f, indent=1)
    log("dance: " + " ".join(f"{d.clip[6:]}" for d in plan.dance))
    if args.plan_only:
        log(f"plan written to {work}")
        return work

    mouth_map = render.load_mouth_map(args.mouth_map) if args.mouth_map else None
    mouths, rigs = render.find_mouths(mouth_map), render.find_rigs()
    if not mouths:
        log("warning: no mesh with A-H/X shape keys (or mouth-map keys) found, nobody will sing")
    if not clips:
        log("warning: no dance_* actions in the character file, nobody will dance")
    for m in mouths:
        render.apply_visemes(m, per_frame, mouth_map)
    rng = random.Random(args.seed)
    for b in render.find_blinkers():
        render.apply_blinks(b, len(per_frame), plan.fps, rng)
    clip_map = {c.name: c for c in clips}
    for i, rig in enumerate(rigs):
        rig_plan = plan if i == 0 else choreo.make_plan(plan.duration, plan.fps, plan.tempo, plan.sections, clips, seed=args.seed + i)
        render.apply_dance(rig, rig_plan, clip_map)
    render.ensure_light()
    render.setup_camera(plan, rigs)

    if args.save_blend:
        import bpy

        os.makedirs(os.path.dirname(os.path.abspath(args.save_blend)), exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(args.save_blend))
        log(f"scene saved to {args.save_blend}")

    frames = os.path.join(work, "frames")
    shutil.rmtree(frames, ignore_errors=True)
    os.makedirs(frames)
    n = len(per_frame)
    log(f"rendering {n} frames at {args.width}x{args.height}, {args.samples} samples")
    render.render_frames(frames, plan.fps, n, args.width, args.height, args.samples, not args.no_denoise, args.gpu)
    out = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    render.encode(frames, args.audio, out, plan.fps, args.srt)
    if not args.keep_frames:
        shutil.rmtree(frames, ignore_errors=True)
    log(f"done in {time.time() - t0:.0f}s: {out}")
    return out


def batch(args) -> None:
    """Every song in a folder becomes a video. Lyrics and subtitles are picked up by matching file name."""
    songs = sorted(p for p in glob.glob(os.path.join(args.songs_dir, "*")) if p.lower().endswith(AUDIO_EXT))
    if not songs:
        log(f"no audio files in {args.songs_dir}")
        return
    os.makedirs(args.out_dir, exist_ok=True)
    for song in songs:
        stem = os.path.splitext(os.path.basename(song))[0]
        out = os.path.join(args.out_dir, stem + ".mp4")
        if os.path.exists(out) and not args.overwrite:
            log(f"skip {stem}: already rendered")
            continue
        a = argparse.Namespace(**vars(args))
        a.audio, a.out = song, out
        a.lyrics = a.lyrics or (os.path.join(args.songs_dir, stem + ".txt") if os.path.exists(os.path.join(args.songs_dir, stem + ".txt")) else None)
        a.srt = a.srt or (os.path.join(args.songs_dir, stem + ".srt") if os.path.exists(os.path.join(args.songs_dir, stem + ".srt")) else None)
        a.vocals = a.vocals or next((p for p in glob.glob(os.path.join(args.songs_dir, stem + ".vocals.*"))), None)
        a.work_dir = os.path.join(args.out_dir, "work", stem)
        a.save_blend = None
        log(f"=== {stem}")
        try:
            make(a)
        except Exception as e:  # keep going with the next song
            log(f"FAILED {stem}: {e}")


def cues_only(args) -> None:
    """Writes mouth_cues.json (Rhubarb format) and mouth_frames.csv for use in 2D tools or other renderers."""
    os.makedirs(args.out_dir, exist_ok=True)
    plan, cues, per_frame = analyse(args, args.out_dir)
    lipsync.save_cues(cues, os.path.join(args.out_dir, "mouth_cues.json"))
    with open(os.path.join(args.out_dir, "mouth_frames.csv"), "w") as f:
        f.write("frame,seconds,shape\n")
        for i, v in enumerate(per_frame):
            f.write(f"{i + 1},{i / plan.fps:.4f},{v}\n")
    with open(os.path.join(args.out_dir, "plan.json"), "w") as f:
        json.dump(plan.to_dict(), f, indent=1)
    log(f"wrote mouth_cues.json, mouth_frames.csv and plan.json to {args.out_dir}")


def check_character(args) -> int:
    """Reports whether a .blend follows the character contract. Exit code 1 when it can't sing or dance."""
    from . import render

    render.load_character(args.character)
    mouth_map = render.load_mouth_map(args.mouth_map) if args.mouth_map else None
    ok = True
    mouths = render.find_mouths(mouth_map)
    if mouths:
        for m in mouths:
            have = sorted({k.name for k in m.data.shape_keys.key_blocks} & ({k for t in mouth_map.values() for k in t} if mouth_map else set(lipsync.VISEMES)))
            print(f"mouth: {m.name} with shape keys {' '.join(have)}")
        if not mouth_map:
            missing = sorted(set(lipsync.VISEMES) - {k.name for m in mouths for k in m.data.shape_keys.key_blocks})
            if missing:
                print(f"  missing shape keys {' '.join(missing)} (those mouth shapes fall back to X)")
    else:
        ok = False
        print("NO MOUTH: add shape keys named A B C D E F G H X to the face mesh, or pass --mouth-map")
    blinkers = render.find_blinkers()
    print(f"blink: {', '.join(o.name for o in blinkers)}" if blinkers else "blink: none (optional: a shape key named 'blink' on the eyes)")
    rigs = render.find_rigs()
    print(f"rigs: {', '.join(r.name for r in rigs)}" if rigs else "rigs: none")
    clips = render.dance_clips()
    if clips:
        for c in clips:
            a = bpy_action_len(c.name)
            print(f"dance clip: {c.name} ({a:.0f} frames, loop_beats={c.loop_beats}, energy={c.energy})")
    else:
        ok = False
        print("NO DANCE CLIPS: add actions named dance_<name> to the rig (Mixamo imports work), with custom properties loop_beats and energy")
    if not rigs:
        ok = False
    import bpy

    print(f"camera: {'own camera kept' if bpy.context.scene.camera and not bpy.context.scene.camera.get('rhyme_auto', True) else 'auto'}")
    print(f"lights: {sum(1 for o in bpy.data.objects if o.type == 'LIGHT')}")
    print("OK: this character can sing and dance" if ok else "NOT READY")
    return 0 if ok else 1


def bpy_action_len(name: str) -> float:
    import bpy

    a = bpy.data.actions[name]
    return a.frame_range[1] - a.frame_range[0]


def add_common(p: argparse.ArgumentParser) -> None:
    p.add_argument("--character", default="demo", help="a .blend following the character contract, or 'demo'")
    p.add_argument("--vocals", help="separated vocal track for lip sync (recommended; the full mix is still used in the video)")
    p.add_argument("--lyrics", help="plain-text lyrics, improves Rhubarb accuracy")
    p.add_argument("--srt", help="subtitle file to burn in as sing-along captions")
    p.add_argument("--mouth-map", help="JSON mapping Rhubarb letters A-H,X to your character's shape key names")
    p.add_argument("--rhubarb", help="path to the rhubarb binary (or set RHUBARB)")
    p.add_argument("--no-rhubarb", action="store_true", help="force the loudness-based lip sync")
    p.add_argument("--recognizer", default="pocketSphinx", choices=["pocketSphinx", "phonetic"], help="Rhubarb recognizer; use phonetic for non-English songs")
    p.add_argument("--fps", type=float, default=24)
    p.add_argument("--width", type=int, default=1920)
    p.add_argument("--height", type=int, default=1080)
    p.add_argument("--samples", type=int, default=48, help="Cycles samples per pixel")
    p.add_argument("--no-denoise", action="store_true")
    p.add_argument("--gpu", action="store_true", help="render on the GPU (needs a full Blender install, see blender_run.py)")
    p.add_argument("--bars", type=int, default=4, help="bars per dance section")
    p.add_argument("--seed", type=int, default=0, help="changes which dance clips get picked")
    p.add_argument("--max-seconds", type=float, help="only animate the first N seconds (for quick tests)")
    p.add_argument("--preview", action="store_true", help="640x360, 12 fps, 8 samples")
    p.add_argument("--keep-frames", action="store_true")
    p.add_argument("--work-dir", help="where cues, plan and frames go (default: a temp dir)")
    p.add_argument("--plan-only", action="store_true", help="analyse and write plan.json without rendering")


def apply_preview(args) -> None:
    if getattr(args, "preview", False):
        args.width, args.height, args.fps, args.samples = 640, 360, 12.0, 8


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="rhyme_agent", description="Animated singing characters from a finished song.")
    sub = ap.add_subparsers(dest="cmd", required=True)

    m = sub.add_parser("make", help="render one song")
    m.add_argument("--audio", required=True)
    m.add_argument("--out", required=True, help="output .mp4")
    m.add_argument("--save-blend", help="also save the animated scene as a .blend to open in Blender")
    add_common(m)

    b = sub.add_parser("batch", help="render every song in a folder")
    b.add_argument("--songs-dir", required=True)
    b.add_argument("--out-dir", required=True)
    b.add_argument("--overwrite", action="store_true")
    add_common(b)

    c = sub.add_parser("cues", help="only compute mouth timing and the dance plan, no rendering (for 2D tools)")
    c.add_argument("--audio", required=True)
    c.add_argument("--out-dir", required=True)
    add_common(c)

    k = sub.add_parser("check-character", help="report whether a .blend can sing and dance")
    k.add_argument("--character", required=True)
    k.add_argument("--mouth-map")

    d = sub.add_parser("demo-character", help="save the built-in rabbit as a .blend to study or edit")
    d.add_argument("--out", required=True)

    args = ap.parse_args(argv)
    apply_preview(args)
    if args.cmd == "make":
        make(args)
    elif args.cmd == "batch":
        batch(args)
    elif args.cmd == "cues":
        cues_only(args)
    elif args.cmd == "check-character":
        sys.exit(check_character(args))
    elif args.cmd == "demo-character":
        from . import demo_character

        demo_character.save(os.path.abspath(args.out))
        log(f"saved {args.out}")
