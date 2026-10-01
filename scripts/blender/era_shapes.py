"""Model the ATMOS era shapes in Blender and bake them into point clouds.

Run headless:
  blender -b --factory-startup -P scripts/blender/era_shapes.py

For every shape this builds a small procedural model, keeps a .glb of it in
design/3d/ for reference, and samples N points on its surface (area weighted)
into public/shapes/<name>.bin as little-endian int16 xyz (divide by 32767).
The particle field on the site morphs between these clouds.
"""
import math
import os
import random
import struct
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector, noise

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "public", "shapes")
GLB = os.path.join(ROOT, "design", "3d")
HAND_GLB = os.path.join(ROOT, "design", "source", "rigged_lowpoly_hand.glb")
N = 12000
random.seed(26)
np.random.seed(26)


# ---------------------------------------------------------------- helpers
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def obj_from_bm(bm, name):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def add(op, **kw):
    op(**kw)
    return bpy.context.active_object


def cyl(r, depth, loc=(0, 0, 0), rot=(0, 0, 0), verts=48):
    return add(bpy.ops.mesh.primitive_cylinder_add, radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)


def box(size, loc=(0, 0, 0), rot=(0, 0, 0)):
    ob = add(bpy.ops.mesh.primitive_cube_add, size=1, location=loc, rotation=rot)
    ob.scale = size
    return ob


def torus(R, r, loc=(0, 0, 0), rot=(0, 0, 0)):
    return add(bpy.ops.mesh.primitive_torus_add, major_radius=R, minor_radius=r, location=loc, rotation=rot,
               major_segments=96, minor_segments=12)


def sphere(r, loc=(0, 0, 0), seg=24):
    return add(bpy.ops.mesh.primitive_uv_sphere_add, radius=r, location=loc, segments=seg, ring_count=seg // 2)


def gear(R, teeth, thick, loc=(0, 0, 0), rot=(0, 0, 0), hole=0.2, spokes=5, depth=0.12):
    """Flat spur gear: toothed rim, hub and spokes, extruded to `thick`."""
    bm = bmesh.new()
    rim_pts = []
    step = 2 * math.pi / teeth
    for i in range(teeth):
        a = i * step
        for da, rr in ((0, R * (1 - depth)), (step * 0.15, R), (step * 0.45, R), (step * 0.6, R * (1 - depth))):
            rim_pts.append((math.cos(a + da) * rr, math.sin(a + da) * rr))
    inner_r = R * (1 - depth) * 0.82
    # outer toothed ring
    outer = [bm.verts.new((x, y, 0)) for x, y in rim_pts]
    ring_in = [bm.verts.new((math.cos(i / 96 * 2 * math.pi) * inner_r, math.sin(i / 96 * 2 * math.pi) * inner_r, 0)) for i in range(96)]
    f_out = bm.faces.new(outer)
    f_in = bm.faces.new(ring_in)
    bmesh.ops.delete(bm, geom=[f_in], context="FACES_ONLY")
    ob = obj_from_bm(bm, "gear_rim")
    # hub + spokes as separate solids
    parts = [ob]
    parts.append(cyl(R * hole, thick * 1.4, verts=32))
    for s in range(spokes):
        a = s / spokes * 2 * math.pi
        sp = box((inner_r, R * 0.07, thick), loc=(math.cos(a) * inner_r / 2, math.sin(a) * inner_r / 2, 0), rot=(0, 0, a))
        parts.append(sp)
    g = join(parts, "gear")
    # extrude the rim face into a solid
    bpy.context.view_layer.objects.active = g
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.object.mode_set(mode="OBJECT")
    mod = g.modifiers.new("solid", "SOLIDIFY")
    mod.thickness = thick
    mod.offset = 0
    apply_mods(g)
    g.location = loc
    g.rotation_euler = rot
    return g


def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    ob = bpy.context.active_object
    ob.name = name
    return ob


def apply_mods(ob):
    bpy.context.view_layer.objects.active = ob
    for m in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


def all_meshes():
    return [o for o in bpy.context.scene.objects if o.type == "MESH"]


def sample(objs, n, weights=None):
    """Area-weighted surface samples from evaluated meshes, world space."""
    deps = bpy.context.evaluated_depsgraph_get()
    tris, areas = [], []
    for i, ob in enumerate(objs):
        ev = ob.evaluated_get(deps)
        me = ev.to_mesh()
        me.calc_loop_triangles()
        mw = ob.matrix_world
        co = np.array([mw @ v.co for v in me.vertices])
        w = 1.0 if weights is None else weights[i]
        for t in me.loop_triangles:
            a, b, c = co[t.vertices[0]], co[t.vertices[1]], co[t.vertices[2]]
            area = np.linalg.norm(np.cross(b - a, c - a)) * 0.5 * w
            if area > 0:
                tris.append((a, b, c))
                areas.append(area)
        ev.to_mesh_clear()
    tris = np.array(tris)
    p = np.array(areas) / np.sum(areas)
    idx = np.random.choice(len(tris), n, p=p)
    u, v = np.random.rand(n, 1), np.random.rand(n, 1)
    flip = (u + v) > 1
    u[flip], v[flip] = 1 - u[flip], 1 - v[flip]
    t = tris[idx]
    return t[:, 0] + u * (t[:, 1] - t[:, 0]) + v * (t[:, 2] - t[:, 0])


def normalise(pts):
    lo, hi = pts.min(0), pts.max(0)
    c = (lo + hi) / 2
    pts = pts - c
    return pts / np.abs(pts).max()


def save(name, pts):
    os.makedirs(OUT, exist_ok=True)
    pts = normalise(pts)
    # Blender is Z-up; the web is Y-up
    web = np.stack([pts[:, 0], pts[:, 2], -pts[:, 1]], axis=1)
    np.random.shuffle(web)
    q = np.clip(np.round(web * 32767), -32767, 32767).astype("<i2")
    with open(os.path.join(OUT, f"{name}.bin"), "wb") as f:
        f.write(q.tobytes())
    os.makedirs(GLB, exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=os.path.join(GLB, f"{name}.glb"), export_format="GLB", use_selection=True,
                              export_apply=True)
    print(f"SHAPE {name}: {len(q)} points")


# ---------------------------------------------------------------- shapes
def shape_hands():
    """The logo's pose: a human hand reaching down from the top-left, a machine
    hand reaching up from the bottom-right, fingertips almost touching."""
    reset()
    bpy.ops.import_scene.gltf(filepath=HAND_GLB)
    meshes = all_meshes()
    for m in meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    hand = bpy.context.active_object
    # drop the armature so the mesh keeps its rest pose
    for o in list(bpy.context.scene.objects):
        if o.type == "ARMATURE":
            bpy.data.objects.remove(o)
    hand.modifiers.clear()
    hand.parent = None
    bpy.context.view_layer.objects.active = hand
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # centre on the wrist end so we can place it by its base
    bb = [hand.matrix_world @ Vector(c) for c in hand.bound_box]
    size = max((max(v[i] for v in bb) - min(v[i] for v in bb)) for i in range(3))
    hand.scale = (2.0 / size,) * 3
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    hand.location = (0, 0, 0)

    # the GLB rests with its fingers pointing down the screen (-Z here). The human
    # hand comes in from the top-left, tilted so the fingers point down-right;
    # the machine hand is its mirror image turned half a circle, reaching up-left.
    top = hand
    bottom = hand.copy()
    bottom.data = hand.data.copy()
    bpy.context.scene.collection.objects.link(bottom)
    top.rotation_euler = (math.radians(90), math.radians(-40), 0)
    top.location = (-0.62, 0, 0.62)
    bpy.context.view_layer.update()
    mirror = Matrix.Scale(-1, 4, Vector((1, 0, 0)))
    bottom.matrix_world = Matrix.Rotation(math.pi, 4, "Y") @ mirror @ top.matrix_world
    bottom.location = (0.62, 0, -0.62)
    bpy.context.view_layer.update()
    pts = sample([top, bottom], N)
    save("hands", pts)


def shape_watch():
    reset()
    parts = [
        torus(1.0, 0.07, rot=(math.radians(90), 0, 0)),           # case
        torus(0.93, 0.025, rot=(math.radians(90), 0, 0), loc=(0, -0.05, 0)),
        cyl(0.07, 0.16, loc=(0, 0, 1.12)),                        # crown stem
        torus(0.16, 0.03, loc=(0, 0, 1.32), rot=(math.radians(90), 0, 0)),  # bow
    ]
    # chapter ring ticks
    for i in range(60):
        a = i / 60 * 2 * math.pi
        L = 0.1 if i % 5 == 0 else 0.05
        r = 0.86 - L / 2
        parts.append(box((0.015, 0.01, L), loc=(math.sin(a) * r, 0, math.cos(a) * r), rot=(0, a, 0)))
    # skeleton movement
    for R, T, x, z, y in ((0.42, 36, -0.05, -0.05, 0.05), (0.24, 20, 0.44, 0.3, 0.1), (0.17, 14, -0.45, 0.38, 0.12),
                          (0.2, 16, -0.35, -0.48, 0.1), (0.13, 12, 0.36, -0.45, 0.14)):
        parts.append(gear(R, T, 0.04, loc=(x, y, z), rot=(math.radians(90), 0, random.random())))
    # balance wheel + hands
    parts.append(torus(0.16, 0.012, loc=(0.38, 0.16, -0.12), rot=(math.radians(90), 0, 0)))
    parts.append(box((0.03, 0.02, 0.62), loc=(0.12, -0.08, 0.26), rot=(0, math.radians(25), 0)))
    parts.append(box((0.04, 0.02, 0.42), loc=(-0.15, -0.09, 0.12), rot=(0, math.radians(-50), 0)))
    save_parts("watch", parts)


def shape_locomotive():
    reset()
    parts = [
        cyl(0.32, 1.7, loc=(0.1, 0, 0.35), rot=(0, math.radians(90), 0)),      # boiler
        cyl(0.34, 0.25, loc=(1.0, 0, 0.35), rot=(0, math.radians(90), 0)),     # smokebox
        cyl(0.09, 0.45, loc=(0.85, 0, 0.85)),                                  # chimney
        cyl(0.16, 0.06, loc=(0.85, 0, 1.07)),                                  # chimney lip
        sphere(0.13, loc=(0.2, 0, 0.7)),                                       # dome
        box((0.6, 0.78, 0.75), loc=(-1.05, 0, 0.62)),                          # cab
        box((0.72, 0.9, 0.06), loc=(-1.05, 0, 1.03)),                          # cab roof
        box((2.5, 0.7, 0.12), loc=(-0.1, 0, -0.02)),                           # frame
        box((0.35, 0.6, 0.3), loc=(1.35, 0, -0.1), rot=(0, math.radians(35), 0)),  # cowcatcher
    ]
    for side in (-0.38, 0.38):
        for x in (-0.55, 0.0, 0.55):
            parts.append(torus(0.24, 0.035, loc=(x, side, -0.2), rot=(math.radians(90), 0, 0)))
            for s in range(8):
                a = s / 8 * math.pi
                parts.append(box((0.47, 0.02, 0.02), loc=(x, side, -0.2), rot=(0, a, 0)))
        parts.append(box((1.2, 0.03, 0.05), loc=(0.0, side * 1.08, -0.12)))  # coupling rod
        parts.append(cyl(0.11, 0.45, loc=(1.0, side * 1.15, 0.0), rot=(0, math.radians(90), 0)))  # cylinder
    # steam
    for i in range(7):
        parts.append(sphere(0.07 + i * 0.012, loc=(0.85 - i * 0.14, 0, 1.2 + i * 0.07 + random.uniform(-0.04, 0.04)), seg=16))
    save_parts("locomotive", parts)


def shape_city():
    """A city skyline growing out of a circuit board."""
    reset()
    board = [box((2.4, 2.4, 0.05), loc=(0, 0, 0))]
    parts = []
    rng = random.Random(4)
    # traces
    for i in range(26):
        x0, y0 = rng.uniform(-1.1, 1.1), rng.uniform(-1.1, 1.1)
        horiz = rng.random() < 0.5
        L = rng.uniform(0.3, 1.1)
        size = (L, 0.018, 0.02) if horiz else (0.018, L, 0.02)
        parts.append(box(size, loc=(x0, y0, 0.035)))
        parts.append(cyl(0.035, 0.03, loc=(x0 + (L / 2 if horiz else 0), y0 + (0 if horiz else L / 2), 0.04), verts=16))
    # the chip
    parts.append(box((0.5, 0.5, 0.08), loc=(0, 0, 0.07)))
    for i in range(10):
        for s in (-1, 1):
            parts.append(box((0.02, 0.1, 0.02), loc=(-0.22 + i * 0.05, s * 0.3, 0.04)))
            parts.append(box((0.1, 0.02, 0.02), loc=(s * 0.3, -0.22 + i * 0.05, 0.04)))
    # skyline: taller towards the centre
    for gx in range(-5, 6):
        for gy in range(-5, 6):
            x, y = gx * 0.2, gy * 0.2
            d = math.hypot(x, y)
            if d < 0.28 or rng.random() < 0.35:
                continue
            h = max(0.12, max(0.0, 1.35 - d) ** 1.4 * rng.uniform(0.6, 1.9))
            w = rng.uniform(0.08, 0.14)
            parts.append(box((w, w, h), loc=(x, y, 0.025 + h / 2)))
            if h > 0.8 and rng.random() < 0.5:
                parts.append(cyl(0.008, 0.25, loc=(x, y, 0.025 + h + 0.12), verts=8))
    # the board keeps only a light scatter; the towers and traces carry the shape
    weights = [0.18] + [2.2 if p.dimensions.z > 0.1 else 0.9 for p in parts]
    save_parts("city", board + parts, weights=weights)


def shape_dna():
    reset()
    parts = []
    turns, H, R = 2.2, 2.6, 0.42
    steps = 70
    for i in range(steps):
        t = i / (steps - 1)
        z = (t - 0.5) * H
        a = t * turns * 2 * math.pi
        p1 = Vector((math.cos(a) * R, math.sin(a) * R, z))
        p2 = Vector((math.cos(a + math.pi) * R, math.sin(a + math.pi) * R, z))
        parts.append(sphere(0.045, loc=p1, seg=12))
        parts.append(sphere(0.045, loc=p2, seg=12))
        if i % 2 == 0:
            mid = (p1 + p2) / 2
            d = p2 - p1
            rung = cyl(0.014, d.length, loc=mid, verts=8)
            rung.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
            parts.append(rung)
    # backbone tubes via a curve
    for off in (0, math.pi):
        curve = bpy.data.curves.new("strand", "CURVE")
        curve.dimensions = "3D"
        curve.bevel_depth = 0.025
        sp = curve.splines.new("POLY")
        sp.points.add(199)
        for i in range(200):
            t = i / 199
            a = t * turns * 2 * math.pi + off
            sp.points[i].co = (math.cos(a) * R, math.sin(a) * R, (t - 0.5) * H, 1)
        ob = bpy.data.objects.new("strand", curve)
        bpy.context.scene.collection.objects.link(ob)
        bpy.context.view_layer.objects.active = ob
        ob.select_set(True)
        bpy.ops.object.convert(target="MESH")
        parts.append(bpy.context.active_object)
    save_parts("dna", parts)


def shape_brain():
    """Two cortex hemispheres with folds, wired with a few neural tracts."""
    reset()
    parts = []
    for side in (-1, 1):
        ob = sphere(1.0, loc=(side * 0.6, 0, 0), seg=128)
        ob.scale = (0.56, 1.0, 0.7)
        bpy.ops.object.transform_apply(scale=True)
        me = ob.data
        for v in me.vertices:
            p = v.co
            n = noise.noise(Vector((p.x * 5, p.y * 5, p.z * 5)))
            ridge = 1 - abs(noise.noise(Vector((p.x * 3.2 + 7, p.y * 3.2, p.z * 3.2))))
            v.co = p + p.normalized() * (0.04 * n + 0.13 * ridge ** 4)
        parts.append(ob)
    # cerebellum + stem
    cb = sphere(0.42, loc=(0, 0.72, -0.5), seg=48)
    cb.scale = (1.2, 0.8, 0.6)
    parts.append(cb)
    parts.append(cyl(0.16, 0.7, loc=(0, 0.45, -0.9), rot=(math.radians(20), 0, 0)))
    # oversample, then keep points on the gyri ridges so the folds read as lines
    pts = sample(parts, N * 6)
    ridge = np.array([1 - abs(noise.noise(Vector((p[0] * 3.2 + 7, p[1] * 3.2, p[2] * 3.2)))) for p in pts])
    cortex = np.abs(pts[:, 0]) > 0.04  # leave the longitudinal fissure open
    keep = pts[(ridge > 0.84) & cortex]
    rest = pts[(ridge <= 0.84) & cortex]
    extra = rest[np.random.choice(len(rest), max(0, N - len(keep)), replace=False)] if len(keep) < N else rest[:0]
    save("brain", np.concatenate([keep[:N], extra])[:N])


def shape_rings():
    """Concentric rings, the brass ring of the logo repeated outwards."""
    reset()
    parts = []
    for i, R in enumerate((0.35, 0.55, 0.75, 1.0)):
        parts.append(torus(R, 0.012 + i * 0.004, rot=(math.radians(90), 0, 0)))
    save_parts("rings", parts, weights=[0.8, 1.0, 1.2, 1.6])


def save_parts(name, parts, weights=None):
    parts = [p for p in parts if p and p.type == "MESH"]
    pts = sample(parts, N, weights)
    save(name, pts)


SHAPES = {
    "hands": shape_hands,
    "watch": shape_watch,
    "locomotive": shape_locomotive,
    "city": shape_city,
    "dna": shape_dna,
    "brain": shape_brain,
    "rings": shape_rings,
}

if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    for name in argv or SHAPES:
        SHAPES[name]()
