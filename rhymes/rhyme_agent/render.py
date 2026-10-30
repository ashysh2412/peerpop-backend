"""Applies the lip-sync cues and the dance plan to the character in Blender, then renders frames."""

from __future__ import annotations

import os
import random
import subprocess

import bpy
from mathutils import Vector

from .choreo import DanceClip, Plan
from .lipsync import VISEMES


def load_character(path: str) -> None:
    if path == "demo":
        from . import demo_character

        demo_character.build()
    else:
        bpy.ops.wm.open_mainfile(filepath=os.path.abspath(path))


def fcurves_of(action: bpy.types.Action):
    for layer in action.layers:
        for strip in layer.strips:
            for cb in strip.channelbags:
                yield from cb.fcurves


def find_mouths(mouth_map: MouthMap | None = None) -> list[bpy.types.Object]:
    """Meshes that can sing: at least three Rhubarb letters as shape keys, or three keys named in the mouth map."""
    wanted = {k for t in mouth_map.values() for k in t} if mouth_map else set(VISEMES)
    out = []
    for o in bpy.data.objects:
        if o.type == "MESH" and o.data.shape_keys:
            names = {k.name for k in o.data.shape_keys.key_blocks}
            if len(names & wanted) >= 3:
                out.append(o)
    return out


def find_blinkers() -> list[bpy.types.Object]:
    return [o for o in bpy.data.objects if o.type == "MESH" and o.data.shape_keys and "blink" in o.data.shape_keys.key_blocks]


def find_rigs() -> list[bpy.types.Object]:
    return [o for o in bpy.data.objects if o.type == "ARMATURE"]


def dance_clips() -> list[DanceClip]:
    clips = []
    for a in bpy.data.actions:
        if a.name.startswith("dance_"):
            clips.append(DanceClip(name=a.name, loop_beats=int(a.get("loop_beats", 4)), energy=str(a.get("energy", "mid"))))
    return clips


def set_interpolation(action: bpy.types.Action, mode: str) -> None:
    for fc in fcurves_of(action):
        for kp in fc.keyframe_points:
            kp.interpolation = mode


MouthMap = dict[str, dict[str, float]]


def default_mouth_map(mouth: bpy.types.Object) -> MouthMap:
    """Rhubarb letter -> {shape key: weight}. By default each letter is its own shape key."""
    keys = mouth.data.shape_keys.key_blocks
    return {v: {v: 1.0} for v in VISEMES if v in keys}


def load_mouth_map(path: str) -> MouthMap:
    import json

    with open(path) as f:
        raw = json.load(f)
    out: MouthMap = {}
    for letter, target in raw.items():
        if isinstance(target, str):
            out[letter] = {target: 1.0}
        elif isinstance(target, dict):
            out[letter] = {k: float(w) for k, w in target.items()}
        elif isinstance(target, list):
            out[letter] = {k: 1.0 for k in target}
    return out


def apply_visemes(mouth: bpy.types.Object, per_frame: list[str], mouth_map: MouthMap | None = None) -> None:
    """Keyframes the mouth shape keys: the active shape's keys at their weights, all others 0, with a one-frame blend."""
    keys = mouth.data.shape_keys.key_blocks
    mapping = {v: {k: w for k, w in t.items() if k in keys} for v, t in (mouth_map or default_mouth_map(mouth)).items()}
    used = sorted({k for t in mapping.values() for k in t})
    if not used:
        return
    # Rhubarb's own advice when the extended shapes are missing: G looks like B, H like C, X like A.
    for letter, alt in (("G", "B"), ("H", "C"), ("X", "A")):
        if letter not in mapping and alt in mapping:
            mapping[letter] = mapping[alt]
    rest = mapping.get("X", next(iter(mapping.values())))
    rest = next(v for v, t in mapping.items() if t is rest)
    for k in used:
        keys[k].value = 0.0
        keys[k].keyframe_insert("value", frame=1)
    current = None
    for i, v in enumerate(per_frame):
        v = v if v in mapping else rest
        if v == current:
            continue
        f = i + 1
        touched = set(mapping[v]) | (set(mapping[current]) if current else set())
        for k in touched:
            if f > 1:
                keys[k].keyframe_insert("value", frame=f - 1)
            keys[k].value = mapping[v].get(k, 0.0)
            keys[k].keyframe_insert("value", frame=f)
        current = v
    set_interpolation(mouth.data.shape_keys.animation_data.action, "LINEAR")


def apply_blinks(obj: bpy.types.Object, n_frames: int, fps: float, rng: random.Random) -> None:
    kb = obj.data.shape_keys.key_blocks["blink"]
    f = int(rng.uniform(1.0, 3.0) * fps)
    kb.value = 0.0
    kb.keyframe_insert("value", frame=1)
    hold = max(1, int(fps * 0.08))
    while f < n_frames - 2 * hold:
        kb.value = 0.0
        kb.keyframe_insert("value", frame=f)
        kb.value = 1.0
        kb.keyframe_insert("value", frame=f + hold)
        kb.value = 0.0
        kb.keyframe_insert("value", frame=f + 2 * hold)
        f += int(rng.uniform(2.0, 5.0) * fps)


def match_rotation_modes(rig: bpy.types.Object, actions: list[bpy.types.Action]) -> None:
    """A bone only follows rotation curves of its own rotation mode, so set each bone to the mode its clips use."""
    modes: dict[str, str] = {}
    for a in actions:
        for fc in fcurves_of(a):
            dp = fc.data_path
            if dp.startswith('pose.bones["') and (".rotation_euler" in dp or ".rotation_quaternion" in dp):
                bone = dp.split('"')[1]
                modes[bone] = "XYZ" if ".rotation_euler" in dp else "QUATERNION"
    for bone, mode in modes.items():
        pb = rig.pose.bones.get(bone)
        if pb and pb.rotation_mode != mode and not (mode == "XYZ" and pb.rotation_mode in {"XYZ", "XZY", "YXZ", "YZX", "ZXY", "ZYX"}):
            pb.rotation_mode = mode


def apply_dance(rig: bpy.types.Object, plan: Plan, clips: dict[str, DanceClip]) -> None:
    """Lays the plan's clips on two alternating NLA tracks, each stretched to the song's tempo and cross-faded."""
    match_rotation_modes(rig, [a for a in bpy.data.actions if a.name in clips])
    ad = rig.animation_data or rig.animation_data_create()
    ad.action = None
    for t in list(ad.nla_tracks):
        ad.nla_tracks.remove(t)
    tracks = [ad.nla_tracks.new(), ad.nla_tracks.new()]
    fps = plan.fps
    blend = max(2, int(fps * 0.25))
    for i, d in enumerate(plan.dance):
        action = bpy.data.actions.get(d.clip)
        clip = clips[d.clip]
        if action is None:
            continue
        a0, a1 = action.frame_range
        length = max(1.0, a1 - a0)
        start_f = int(round(d.start * fps)) + 1
        end_f = int(round(d.end * fps)) + 1 + (blend if i + 1 < len(plan.dance) else 0)
        strip = tracks[i % 2].strips.new(f"{d.clip}_{i}", start_f, action)
        if strip.action_slot is None and len(action.slots):
            strip.action_slot = action.slots[0]
        strip.scale = (clip.loop_beats * plan.tempo.beat_len * fps) / length
        strip.repeat = max(0.05, (end_f - start_f) / (length * strip.scale))
        strip.blend_type = "REPLACE"
        strip.extrapolation = "NOTHING"
        strip.blend_in = blend if i else 0
        strip.blend_out = blend if i + 1 < len(plan.dance) else 0


def character_bounds(rigs: list[bpy.types.Object]) -> tuple[Vector, float]:
    """World-space centre and height of everything attached to the rigs."""
    pts = []
    for o in bpy.data.objects:
        if o.type == "MESH" and (o.parent in rigs or o in rigs):
            pts += [o.matrix_world @ Vector(c) for c in o.bound_box]
    if not pts:
        return Vector((0, 0, 1)), 2.0
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return (lo + hi) / 2, max(hi.z - lo.z, 0.5)


def setup_camera(plan: Plan, rigs: list[bpy.types.Object]) -> None:
    """Places and cuts the camera. With several characters, wide shots show everyone and the other shots visit them in turn."""
    scene = bpy.context.scene
    group_centre, group_height = character_bounds(rigs)
    singles = [character_bounds([r]) for r in rigs] if len(rigs) > 1 else []
    if singles:
        xs = [(o.matrix_world @ Vector(c)).x for o in bpy.data.objects if o.type == "MESH" and o.parent in rigs for c in o.bound_box]
        group_height = max(group_height, (max(xs) - min(xs)) * 0.62)
    cam = scene.camera
    if cam is None or cam.get("rhyme_auto", True):
        cam_data = bpy.data.cameras.new("Camera")
        cam = bpy.data.objects.new("Camera", cam_data)
        cam["rhyme_auto"] = True
        scene.collection.objects.link(cam)
        scene.camera = cam
    cam.data.lens = 45
    target = bpy.data.objects.new("CameraTarget", None)
    scene.collection.objects.link(target)
    con = cam.constraints.new("TRACK_TO")
    con.target = target
    con.track_axis = "TRACK_NEGATIVE_Z"
    con.up_axis = "UP_Y"
    fps = plan.fps
    # (distance in heights, camera height factor) at the start and end of the shot, and where to look (in heights above centre)
    shots = {
        "wide": ((2.1, 1.1), (2.1, 1.1), 0.0),
        "medium": ((1.6, 1.2), (1.6, 1.2), 0.1),
        "push": ((2.0, 1.15), (1.45, 1.2), 0.15),
        "close": ((1.0, 1.3), (1.0, 1.3), 0.3),
    }
    for si, s in enumerate(plan.shots):
        (d0, h0), (d1, h1), look_up = shots.get(s.kind, shots["wide"])
        centre, height = (singles[si % len(singles)] if singles and s.kind != "wide" else (group_centre, group_height))
        look = centre + Vector((0, 0, height * look_up))
        f0, f1 = int(round(s.start * fps)) + 1, max(int(round(s.end * fps)), int(round(s.start * fps)) + 1)
        for f, d, h in ((f0, d0, h0), (f1, d1, h1)):
            cam.location = Vector((centre.x + d * height * 0.15, centre.y - d * height, centre.z + (h - 1) * height * 0.6 + height * 0.1))
            cam.keyframe_insert("location", frame=f)
            target.location = look
            target.keyframe_insert("location", frame=f)
    for o in (cam, target):
        if o.animation_data and o.animation_data.action:
            set_interpolation(o.animation_data.action, "LINEAR")


def ensure_light() -> None:
    if any(o.type == "LIGHT" for o in bpy.data.objects):
        return
    bpy.ops.object.light_add(type="SUN", location=(4, -6, 8))
    bpy.context.object.data.energy = 3.0
    bpy.context.object.rotation_euler = (0.8, 0.25, 0.5)


def enable_gpu() -> bool:
    """Turns on every GPU Cycles can see. Only works inside a full Blender, not the bpy wheel."""
    prefs = bpy.context.preferences.addons.get("cycles")
    if not prefs:
        return False
    cp = prefs.preferences
    for kind in ("OPTIX", "CUDA", "HIP", "METAL", "ONEAPI"):
        try:
            cp.compute_device_type = kind
        except TypeError:
            continue
        found = False
        for d in cp.get_devices_for_type(kind):
            d.use = True
            found = True
        if found:
            return True
    return False


def render_frames(frames_dir: str, fps: float, n_frames: int, width: int, height: int, samples: int, denoise: bool, gpu: bool = False) -> None:
    scene = bpy.context.scene
    scene.render.fps = int(round(fps))
    scene.render.fps_base = int(round(fps)) / fps
    scene.frame_start, scene.frame_end = 1, n_frames
    scene.render.engine = "CYCLES"
    scene.cycles.device = "GPU" if gpu and enable_gpu() else "CPU"
    scene.cycles.samples = samples
    scene.cycles.max_bounces = 3
    scene.cycles.transparent_max_bounces = 32  # layered cut-outs stack many transparent planes
    scene.cycles.use_adaptive_sampling = True
    has_denoiser = bool(scene.cycles.bl_rna.properties["denoiser"].enum_items)
    scene.cycles.use_denoising = denoise and has_denoiser
    scene.render.use_persistent_data = True
    scene.render.resolution_x, scene.render.resolution_y = width, height
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "Standard"
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.filepath = os.path.join(frames_dir, "frame_")
    bpy.ops.render.render(animation=True)


def encode(frames_dir: str, audio_path: str, out_path: str, fps: float, srt: str | None = None) -> None:
    cmd = ["ffmpeg", "-v", "error", "-y", "-framerate", f"{fps:g}", "-i", os.path.join(frames_dir, "frame_%04d.png"), "-i", audio_path]
    if srt:
        style = "FontSize=26,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Alignment=2,MarginV=40"
        cmd += ["-vf", f"subtitles={srt}:force_style='{style}'"]
    cmd += ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out_path]
    subprocess.run(cmd, check=True)
