"""A procedural rabbit built from primitives, so the pipeline can be tried before any real art exists.

It also documents the character contract that your own .blend files must follow:
  * one or more meshes with shape keys named after Rhubarb mouth shapes: A B C D E F G H X
  * optionally a shape key named "blink" on the eye meshes
  * an armature whose actions are named dance_<something>, each loopable, with custom properties
    loop_beats (int, how many beats one playthrough lasts) and energy ("low" | "mid" | "high")
"""

from __future__ import annotations

import math

import bpy
from mathutils import Matrix, Vector

from .lipsync import VISEMES

# (width scale, height scale) of the mouth for each Rhubarb shape, relative to the basis.
MOUTH_SHAPES = {
    "X": (1.0, 0.25),
    "A": (1.0, 0.2),
    "B": (1.1, 0.5),
    "C": (1.2, 1.2),
    "D": (1.35, 2.0),
    "E": (0.85, 1.3),
    "F": (0.6, 1.2),
    "G": (1.0, 0.35),
    "H": (1.0, 1.4),
}

REF_FPB = 24  # demo clips are authored with 24 frames per beat


def material(name: str, rgb: tuple[float, float, float], rough: float = 0.6) -> bpy.types.Material:
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    return m


def sphere(name: str, loc, scale, mat, segments: int = 32) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=segments // 2, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    o.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return o


def bone_parent(obj: bpy.types.Object, arm: bpy.types.Object, bone: str) -> None:
    """Attaches obj to a bone while keeping its current world position."""
    world = obj.matrix_world.copy()
    obj.parent = arm
    obj.parent_type = "BONE"
    obj.parent_bone = bone
    b = arm.data.bones[bone]
    obj.matrix_parent_inverse = (arm.matrix_world @ b.matrix_local @ Matrix.Translation((0, b.length, 0))).inverted()
    obj.matrix_basis = world


def add_mouth_shapes(mouth: bpy.types.Object) -> None:
    mouth.shape_key_add(name="Basis")
    basis = [v.co.copy() for v in mouth.data.vertices]
    for letter in VISEMES:
        sx, sz = MOUTH_SHAPES[letter]
        kb = mouth.shape_key_add(name=letter, from_mix=False)
        kb.value = 0.0
        for i, co in enumerate(basis):
            kb.data[i].co = Vector((co.x * sx, co.y, co.z * sz))


def add_blink(eye: bpy.types.Object) -> None:
    eye.shape_key_add(name="Basis")
    kb = eye.shape_key_add(name="blink", from_mix=False)
    kb.value = 0.0
    for i, v in enumerate(eye.data.vertices):
        kb.data[i].co = Vector((v.co.x, v.co.y, v.co.z * 0.08))


def make_action(arm: bpy.types.Object, name: str, loop_beats: int, energy: str, keys: dict[str, dict[str, list[tuple[float, tuple]]]]) -> None:
    """keys: bone -> channel ("location"|"rotation_euler"|"scale") -> [(beat, value), ...]; the last key must equal the first."""
    if name in bpy.data.actions:  # a second rig with the same bone names shares the clip
        return
    action = bpy.data.actions.new(name)
    action["loop_beats"] = loop_beats
    action["energy"] = energy
    action.use_fake_user = True  # otherwise Blender discards the clip on save, since nothing is using it
    arm.animation_data.action = action
    for bone, channels in keys.items():
        pb = arm.pose.bones[bone]
        pb.rotation_mode = "XYZ"
        for channel, points in channels.items():
            for beat, value in points:
                setattr(pb, channel, value)
                pb.keyframe_insert(channel, frame=1 + beat * REF_FPB)
    arm.animation_data.action = None
    reset_pose(arm)
    for layer in action.layers:
        for strip in layer.strips:
            for cb in strip.channelbags:
                for fc in cb.fcurves:
                    for kp in fc.keyframe_points:
                        kp.interpolation = "BEZIER"
                    fc.modifiers.new("CYCLES")


def reset_pose(arm: bpy.types.Object) -> None:
    """Keyframing leaves the last pose on the bones; put them back to rest so parenting and blending start clean."""
    for pb in arm.pose.bones:
        pb.location = (0, 0, 0)
        pb.rotation_euler = (0, 0, 0)
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.scale = (1, 1, 1)


def rad(deg: float) -> float:
    return math.radians(deg)


def build() -> bpy.types.Object:
    """Builds the rabbit, its rig and six dance clips into the current scene. Returns the armature."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.fps = 24

    fur = material("fur", (0.9, 0.78, 0.62))
    belly = material("belly", (0.99, 0.95, 0.9))
    pink = material("pink", (0.95, 0.55, 0.65))
    dark = material("dark", (0.1, 0.05, 0.06), 0.4)
    white = material("white", (1.0, 1.0, 1.0), 0.3)
    grass = material("grass", (0.32, 0.68, 0.25))
    hill = material("hill", (0.4, 0.75, 0.3))

    # Rig: root at the hips, spine, head, two arms, two ears.
    bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
    arm = bpy.context.object
    arm.name = "Rig"
    eb = arm.data.edit_bones
    root = eb[0]
    root.name = "root"
    root.head, root.tail = (0, 0, 0.0), (0, 0, 0.6)
    spine = eb.new("spine")
    spine.head, spine.tail, spine.parent = (0, 0, 0.6), (0, 0, 1.3), root
    head = eb.new("head")
    head.head, head.tail, head.parent = (0, 0, 1.3), (0, 0, 2.0), spine
    for side, sx in (("L", 1), ("R", -1)):
        a = eb.new(f"arm.{side}")
        a.head, a.tail, a.parent = (sx * 0.55, 0, 1.2), (sx * 1.0, 0, 0.7), spine
        e = eb.new(f"ear.{side}")
        e.head, e.tail, e.parent = (sx * 0.25, 0, 2.0), (sx * 0.35, 0, 2.9), head
    bpy.ops.object.mode_set(mode="OBJECT")
    arm.animation_data_create()

    # Body parts, each attached to a bone.
    parts = []
    parts.append((sphere("body", (0, 0, 0.9), (0.62, 0.55, 0.75), fur), "spine"))
    parts.append((sphere("tummy", (0, -0.3, 0.8), (0.42, 0.3, 0.5), belly), "spine"))
    for side, sx in (("L", 1), ("R", -1)):
        parts.append((sphere(f"foot.{side}", (sx * 0.35, -0.15, 0.1), (0.25, 0.4, 0.14), fur), "root"))
        parts.append((sphere(f"arm.{side}", (sx * 0.78, 0, 0.95), (0.16, 0.16, 0.36), fur), f"arm.{side}"))
        parts.append((sphere(f"ear.{side}", (sx * 0.3, 0, 2.45), (0.14, 0.1, 0.5), fur), f"ear.{side}"))
        parts.append((sphere(f"ear_inner.{side}", (sx * 0.3, -0.05, 2.45), (0.07, 0.08, 0.36), pink), f"ear.{side}"))
        eye = sphere(f"eye.{side}", (sx * 0.22, -0.45, 1.72), (0.11, 0.09, 0.13), white)
        add_blink(eye)
        parts.append((eye, "head"))
        parts.append((sphere(f"pupil.{side}", (sx * 0.22, -0.53, 1.72), (0.05, 0.03, 0.06), dark), "head"))
    parts.append((sphere("head", (0, 0, 1.6), (0.58, 0.52, 0.52), fur), "head"))
    parts.append((sphere("nose", (0, -0.52, 1.52), (0.08, 0.05, 0.05), pink), "head"))
    mouth = sphere("mouth", (0, -0.5, 1.36), (0.2, 0.06, 0.09), dark)
    add_mouth_shapes(mouth)
    parts.append((mouth, "head"))
    for obj, bone in parts:
        bone_parent(obj, arm, bone)

    # A small world: ground, hills, sky.
    bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0))
    ground = bpy.context.object
    ground.name = "ground"
    ground.data.materials.append(grass)
    for i, (x, y, s) in enumerate([(-6, 8, 4), (5, 10, 5), (0, 14, 6), (-10, 12, 5)]):
        sphere(f"hill{i}", (x, y, -s * 0.55), (s, s, s), hill, 24)
    world = bpy.data.worlds.new("sky")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.55, 0.78, 0.98, 1.0)
    bg.inputs["Strength"].default_value = 0.7
    bpy.ops.object.light_add(type="SUN", location=(4, -6, 8))
    sun = bpy.context.object
    sun.data.energy = 1.6
    sun.data.angle = rad(5)
    sun.rotation_euler = (rad(45), rad(15), rad(30))

    # Dance clips, each a seamless loop measured in beats.
    up, down = (0, 0.18, 0), (0, 0, 0)
    z0 = (0, 0, 0)
    make_action(arm, "dance_bounce", 1, "low", {
        "root": {"location": [(0, down), (0.5, up), (1, down)]},
        "ear.L": {"rotation_euler": [(0, z0), (0.5, (rad(15), 0, 0)), (1, z0)]},
        "ear.R": {"rotation_euler": [(0, z0), (0.5, (rad(15), 0, 0)), (1, z0)]},
    })
    make_action(arm, "dance_wave", 4, "low", {
        "root": {"location": [(0, down), (0.5, (0, 0.08, 0)), (1, down), (1.5, (0, 0.08, 0)), (2, down), (2.5, (0, 0.08, 0)), (3, down), (3.5, (0, 0.08, 0)), (4, down)]},
        "arm.R": {"rotation_euler": [(0, z0), (1, (0, 0, rad(-150))), (1.5, (0, 0, rad(-120))), (2, (0, 0, rad(-160))), (2.5, (0, 0, rad(-120))), (3, (0, 0, rad(-150))), (4, z0)]},
        "head": {"rotation_euler": [(0, z0), (2, (0, rad(-12), 0)), (4, z0)]},
    })
    make_action(arm, "dance_sway", 2, "mid", {
        "spine": {"rotation_euler": [(0, (0, rad(-12), 0)), (1, (0, rad(12), 0)), (2, (0, rad(-12), 0))]},
        "head": {"rotation_euler": [(0, (0, rad(10), 0)), (1, (0, rad(-10), 0)), (2, (0, rad(10), 0))]},
        "arm.L": {"rotation_euler": [(0, (0, 0, rad(20))), (1, (0, 0, rad(-20))), (2, (0, 0, rad(20)))]},
        "arm.R": {"rotation_euler": [(0, (0, 0, rad(20))), (1, (0, 0, rad(-20))), (2, (0, 0, rad(20)))]},
        "root": {"location": [(0, down), (0.5, (0, 0.1, 0)), (1, down), (1.5, (0, 0.1, 0)), (2, down)]},
    })
    make_action(arm, "dance_clap", 2, "mid", {
        "arm.L": {"rotation_euler": [(0, (rad(-70), 0, rad(40))), (0.5, (rad(-70), 0, rad(-30))), (1, (rad(-70), 0, rad(40))), (1.5, (rad(-70), 0, rad(-30))), (2, (rad(-70), 0, rad(40)))]},
        "arm.R": {"rotation_euler": [(0, (rad(-70), 0, rad(-40))), (0.5, (rad(-70), 0, rad(30))), (1, (rad(-70), 0, rad(-40))), (1.5, (rad(-70), 0, rad(30))), (2, (rad(-70), 0, rad(-40)))]},
        "root": {"location": [(0, down), (0.5, up), (1, down), (1.5, up), (2, down)]},
        "head": {"rotation_euler": [(0, (rad(-8), 0, 0)), (0.5, (rad(8), 0, 0)), (1, (rad(-8), 0, 0)), (1.5, (rad(8), 0, 0)), (2, (rad(-8), 0, 0))]},
    })
    make_action(arm, "dance_jump", 2, "high", {
        "root": {
            "location": [(0, down), (0.3, (0, -0.08, 0)), (1, (0, 0.6, 0)), (1.7, down), (2, down)],
            "scale": [(0, (1, 1, 1)), (0.3, (1.15, 0.8, 1.15)), (0.8, (0.9, 1.15, 0.9)), (1.7, (1.1, 0.85, 1.1)), (2, (1, 1, 1))],
        },
        "arm.L": {"rotation_euler": [(0, z0), (1, (0, 0, rad(150))), (2, z0)]},
        "arm.R": {"rotation_euler": [(0, z0), (1, (0, 0, rad(-150))), (2, z0)]},
        "ear.L": {"rotation_euler": [(0, z0), (1, (rad(-35), 0, 0)), (2, z0)]},
        "ear.R": {"rotation_euler": [(0, z0), (1, (rad(-35), 0, 0)), (2, z0)]},
    })
    make_action(arm, "dance_spin", 4, "high", {
        "root": {
            "rotation_euler": [(0, z0), (2, (0, rad(180), 0)), (4, (0, rad(360), 0))],
            "location": [(0, down), (0.5, up), (1, down), (1.5, up), (2, down), (2.5, up), (3, down), (3.5, up), (4, down)],
        },
        "arm.L": {"rotation_euler": [(0, (0, 0, rad(60))), (4, (0, 0, rad(60)))]},
        "arm.R": {"rotation_euler": [(0, (0, 0, rad(-60))), (4, (0, 0, rad(-60)))]},
    })
    return arm


def save(path: str) -> None:
    build()
    bpy.ops.wm.save_as_mainfile(filepath=path)
