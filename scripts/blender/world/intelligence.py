"""Chamber 5, 2026: intelligence, as a cast-brass anatomical brain.

A museum model of the human brain on a lab stand: two cerebral hemispheres
with winding gyri and sharp sulci, a Sylvian fissure above each temporal lobe,
a central sulcus, the cerebellum with its fine horizontal folia, and the brain
stem running down into a turned brass cradle. An iron base and a steel column
carry the cradle, and two thin steel arms rise from it to touch the underside
of the temporal lobes, the way a mount would hold a specimen.

The folds are real geometry. The gyri are grown as a Turing pattern over each
hemisphere, a maze of bands that all share one width; every boundary between
two bands is a sharp V sulcus and every crown stays round, so the blueprint
pass draws the folds as ink lines. Each hemisphere is folded on a dense mesh
and then decimated, which keeps the creases straight. The site reads two
things from the root's extras. "nodes" is a flat list with stride 7, x, y, z,
nx, ny, nz, region: about 670 neurons sitting on gyrus crowns, spread at least
0.35 apart and lifted 0.04 off the surface (region 0 left hemisphere, 1 right,
2 cerebellum). "spark" is the point just in front of the brain stem, halfway
down, where a thought starts. The thousands of connections between neurons are
drawn by the site, so signals can travel along them.
"""
import math
import random
import os

import bmesh
import bpy
import numpy as np
from mathutils import Vector, noise

from common import empty, lathe, mesh_obj, rod, tube_along

DBG = os.environ.get("DBG", "")
JOIN_STATIC = True

GAP = 0.12            # width of the longitudinal fissure
RES = 180             # cube-sphere cells along one edge, per hemisphere, before decimation (even)
KEEP = 0.22           # share of the hemisphere's triangles kept by the decimation
FOLD = 0.19           # gyrus depth
FREQ = 1.8            # frequency of the noise the pattern grows from
WARP = 0.55           # how far the folds meander
WAVE = 1.05           # crown to crown across two neighbouring gyri
ROUNDS = 12           # rounds of the pattern growth
STRETCH = 0.72        # folds run longer front to back than across
SOFT = 0.35           # rounds the very bottom of each sulcus (share of the gyrus height)
SPACING = 0.35        # minimum distance between neurons

STEM_TOP = Vector((0.0, 1.05, -0.3))
STEM_BOT = Vector((0.0, 0.5, -3.75))
STEM_PROFILE = [(0.0, 0.0), (0.34, 0.0), (0.38, 0.1), (0.41, 0.8), (0.47, 1.6), (0.54, 2.2), (0.68, 2.75),
                (0.78, 3.05), (0.76, 3.3), (0.0, 3.49)]
COL = (0.0, 0.5)      # stand axis (x, y)


def smooth(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- meshes
def cube_sphere(n):
    """A quad sphere from a subdivided cube, with even cells so a ring of
    vertices lies exactly on the x = 0 plane."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=2.0)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=n - 1, use_grid_fill=True)
    for v in bm.verts:
        x, y, z = v.co
        v.co = (x * math.sqrt(max(0.0, 1 - y * y / 2 - z * z / 2 + y * y * z * z / 3)),
                y * math.sqrt(max(0.0, 1 - z * z / 2 - x * x / 2 + z * z * x * x / 3)),
                z * math.sqrt(max(0.0, 1 - x * x / 2 - y * y / 2 + x * x * y * y / 3)))
    return bm


def decimate(bm, keep):
    """Reduce a dense mesh to `keep` of its triangles. Collapsing by error
    keeps edges along the creases and spends few triangles on the crowns, so
    the sulci stay clean sharp lines instead of stair-stepping."""
    me = bpy.data.meshes.new("dense")
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new("dense", me)
    bpy.context.scene.collection.objects.link(ob)
    mod = ob.modifiers.new("decimate", "DECIMATE")
    mod.ratio = keep
    mod.use_collapse_triangulate = True
    low = bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(ob)
    bpy.data.meshes.remove(me)
    out = bmesh.new()
    out.from_mesh(low)
    bpy.data.meshes.remove(low)
    return out


def seg_dist(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
    return (p - (a + ab * t)).length


def poly_dist(p, pts):
    return min(seg_dist(p, pts[i], pts[i + 1]) for i in range(len(pts) - 1))


def cerebrum_shape(ux, uy, uz):
    """Unit direction (right hemisphere, ux >= 0, front is -y) to a point on
    the cerebrum: boxy frontal lobe, tall parietal crown, tapering occipital
    lobe, temporal lobe bulging down and outward."""
    back = smooth(0.0, 1.0, uy) ** 1.2
    front = smooth(0.0, 1.0, -uy)
    p = 0.84
    sx = 1.0 - 0.22 * back - 0.10 * front * front
    X = 3.5 * (ux ** p) * sx
    Y = 4.3 * math.copysign(abs(uy) ** 0.88, uy)
    zc = 2.4 + 0.4 * uz
    Z = 1.2 + zc * math.copysign(abs(uz) ** 0.92, uz) * (1.0 - 0.30 * back)
    Z += 0.5 * math.exp(-(((Y - 0.6) / 2.4) ** 2)) * max(uz, 0.0) ** 1.5
    lat = smooth(0.2, 0.75, ux)
    low = smooth(-0.02, -0.6, uz)
    w = lat * low * math.exp(-(((Y - 0.3) / 2.4) ** 2))
    Z -= 1.5 * w
    X += 0.4 * w
    Y -= 0.55 * w * front
    return Vector((X, Y, Z))


SYLVIAN = [Vector(p) for p in ((-3.3, 0.0), (-1.9, 0.4), (0.0, 0.9), (1.8, 1.5), (3.2, 2.3))]
CENTRAL = [Vector(p) for p in ((0.35, -0.2, 4.1), (1.4, -0.05, 3.7), (2.6, 0.25, 2.8), (3.3, 0.55, 1.9))]
W1, W2, W3 = Vector((11.0, 3.0, 7.0)), Vector((-5.0, 19.0, 2.0)), Vector((3.0, -8.0, 23.0))


def fold_field(q):
    """One band of domain-warped noise: its zero set meanders over the
    surface and becomes the sulci. Squeezed along y so most gyri run front
    to back, as the frontal and temporal ones do."""
    q = Vector((q.x, q.y * STRETCH, q.z))
    a = q * 0.42
    r = q + Vector((noise.noise(a + W1), noise.noise(a + W2), noise.noise(a + W3))) * WARP
    return noise.noise(r * FREQ)


def labyrinth(bm, seed):
    """Grow a Turing pattern over the surface: blur the field at two widths,
    keep the difference, push it back to +-1, repeat. It settles into a maze
    of bands that all share one width, the way gyri do. Each band becomes a
    gyrus and every boundary between two bands a sulcus. Returns the field,
    0 on a sulcus and +-1 across a crown."""
    bm.verts.index_update()
    n = len(bm.verts)
    pts = np.array([v.co[:] for v in bm.verts])
    ends = np.array([(e.verts[0].index, e.verts[1].index) for e in bm.edges])
    a, b = ends[:, 0], ends[:, 1]
    w = 1.0 / np.maximum(((pts[a] - pts[b]) ** 2).sum(1), 0.02 ** 2)
    dt = 0.9 / (np.bincount(a, w, n) + np.bincount(b, w, n)).max()

    def blur(u, t):
        for _ in range(int(math.ceil(t / dt))):
            f = w * (u[b] - u[a])
            u = u + dt * (np.bincount(a, f, n) - np.bincount(b, f, n))
        return u

    s1 = WAVE / 6.54          # a difference of Gaussians at s1 and 2 * s1 favours bands of WAVE / 2
    t1, t2 = s1 * s1 / 2, 2 * s1 * s1
    u = np.array(seed)
    for _ in range(ROUNDS):
        g1 = blur(u, t1)
        d = g1 - blur(g1, t2 - t1)
        d -= d.mean()
        u = np.tanh(1.6 * d / d.std())
    u = blur(u, t1)
    return u / np.percentile(np.abs(u), 90)


def fold_height(f):
    """0 on a sulcus, rising to 1 on the crown of a gyrus: the walls meet in a
    V with a slightly rounded bottom, the crown is a round arch."""
    g = min(1.0, (math.hypot(f, SOFT) - SOFT) / (math.hypot(1.0, SOFT) - SOFT))
    return 1.0 - (1.0 - g) ** 1.6


def hemisphere(sign):
    """One cerebral hemisphere: shaped, carved by the fissures, folded."""
    bm = cube_sphere(RES)
    gone = [f for f in bm.faces if f.calc_center_median().x < 0]
    bmesh.ops.delete(bm, geom=gone, context="FACES")
    off = Vector((0.0, 0.0, 0.0)) if sign > 0 else Vector((17.41, 5.23, -9.31))
    for v in bm.verts:
        u = v.co.normalized()
        v.co = cerebrum_shape(max(u.x, 0.0), u.y, u.z)
    bm.normal_update()
    verts = list(bm.verts)
    base = [v.co.copy() for v in verts]
    norm = [v.normal.copy() for v in verts]
    field = labyrinth(bm, [fold_field(p + off) for p in base])
    crown = []
    for v, p, nrm, f in zip(verts, base, norm, field):
        g = fold_height(f)
        depth = 0.0 if "nofold" in DBG else FOLD * (g - 1.0)
        lateral = smooth(1.8, 2.8, p.x)
        d = poly_dist(Vector((p.y, p.z)), SYLVIAN)
        carve = -0.62 * max(0.0, 1.0 - (math.hypot(d, 0.08) - 0.08) / 0.6) ** 2 * lateral
        dc = poly_dist(p, CENTRAL)
        carve += -0.3 * max(0.0, 1.0 - (math.hypot(dc, 0.08) - 0.08) / 0.48) ** 2 * smooth(0.0, 0.6, p.x)
        near = max(0.0, 1.0 - d / 0.5) * lateral
        v.co = p + nrm * (depth * (1.0 - 0.8 * near) + carve)
        crown.append(g if near < 0.3 and dc > 0.4 else 0.0)
    for v in verts:
        v.co.x = max(v.co.x, 0.0) + GAP / 2
    bnd = [e for e in bm.edges if e.is_boundary]
    bmesh.ops.triangle_fill(bm, edges=bnd, use_beauty=True)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if sign < 0:
        # mirror, then turn the faces so they still face outward
        for v in bm.verts:
            v.co.x = -v.co.x
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    bm.normal_update()
    data = [(v.co.copy(), v.normal.copy(), crown[i]) for i, v in enumerate(verts)]
    return decimate(bm, KEEP), data


def cerebellum():
    """Two lobes with tight horizontal folia and a notch between them."""
    bm = cube_sphere(64)
    c = Vector((0.0, 2.1, -1.0))
    for v in bm.verts:
        u = v.co.normalized()
        tail = smooth(-0.2, 1.0, u.y)
        v.co = c + Vector((1.7 * math.copysign(abs(u.x) ** 0.85, u.x) * (1 - 0.1 * tail),
                           1.3 * u.y, 0.95 * math.copysign(abs(u.z) ** 0.9, u.z)))
    bm.normal_update()
    verts = list(bm.verts)
    base = [v.co.copy() for v in verts]
    norm = [v.normal.copy() for v in verts]
    crown = []
    for v, p, nrm in zip(verts, base, norm):
        ph = (p.z * 5.2 + 0.28 * noise.noise(Vector((p.x * 0.9, p.y * 0.9, p.z * 0.6)))
              + 0.12 * p.y)
        s = abs(math.sin(math.pi * ph))
        depth = 0.075 * (s * (2.0 - s) - 1.0)
        notch = -0.2 * max(0.0, 1.0 - abs(p.x) / 0.22) * smooth(-0.2, 0.8, p.y - c.y)
        v.co = p + nrm * (depth + notch)
        crown.append(s)
    bm.normal_update()
    data = [(v.co.copy(), v.normal.copy(), crown[i]) for i, v in enumerate(verts)]
    return decimate(bm, 0.3), data


# ---------------------------------------------------------------- neurons
def pick(data, count, rng, region_of, ok):
    pts = np.array([d[0][:] for d in data])
    order = sorted((i for i, d in enumerate(data) if d[2] > 0.5 and ok(d)),
                   key=lambda i: -(data[i][2] + rng.random() * 0.3))
    chosen = []
    for i in order:
        if len(chosen) >= count:
            break
        if chosen and np.min(np.linalg.norm(pts[chosen] - pts[i], axis=1)) < SPACING:
            continue
        chosen.append(i)
    out = []
    for i in chosen:
        co, nrm, _ = data[i]
        nrm = nrm.normalized()
        lifted = co + nrm * 0.04
        out += [round(lifted.x, 4), round(lifted.y, 4), round(lifted.z, 4), round(nrm.x, 4), round(nrm.y, 4),
                round(nrm.z, 4), region_of(co)]
    return out


def stem_radius(h):
    for (r0, h0), (r1, h1) in zip(STEM_PROFILE, STEM_PROFILE[1:]):
        if h0 <= h <= h1 and h1 > h0:
            return r0 + (r1 - r0) * (h - h0) / (h1 - h0)
    return STEM_PROFILE[-1][0]


def bezier(p0, p1, p2, p3, n=28):
    out = []
    for i in range(n + 1):
        t = i / n
        a, b, c, d = (1 - t) ** 3, 3 * t * (1 - t) ** 2, 3 * t * t * (1 - t), t ** 3
        out.append(tuple(a * p0[k] + b * p1[k] + c * p2[k] + d * p3[k] for k in range(3)))
    return out


def build():
    root = empty("intelligence", chamber="intelligence")
    brain = empty("brain", (0, 0, 0), root, role="static")
    stand = empty("stand", (0, 0, 0), root, role="static")
    rng = random.Random(26)

    # ---------------------------------------------------------------- cerebrum
    nodes = []
    contacts = {}
    for sign, region, name in ((-1, 0, "left"), (1, 1, "right")):
        bm, data = hemisphere(sign)
        nodes += pick(data, 300, rng, lambda co, r=region: r,
                      lambda d: d[1].z > -0.55 and abs(d[0].x) > 0.35)
        # lowest point on the outer underside: where the mount touches the temporal lobe
        low = min((d for d in data if 2.3 < abs(d[0].x) < 3.7 and abs(d[0].y) < 1.2), key=lambda d: d[0].z)
        contacts[sign] = (low[0].copy(), low[1].normalized())
        mesh_obj(f"hemisphere_{name}", bm, "brass", brain, smooth_angle=50)

    # ---------------------------------------------------------------- cerebellum
    bm, data = cerebellum()
    nodes += pick(data, 80, rng, lambda co: 2, lambda d: d[1].z > -0.4 and d[1].y > -0.1)
    mesh_obj("cerebellum", bm, "brass_dark", brain, smooth_angle=32)

    # ---------------------------------------------------------------- brain stem
    axis = STEM_TOP - STEM_BOT
    length = axis.length
    stem = lathe("brain_stem", [(r, h * length / 3.49) for (r, h) in STEM_PROFILE], "brass_dark", parent=brain,
                 loc=tuple(STEM_BOT), axis="Z", segs=40)
    stem.rotation_euler = (-math.atan2(axis.y, axis.z), 0, 0)
    d = axis.normalized()
    front = Vector((0.0, -d.z, d.y))
    mid = STEM_BOT + axis * 0.5
    spark = mid + front * (stem_radius(1.745) + 0.06)

    # ---------------------------------------------------------------- the stand
    base_z = -7.0
    lathe("stand_base", [(0.0, 0.0), (2.32, 0.0), (2.42, 0.06), (2.42, 0.18), (2.3, 0.3), (2.3, 0.4), (1.9, 0.46),
                         (1.7, 0.56), (1.0, 0.8), (0.5, 1.0), (0.34, 1.12), (0.3, 1.3), (0.0, 1.3)], "iron",
          parent=stand, loc=(COL[0], COL[1], base_z), axis="Z", segs=72)
    rod("stand_column", (COL[0], COL[1], base_z + 1.2), (COL[0], COL[1], -4.2), 0.17, "steel", parent=stand, segs=28)
    for z, r in ((-6.1, 0.3), (-5.2, 0.24)):
        lathe(f"stand_ring_{z}", [(0.0, -0.1), (r - 0.04, -0.1), (r, -0.06), (r, 0.06), (r - 0.04, 0.1), (0.0, 0.1)],
              "brass", parent=stand, loc=(COL[0], COL[1], z), axis="Z", segs=40)
    lathe("stand_cradle", [(0.0, -4.45), (0.4, -4.45), (0.6, -4.3), (0.5, -4.05), (0.46, -3.9), (0.62, -3.78),
                           (0.8, -3.64), (0.8, -3.54), (0.5, -3.54), (0.0, -3.54)], "brass", parent=stand,
          loc=(COL[0], COL[1], 0.0), axis="Z", segs=48)
    for sgn in (-1, 1):
        co, nrm = contacts[sgn]
        tip = (co.x, co.y, co.z - 0.02)
        pts = bezier((sgn * 0.62, COL[1], -3.98), (sgn * 2.5, COL[1], -4.5), (sgn * 4.3, COL[1] * 0.6, -3.1),
                     (tip[0] + sgn * 0.12, tip[1], tip[2] - 0.35))
        pts += [(tip[0], tip[1], tip[2] - 0.1)]
        tube_along(f"stand_arm_{sgn}", pts, 0.065, "steel", parent=stand, segs=12)
        lathe(f"stand_foot_{sgn}", [(0.0, -0.1), (0.12, -0.1), (0.26, -0.04), (0.28, 0.0), (0.0, 0.0)], "steel",
              parent=stand, loc=tip, axis="Z", segs=24)
        lathe(f"stand_boss_{sgn}", [(0.0, -0.08), (0.14, -0.08), (0.17, 0.0), (0.14, 0.08), (0.0, 0.08)], "brass",
              parent=stand, loc=(sgn * 0.7, COL[1], -3.98), axis="Z", segs=24)

    root["nodes"] = nodes
    root["spark"] = [round(spark.x, 4), round(spark.y, 4), round(spark.z, 4)]
    print("NEURONS", len(nodes) // 7, "SPARK", root["spark"])
    return root


PREVIEW = dict(cam_loc=(12.5, -17.5, 4.0), target=(0.0, 0.3, -1.5), lens=34)
