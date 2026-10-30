"""Builds a layered cut-out puppet (2D paper-doll style) in Blender from flat character art.

Input is a character spec (JSON): the art file, the character's box, the polygons of the parts that move
(head, arms...), where the mouth and eyes are, and a skin sample point. The builder cuts the parts out,
paints nine mouth shapes and eyelids in the sampled colours, and produces a rig with 2D dance clips, so the
result follows the same character contract as a 3D character and the normal pipeline can drive it.
"""

from __future__ import annotations

import json
import math
import os
from dataclasses import dataclass, field

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from .lipsync import VISEMES

PX = 0.01  # world units per source pixel
REF_FPB = 24


@dataclass
class Part:
    name: str
    bone: str
    rect: tuple[int, int, int, int] | None = None  # x0, y0, x1, y1 in art pixels
    polygon: list[tuple[int, int]] | None = None
    rest: bool = False  # takes every pixel no other part claimed
    depth: float = 0.0  # positive is further from the camera
    cap: tuple[int, int, int] | None = None  # (x, y, radius): a disc at the joint copied into this part but left in the rest layer too, so a rotating arm behind the body never shows a gap


@dataclass
class Bone:
    name: str
    head: tuple[int, int]
    tail: tuple[int, int]
    parent: str | None = None


@dataclass
class CharacterSpec:
    name: str
    image: str
    box: tuple[int, int, int, int]
    parts: list[Part]
    bones: list[Bone]
    mouth: tuple[int, int, int]  # centre x, centre y, width
    eyes: list[tuple[int, int, int, int]]  # centre x, centre y, radius x, radius y
    skin_sample: tuple[int, int]
    eyelid_sample: tuple[int, int] | None = None
    x: float = 0.0  # where the character stands, world units
    white_threshold: int = 232
    mouth_style: str = "boy"
    background_seeds: list[tuple[int, int]] = field(default_factory=list)  # white pockets enclosed by the drawing (inside a curled tail) that are background

    @staticmethod
    def load(path: str) -> "CharacterSpec":
        with open(path) as f:
            d = json.load(f)
        base = os.path.dirname(os.path.abspath(path))
        d["image"] = os.path.join(base, d["image"]) if not os.path.isabs(d["image"]) else d["image"]
        d["parts"] = [Part(**p) for p in d["parts"]]
        d["bones"] = [Bone(**b) for b in d["bones"]]
        d.pop("_comment", None)
        return CharacterSpec(**d)


# ---------- image work ----------


def cut_from_white(img: Image.Image, threshold: int, seeds: list[tuple[int, int]] = ()) -> Image.Image:
    """Makes the white background transparent by flood-filling from the borders (and any seeds), so white inside the character stays."""
    rgb = img.convert("RGB")
    w, h = rgb.size
    a = np.asarray(rgb).astype(np.int16)
    white = (a.min(axis=2) >= threshold) & ((a.max(axis=2) - a.min(axis=2)) < 24)
    reach = np.zeros_like(white)
    stack = [(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)] + [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)]
    for x, y in seeds:
        if 0 <= x < w and 0 <= y < h and white[y, x]:
            stack.append((x, y))
        else:
            print(f"[cutout] background seed {(x, y)} is not on a white pixel, ignored")
    stack = [(x, y) for x, y in stack if white[y, x]]
    for x, y in stack:
        reach[y, x] = True
    # iterative flood fill with a scanline-ish expansion
    while stack:
        x, y = stack.pop()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and white[ny, nx] and not reach[ny, nx]:
                reach[ny, nx] = True
                stack.append((nx, ny))
    alpha = np.where(reach, 0, 255).astype(np.uint8)
    mask = Image.fromarray(alpha).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    # Edge pixels are the character colour mixed with white; take the white back out so there is no pale fringe.
    af = np.asarray(mask).astype(np.float32)[..., None] / 255.0
    rgb = a.astype(np.float32)
    unmixed = np.where(af > 0.02, (rgb - 255.0 * (1 - af)) / np.maximum(af, 0.02), rgb)
    out = Image.fromarray(np.clip(unmixed, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    out.putalpha(mask)
    return out


def sample(img: Image.Image, xy: tuple[int, int], r: int = 4) -> tuple[int, int, int]:
    px = np.asarray(img.convert("RGB").crop((xy[0] - r, xy[1] - r, xy[0] + r, xy[1] + r))).reshape(-1, 3)
    return tuple(int(v) for v in np.median(px, axis=0))


def ring_sample(img: Image.Image, centre: tuple[int, int], rx: float, ry: float, lower_half: bool = False) -> tuple[int, int, int]:
    """Median colour of a thin ring just outside an ellipse: the skin around a mouth or an eye."""
    arr = np.asarray(img.convert("RGB"))
    pts = []
    for k in range(72):
        ang = math.pi * k / 36
        if lower_half and math.sin(ang) < 0.15:
            continue
        for f in (1.15, 1.3):
            x, y = int(centre[0] + math.cos(ang) * rx * f), int(centre[1] + math.sin(ang) * ry * f)
            if 0 <= y < arr.shape[0] and 0 <= x < arr.shape[1]:
                pts.append(arr[y, x])
    return tuple(int(v) for v in np.median(np.array(pts), axis=0))


def shade(rgb, k: float):
    return tuple(max(0, min(255, int(c * k))) for c in rgb)


def draw_mouth(letter: str, w: int, skin, style: str) -> Image.Image:
    """One mouth sprite, w pixels wide, drawn 4x and downsampled. Cartoon style: dark inside, teeth, tongue, soft outline."""
    S = 4
    W, H = int(w * 1.7) * S, int(w * 1.3) * S
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx, cy = W // 2, H // 2
    inside = (92, 28, 34, 255)
    outline = shade(skin, 0.55) + (255,)
    lip = shade(skin, 0.78) + (255,)
    teeth = (255, 253, 246, 255)
    tongue = (232, 105, 125, 255)
    ww = w * S

    def lens(width, height, teeth_h=0.0, tongue_h=0.0, round_=False):
        box = (cx - width / 2, cy - height / 2, cx + width / 2, cy + height / 2)
        d.ellipse(box, fill=inside, outline=outline, width=2 * S) if round_ else d.rounded_rectangle(box, radius=height / 2, fill=inside, outline=outline, width=2 * S)
        if teeth_h:
            th = height * teeth_h
            d.rounded_rectangle((cx - width / 2 + 3 * S, cy - height / 2 + 2 * S, cx + width / 2 - 3 * S, cy - height / 2 + th), radius=3 * S, fill=teeth)
        if tongue_h:
            tw, th = width * 0.6, height * tongue_h
            d.ellipse((cx - tw / 2, cy + height / 2 - th - 2 * S, cx + tw / 2, cy + height / 2 + th * 0.4), fill=tongue)
        # re-draw the outline on top of the tongue overflow
        d.rounded_rectangle(box, radius=height / 2, outline=outline, width=2 * S) if not round_ else d.ellipse(box, outline=outline, width=2 * S)

    if letter == "X":  # rest: a soft smile line
        d.arc((cx - ww * 0.38, cy - ww * 0.35, cx + ww * 0.38, cy + ww * 0.12), 20, 160, fill=lip, width=3 * S)
    elif letter == "A":  # closed (m, b, p)
        d.arc((cx - ww * 0.3, cy - ww * 0.3, cx + ww * 0.3, cy + ww * 0.1), 25, 155, fill=outline, width=3 * S)
        d.arc((cx - ww * 0.3, cy - ww * 0.3, cx + ww * 0.3, cy + ww * 0.1), 25, 155, fill=lip, width=1 * S)
    elif letter == "B":  # slightly open, teeth
        lens(ww * 0.7, ww * 0.26, teeth_h=0.55)
    elif letter == "C":  # open (eh)
        lens(ww * 0.8, ww * 0.45, teeth_h=0.35, tongue_h=0.25)
    elif letter == "D":  # wide open (ah)
        lens(ww * 0.95, ww * 0.75, teeth_h=0.25, tongue_h=0.35)
    elif letter == "E":  # rounded (oh)
        lens(ww * 0.55, ww * 0.55, tongue_h=0.3, round_=True)
    elif letter == "F":  # puckered (oo)
        lens(ww * 0.36, ww * 0.42, round_=True)
    elif letter == "G":  # upper teeth on lower lip (f, v)
        lens(ww * 0.7, ww * 0.3, teeth_h=0.8)
    elif letter == "H":  # l: tongue up
        lens(ww * 0.75, ww * 0.5, teeth_h=0.25)
        d.ellipse((cx - ww * 0.18, cy - ww * 0.12, cx + ww * 0.18, cy + ww * 0.2), fill=tongue)
    return im.resize((W // S, H // S), Image.LANCZOS)


def mouth_sheet(w: int, skin, style: str) -> tuple[Image.Image, dict[str, tuple[float, float, float, float]], tuple[int, int]]:
    """3x3 sprite sheet of all mouth shapes; returns the image, the UV box of each letter and the cell size in px."""
    cells = {v: draw_mouth(v, w, skin, style) for v in VISEMES}
    cw, ch = next(iter(cells.values())).size
    sheet = Image.new("RGBA", (cw * 3, ch * 3), (0, 0, 0, 0))
    uv = {}
    for i, v in enumerate(VISEMES):
        col, row = i % 3, i // 3
        sheet.paste(cells[v], (col * cw, row * ch))
        # UV origin is bottom-left in Blender
        uv[v] = (col / 3, 1 - (row + 1) / 3, (col + 1) / 3, 1 - row / 3)
    return sheet, uv, (cw, ch)


def skin_patch(size: tuple[int, int], skin, lash=True) -> Image.Image:
    """A soft-edged skin-coloured ellipse: covers the painted mouth, or closes an eye."""
    S = 4
    W, H = size[0] * S, size[1] * S
    im = Image.new("RGBA", (W, H), skin + (0,))
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).ellipse((S, S, W - S, H - S), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(2 * S))
    im.putalpha(m)
    if lash:
        d = ImageDraw.Draw(im)
        d.arc((W * 0.15, H * 0.2, W * 0.85, H * 0.8), 15, 165, fill=shade(skin, 0.45) + (255,), width=3 * S)
    return im.resize(size, Image.LANCZOS)


def part_mask(size: tuple[int, int], part: Part, origin: tuple[int, int]) -> Image.Image:
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    ox, oy = origin
    if part.polygon:
        d.polygon([(x - ox, y - oy) for x, y in part.polygon], fill=255)
    elif part.rect:
        x0, y0, x1, y1 = part.rect
        d.rectangle((x0 - ox, y0 - oy, x1 - ox, y1 - oy), fill=255)
    return m


def prepare_images(spec: CharacterSpec, out_dir: str) -> dict:
    """Cuts the art into part PNGs plus mouth and eyelid sprites. Returns everything the Blender side needs."""
    os.makedirs(out_dir, exist_ok=True)
    art = Image.open(spec.image)
    x0, y0, x1, y1 = spec.box
    crop = cut_from_white(art.crop(spec.box), spec.white_threshold, [(x - x0, y - y0) for x, y in spec.background_seeds])
    mx, my, mw = spec.mouth
    # colours come from the skin right around the mouth and the eyes, so the patches blend in
    skin = ring_sample(art, (mx, my), mw * 0.65, mw * 0.4)
    # hide the painted mouth under a skin patch before the parts are cut, so the head layer carries it
    patch = skin_patch((int(mw * 1.3), int(mw * 0.8)), skin, lash=False)
    crop.alpha_composite(patch, (mx - x0 - patch.size[0] // 2, my - y0 - patch.size[1] // 2))
    claimed = Image.new("L", crop.size, 0)
    rest_part = None
    masks = {}
    for p in spec.parts:
        if p.rest:
            rest_part = p
            continue
        m = part_mask(crop.size, p, (x0, y0))
        claimed = Image.fromarray(np.maximum(np.asarray(claimed), np.asarray(m)))
        if p.cap:
            cx, cy, r = p.cap
            ImageDraw.Draw(m).ellipse((cx - r - x0, cy - r - y0, cx + r - x0, cy + r - y0), fill=255)
        masks[p.name] = m
    if rest_part:
        masks[rest_part.name] = Image.fromarray(255 - np.asarray(claimed))
    parts = []
    for p in spec.parts:
        layer = crop.copy()
        a = Image.fromarray((np.asarray(layer.split()[3]).astype(np.uint16) * np.asarray(masks[p.name]) // 255).astype(np.uint8))
        layer.putalpha(a)
        bbox = a.getbbox()
        if not bbox:
            continue
        layer = layer.crop(bbox)
        path = os.path.join(out_dir, f"{spec.name}_{p.name}.png")
        layer.save(path)
        parts.append({"name": p.name, "bone": p.bone, "depth": p.depth, "path": path, "box": (bbox[0] + x0, bbox[1] + y0, bbox[2] + x0, bbox[3] + y0)})
    sheet, uv, cell = mouth_sheet(mw, skin, spec.mouth_style)
    sheet_path = os.path.join(out_dir, f"{spec.name}_mouths.png")
    sheet.save(sheet_path)
    eyes = []
    for i, (ex, ey, rx, ry) in enumerate(spec.eyes):
        size = (int(rx * 2.3), int(ry * 2.3))
        p = os.path.join(out_dir, f"{spec.name}_eyelid{i}.png")
        lid = sample(art, spec.eyelid_sample) if spec.eyelid_sample else ring_sample(art, (ex, ey), rx, ry, lower_half=True)
        skin_patch(size, lid).save(p)
        eyes.append({"centre": (ex, ey), "size": size, "path": p})
    return {"parts": parts, "mouth": {"path": sheet_path, "uv": uv, "cell": cell, "centre": (mx, my)}, "eyes": eyes, "foot_y": y1}


def paint_background(path: str, w: int = 1920, h: int = 1080) -> str:
    """A friendly meadow: sky gradient, sun, clouds, hills, grass."""
    im = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / h
        d.line([(0, y), (w, y)], fill=(int(120 + 80 * t), int(190 + 40 * t), int(250 - 20 * t)))
    d.ellipse((w * 0.78, h * 0.08, w * 0.9, h * 0.3), fill=(255, 230, 120))
    for cx, cy, s in [(0.15, 0.2, 1.0), (0.45, 0.14, 0.7), (0.65, 0.26, 0.85)]:
        for dx, dy, r in [(0, 0, 1), (-0.9, 0.2, 0.7), (0.9, 0.25, 0.75), (0.3, -0.4, 0.6)]:
            R = h * 0.07 * s * r
            d.ellipse((w * cx + dx * R - R, h * cy + dy * R - R, w * cx + dx * R + R, h * cy + dy * R + R), fill=(255, 255, 255))
    for cx, cy, rx, ry, col in [(0.1, 0.78, 0.45, 0.22, (120, 200, 110)), (0.6, 0.8, 0.5, 0.25, (105, 190, 100)), (0.95, 0.76, 0.4, 0.2, (130, 205, 115))]:
        d.ellipse((w * (cx - rx), h * (cy - ry), w * (cx + rx), h * (cy + ry)), fill=col)
    d.rectangle((0, h * 0.82, w, h), fill=(96, 180, 86))
    for i in range(0, w, 37):
        d.polygon([(i, h * 0.82), (i + 12, h * 0.78), (i + 24, h * 0.82)], fill=(110, 195, 95))
    im.save(path)
    return path


# ---------- Blender work ----------


def to_world(px: float, py: float, spec: CharacterSpec, foot_y: int):
    """Art pixel -> world XZ: character stands on z=0 at x=spec.x, facing -Y."""
    cx = (spec.box[0] + spec.box[2]) / 2
    return spec.x + (px - cx) * PX, (foot_y - py) * PX


def build_scene(specs: list[CharacterSpec], work_dir: str, background: bool = True) -> None:
    import bpy
    from .demo_character import bone_parent, make_action, rad

    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.fps = 24
    world = bpy.data.worlds.new("world")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.4, 0.6, 0.9, 1)

    def image_material(name: str, path: str) -> bpy.types.Material:
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        nt = m.node_tree
        for n in list(nt.nodes):
            nt.nodes.remove(n)
        out = nt.nodes.new("ShaderNodeOutputMaterial")
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = bpy.data.images.load(path)
        tex.image.alpha_mode = "STRAIGHT"
        tex.interpolation = "Cubic"
        tex.extension = "CLIP"  # no wrap-around sampling at the quad edges
        emit = nt.nodes.new("ShaderNodeEmission")
        trans = nt.nodes.new("ShaderNodeBsdfTransparent")
        mix = nt.nodes.new("ShaderNodeMixShader")
        nt.links.new(tex.outputs["Color"], emit.inputs["Color"])
        nt.links.new(tex.outputs["Alpha"], mix.inputs["Fac"])
        nt.links.new(trans.outputs[0], mix.inputs[1])
        nt.links.new(emit.outputs[0], mix.inputs[2])
        nt.links.new(mix.outputs[0], out.inputs["Surface"])
        m.blend_method = "BLEND"
        return m

    def quad_mesh(name: str, quads: list[tuple[tuple[float, float], tuple[float, float], float, tuple[float, float, float, float]]], mat) -> bpy.types.Object:
        """quads: ((x0, z0), (x1, z1), y, (u0, v0, u1, v1)) each, in world units."""
        verts, faces, uvs = [], [], []
        for (xa, za), (xb, zb), y, (u0, v0, u1, v1) in quads:
            i = len(verts)
            verts += [(xa, y, za), (xb, y, za), (xb, y, zb), (xa, y, zb)]
            faces.append((i, i + 1, i + 2, i + 3))
            uvs += [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]
        me = bpy.data.meshes.new(name)
        me.from_pydata(verts, [], faces)
        uv = me.uv_layers.new(name="UVMap")
        for li, loop in enumerate(me.loops):
            uv.data[li].uv = uvs[loop.vertex_index]
        me.materials.append(mat)
        ob = bpy.data.objects.new(name, me)
        scene.collection.objects.link(ob)
        return ob

    if background:
        bg_path = paint_background(os.path.join(work_dir, "background.png"))
        quad_mesh("background", [((-24, -0.5), (24, 26.5), 8.0, (0, 0, 1, 1))], image_material("background", bg_path))

    for spec in specs:
        data = prepare_images(spec, work_dir)
        foot = data["foot_y"]
        W = lambda px, py: to_world(px, py, spec, foot)  # noqa: E731

        bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
        arm = bpy.context.object
        arm.name = f"Rig_{spec.name}"
        eb = arm.data.edit_bones
        first = eb[0]
        first.name = spec.bones[0].name
        made = {spec.bones[0].name: first}
        for b in spec.bones:
            e = made.get(b.name) or eb.new(b.name)
            hx, hz = W(*b.head)
            tx, tz = W(*b.tail)
            e.head, e.tail = (hx, 0, hz), (tx, 0, tz)
            e.roll = 0
            made[b.name] = e
        for b in spec.bones:
            if b.parent:
                made[b.name].parent = made[b.parent]
        bpy.ops.object.mode_set(mode="OBJECT")
        arm.animation_data_create()
        for pb in arm.pose.bones:
            pb.rotation_mode = "XYZ"

        attach = []
        for p in data["parts"]:
            bx0, by0, bx1, by1 = p["box"]
            (xa, za), (xb, zb) = W(bx0, by1), W(bx1, by0)
            ob = quad_mesh(f"{spec.name}_{p['name']}", [((xa, za), (xb, zb), p["depth"] * 0.01, (0, 0, 1, 1))], image_material(f"{spec.name}_{p['name']}", p["path"]))
            attach.append((ob, p["bone"]))

        # Mouth: nine quads, all collapsed to the mouth centre, each expanded by its own shape key.
        m = data["mouth"]
        mx, mz = W(*m["centre"])
        cw, ch = m["cell"]
        hw, hh = cw * PX / 2, ch * PX / 2
        head_bone = next(p["bone"] for p in data["parts"] if p["name"] == "head")
        mouth_mat = image_material(f"{spec.name}_mouth", m["path"])
        HIDDEN, SHOWN = 0.01, -0.03  # behind the head layer (-0.02) / in front of it
        quads = [((mx - hw, mz - hh), (mx + hw, mz + hh), HIDDEN, m["uv"][v]) for v in VISEMES]
        mouth = quad_mesh(f"{spec.name}_mouth", quads, mouth_mat)
        mouth.shape_key_add(name="Basis", from_mix=False)
        for i, v in enumerate(VISEMES):
            kb = mouth.shape_key_add(name=v, from_mix=False)
            kb.value = 0.0
            for j in range(4):
                kb.data[i * 4 + j].co.y = SHOWN
        attach.append((mouth, head_bone))

        # Eyelids: quads that are flat lines at the top of each eye, opened by the "blink" key.
        if data["eyes"]:
            quads = []
            for e in data["eyes"]:
                ex, ez = W(*e["centre"])
                hw, hh = e["size"][0] * PX / 2, e["size"][1] * PX / 2
                quads.append(((ex - hw, ez - hh), (ex + hw, ez + hh), HIDDEN, (0, 0, 1, 1)))
            lids = quad_mesh(f"{spec.name}_eyelids", quads, image_material(f"{spec.name}_eyelid", data["eyes"][0]["path"]))
            lids.shape_key_add(name="Basis", from_mix=False)
            kb = lids.shape_key_add(name="blink", from_mix=False)
            kb.value = 0.0
            for d in kb.data:
                d.co.y = SHOWN
            attach.append((lids, head_bone))

        # Ground shadow.
        sx, _ = W((spec.box[0] + spec.box[2]) / 2, 0)
        width = (spec.box[2] - spec.box[0]) * PX
        shadow_path = os.path.join(work_dir, "shadow.png")
        if not os.path.exists(shadow_path):
            s = Image.new("RGBA", (256, 128), (0, 0, 0, 0))
            mm = Image.new("L", (256, 128), 0)
            ImageDraw.Draw(mm).ellipse((20, 20, 236, 108), fill=90)
            s.putalpha(mm.filter(ImageFilter.GaussianBlur(10)))
            s.save(shadow_path)
        bpy.ops.mesh.primitive_plane_add(size=1, location=(sx, 0.02, 0.01), rotation=(math.radians(90), 0, 0))
        sh = bpy.context.object
        sh.name = f"{spec.name}_shadow"
        sh.scale = (width * 0.9, width * 0.3, 1)
        sh.data.materials.append(image_material(f"{spec.name}_shadow", shadow_path))
        attach.append((sh, spec.bones[0].name))

        add_2d_dances(arm, spec, make_action, rad)
        for ob, bone in attach:
            bone_parent(ob, arm, bone)


def add_2d_dances(arm, spec: CharacterSpec, make_action, rad) -> None:
    """Dance loops for a cut-out: in-plane rotation is the bones' local Z, 'up' along a bone is local Y."""
    names = {b.name for b in spec.bones}
    arms = [n for n in ("arm.L", "arm.R") if n in names]
    has = lambda n: n in names  # noqa: E731
    z0 = (0, 0, 0)
    up, down = (0, 0.15, 0), (0, 0, 0)

    def both(fn):
        return {a: fn(1 if a.endswith(".L") else -1) for a in arms}

    k = {"root": {"location": [(0, down), (0.5, up), (1, down)]}}
    if has("head"):
        k["head"] = {"rotation_euler": [(0, z0), (0.5, (0, 0, rad(4))), (1, z0)]}
    make_action(arm, "dance_bounce", 1, "low", k)

    k = {"root": {"location": [(0, down), (0.5, (0, 0.06, 0)), (1, down), (1.5, (0, 0.06, 0)), (2, down), (2.5, (0, 0.06, 0)), (3, down), (3.5, (0, 0.06, 0)), (4, down)]}}
    if "arm.R" in arms:
        k["arm.R"] = {"rotation_euler": [(0, z0), (1, (0, 0, rad(150))), (1.5, (0, 0, rad(125))), (2, (0, 0, rad(160))), (2.5, (0, 0, rad(125))), (3, (0, 0, rad(150))), (4, z0)]}
    if has("head"):
        k["head"] = {"rotation_euler": [(0, z0), (2, (0, 0, rad(-8))), (4, z0)]}
    make_action(arm, "dance_wave", 4, "low", k)

    k = {"root": {"location": [(0, down), (0.5, (0, 0.08, 0)), (1, down), (1.5, (0, 0.08, 0)), (2, down)]}}
    if has("body"):
        k["body"] = {"rotation_euler": [(0, (0, 0, rad(-7))), (1, (0, 0, rad(7))), (2, (0, 0, rad(-7)))]}
    if has("head"):
        k["head"] = {"rotation_euler": [(0, (0, 0, rad(6))), (1, (0, 0, rad(-6))), (2, (0, 0, rad(6)))]}
    k.update(both(lambda s: {"rotation_euler": [(0, (0, 0, rad(18 * s))), (1, (0, 0, rad(-18 * s))), (2, (0, 0, rad(18 * s)))]}))
    make_action(arm, "dance_sway", 2, "mid", k)

    k = {"root": {"location": [(0, down), (0.5, up), (1, down), (1.5, up), (2, down)]}}
    k.update(both(lambda s: {"rotation_euler": [(0, (0, 0, rad(95 * s))), (0.5, (0, 0, rad(140 * s))), (1, (0, 0, rad(95 * s))), (1.5, (0, 0, rad(140 * s))), (2, (0, 0, rad(95 * s)))]}))
    if has("head"):
        k["head"] = {"rotation_euler": [(0, (0, 0, rad(-5))), (1, (0, 0, rad(5))), (2, (0, 0, rad(-5)))]}
    make_action(arm, "dance_clap", 2, "mid", k)

    k = {"root": {
        "location": [(0, down), (0.3, (0, -0.06, 0)), (1, (0, 0.7, 0)), (1.7, down), (2, down)],
        "scale": [(0, (1, 1, 1)), (0.3, (1.12, 0.85, 1)), (0.8, (0.92, 1.12, 1)), (1.7, (1.1, 0.88, 1)), (2, (1, 1, 1))],
    }}
    k.update(both(lambda s: {"rotation_euler": [(0, z0), (1, (0, 0, rad(165 * s))), (2, z0)]}))
    make_action(arm, "dance_jump", 2, "high", k)

    k = {"root": {
        "scale": [(0, (1, 1, 1)), (1, (0.05, 1, 1)), (2, (-1, 1, 1)), (3, (-0.05, 1, 1)), (4, (1, 1, 1))],
        "location": [(0, down), (0.5, up), (1, down), (1.5, up), (2, down), (2.5, up), (3, down), (3.5, up), (4, down)],
    }}
    k.update(both(lambda s: {"rotation_euler": [(0, (0, 0, rad(60 * s))), (4, (0, 0, rad(60 * s)))]}))
    make_action(arm, "dance_spin", 4, "high", k)

    k = {"root": {"rotation_euler": [(0, (0, 0, rad(-14))), (2, (0, 0, rad(14))), (4, (0, 0, rad(-14)))], "location": [(0, down), (1, (0, 0.2, 0)), (2, down), (3, (0, 0.2, 0)), (4, down)]}}
    k.update(both(lambda s: {"rotation_euler": [(0, (0, 0, rad(150 * s))), (4, (0, 0, rad(150 * s)))]}))
    make_action(arm, "dance_swing", 4, "mid", k)


def build(spec_paths: list[str], out_blend: str, work_dir: str, background: bool = True) -> None:
    import bpy

    specs = [CharacterSpec.load(p) for p in spec_paths]
    os.makedirs(work_dir, exist_ok=True)
    build_scene(specs, work_dir, background)
    bpy.ops.file.pack_all()  # textures travel inside the .blend
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(out_blend))
