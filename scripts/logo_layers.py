"""Split the official logo into animatable layers without changing it.

Every visible pixel of every layer is copied from atmos-website.jpg. Only
pixels that are hidden in the original (behind a hand, behind a letter) are
generated, with LaMa inpainting. scripts/verify_logo.py re-stacks the shipped
layers and fails if the result differs from the original.

Inputs:  atmos-website.jpg, design/logo/masks/*.png (from logo_segment.py)
Outputs: public/logo/*.webp, src/data/logoLayers.json, design/logo/layers/*.png

Stack (back to front): outer, disc, ring, letters A T M O S, hands, M-front, taglines.
"""
import json
from pathlib import Path

import cv2
import numpy as np
import torch
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "atmos-website.jpg"
MASKS = ROOT / "design/logo/masks"
WORK = ROOT / "design/logo/layers"
PUBLIC = ROOT / "public/logo"
MANIFEST = ROOT / "src/data/logoLayers.json"
LAMA = Path("D:/atmos-ai/models/lama/big-lama.pt")
# the design team's own layer exports (3000 px, same framing as the logo)
SOURCE = ROOT / "design/source"

# brass ring fitted in logo_segment analysis (least squares on the brass pixels)
RING_C = (528.83, 546.97)
RING_R = 445.55
RING_IN, RING_OUT = RING_R - 15, RING_R + 11

TAGLINE_BOXES = {
    "tagline_top": (660, 400, 950, 490),
    "tagline_bottom": (110, 640, 450, 705),
}
LETTERS = ["A", "T", "M", "O", "S"]

K = lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))


def load_mask(name: str) -> np.ndarray:
    return cv2.imread(str(MASKS / f"{name}.png"), cv2.IMREAD_GRAYSCALE) > 127


class Lama:
    def __init__(self) -> None:
        self.model = torch.jit.load(str(LAMA), map_location="cuda").eval()

    def __call__(self, rgb: np.ndarray, hole: np.ndarray) -> np.ndarray:
        h, w = hole.shape
        ph, pw = (-h) % 8, (-w) % 8
        img = np.pad(rgb, ((0, ph), (0, pw), (0, 0)), mode="reflect")
        m = np.pad(hole.astype(np.float32), ((0, ph), (0, pw)))
        x = torch.from_numpy(img).permute(2, 0, 1)[None].float().cuda() / 255
        k = torch.from_numpy(m)[None, None].cuda()
        with torch.no_grad():
            y = self.model(x * (1 - k), k)
        out = (y[0].permute(1, 2, 0).clamp(0, 1).cpu().numpy() * 255).round().astype(np.uint8)[:h, :w]
        res = rgb.copy()
        res[hole] = out[hole]
        return res


def polar_fill(rgb: np.ndarray, hole: np.ndarray, center, max_r: float) -> np.ndarray:
    """Fill holes in the vortex by interpolating around the circle.

    The vortex and the ring are circular, so unwrapping them to (angle, radius)
    turns both into horizontal-ish streaks; each radius is then interpolated
    along the angle between the nearest known pixels on either side.
    """
    n_ang, n_rad = 2880, int(max_r)
    flags = cv2.WARP_POLAR_LINEAR + cv2.INTER_LINEAR
    size = (n_rad, n_ang)
    pol = cv2.warpPolar(rgb.astype(np.float32), size, center, max_r, flags)
    pmask = cv2.warpPolar(hole.astype(np.float32), size, center, max_r, flags) > 0.01
    # sample the vortex a little away from the hole: right at the edge sit the
    # soft drop shadows of the letters and hands, which would streak into the fill
    far = cv2.dilate(pmask.astype(np.uint8), np.ones((41, 7), np.uint8)) > 0
    ang = np.arange(n_ang, dtype=np.float32)
    for r in range(n_rad):
        miss = pmask[:, r]
        if not miss.any():
            continue
        known = ~far[:, r]
        # skip shadow tails: samples clearly darker than this radius' typical tone
        lum = pol[:, r].mean(axis=1)
        if known.sum() > 32:
            known &= lum > np.median(lum[known]) - 10
        if known.sum() < 8:
            known = ~miss
        if not known.any():
            continue
        for c in range(3):
            pol[miss, r, c] = np.interp(ang[miss], ang[known], pol[known, r, c], period=n_ang)
    # soften the streaks a touch along the radius only
    pol = np.where(pmask[..., None], cv2.GaussianBlur(pol, (3, 1), 0), pol)
    back = cv2.warpPolar(pol, (rgb.shape[1], rgb.shape[0]), center, max_r, flags + cv2.WARP_INVERSE_MAP)
    back = np.clip(back, 0, 255).astype(np.uint8)
    # a little film grain so the filled area matches the painted texture
    grain = np.random.default_rng(7).normal(0, 2.2, back.shape)
    back = np.clip(back.astype(np.float32) + grain, 0, 255).astype(np.uint8)
    out = rgb.copy()
    out[hole] = back[hole]
    return out


def load_source(name: str, size: int) -> tuple[np.ndarray, np.ndarray]:
    """A source layer resampled to the logo's size (premultiplied, so edges stay clean)."""
    im = Image.open(SOURCE / f"{name}.png").convert("RGBa").resize((size, size), Image.LANCZOS).convert("RGBA")
    a = np.array(im)
    return a[..., :3], a[..., 3]


def main() -> None:
    WORK.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    rgb = np.array(Image.open(SRC).convert("RGB"))
    H, W = rgb.shape[:2]
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    luma = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    yy, xx = np.mgrid[0:H, 0:W]
    radius = np.hypot(xx - RING_C[0], yy - RING_C[1])
    lama = Lama()

    # ---- object masks (visible pixels only) ----
    hand_top = load_mask("hand_top")
    hand_bottom = load_mask("hand_bottom")
    # SAM fills the gaps between the loose fibre wires; keep only the wires themselves
    fibre_zone = (xx > 830) & (yy > 815)
    wire_px = cv2.dilate(((luma > 38) | (hsv[..., 1] > 90)).astype(np.uint8), K(1)) > 0
    hand_bottom &= ~fibre_zone | wire_px

    letters = {n: load_mask(n) for n in LETTERS}
    taglines = {}
    for name, (x0, y0, x1, y1) in TAGLINE_BOXES.items():
        box = np.zeros((H, W), bool)
        box[y0:y1, x0:x1] = True
        brass = (hsv[..., 0] >= 8) & (hsv[..., 0] <= 35) & (hsv[..., 1] > 70) & (hsv[..., 2] > 80)
        taglines[name] = cv2.dilate((brass & box).astype(np.uint8), K(2)).astype(bool) & box

    # ---- catch what SAM leaves behind (drop shadows, dark wires) ----
    # Build a clean plate (vortex filled around the circle, plain black outside
    # the ring), then anything near an object that differs clearly from that
    # plate belongs to the object. Two rounds, so the second plate is cleaner.
    grow = lambda m, r=2: cv2.dilate(m.astype(np.uint8), K(r)) > 0
    inside = radius < RING_OUT + 6
    ground = np.median(rgb[(radius > RING_OUT + 30) & (luma < 30)], axis=0).astype(np.uint8)
    teal = (hsv[..., 0] >= 75) & (hsv[..., 0] <= 105) & (hsv[..., 1] > 50)
    ring_brass = (np.abs(radius - RING_R) < 16) & (hsv[..., 0] >= 8) & (hsv[..., 0] <= 35) & (hsv[..., 1] > 60) & (hsv[..., 2] > 60)

    def clean_plate(hole: np.ndarray) -> np.ndarray:
        plate = polar_fill(rgb, hole & inside, RING_C, RING_OUT + 40)
        plate[hole & ~inside] = ground
        return plate

    sam = {"hand_top": hand_top, "hand_bottom": hand_bottom, **letters, **taglines}
    names = list(sam)
    reach = {"hand_top": 60, "hand_bottom": 40}
    core = dict(sam)
    for _ in range(2):
        rough = clean_plate(grow(np.logical_or.reduce(list(core.values())), 30))
        diff = np.abs(rgb.astype(np.int16) - rough.astype(np.int16)).max(axis=2)
        # soft drop shadows under the letters need a lower threshold than the arms
        strong = cv2.morphologyEx((diff > 18).astype(np.uint8), cv2.MORPH_OPEN, K(1)) > 0
        darker = rough.astype(np.int16).mean(axis=2) - rgb.astype(np.int16).mean(axis=2)
        faint = strong | (cv2.morphologyEx((darker > 12).astype(np.uint8), cv2.MORPH_OPEN, K(1)) > 0)
        background = (teal & ~inside) | (ring_brass)  # circuit traces and the ring itself
        dist = np.stack([cv2.distanceTransform((~core[n]).astype(np.uint8), cv2.DIST_L2, 5) for n in names])
        nearest = dist.argmin(axis=0)
        for i, n in enumerate(names):
            r = reach.get(n, 5 if n.startswith("tagline") else 16)
            fg = (faint if n in LETTERS else strong) & ~background
            extra = fg & (nearest == i) & (dist[i] <= r)
            core[n] = cv2.morphologyEx((core[n] | extra).astype(np.uint8), cv2.MORPH_CLOSE, K(2)) > 0
    # carry a few pixels of margin so the dark outline edges travel with their object
    core = {n: grow(m, 3) for n, m in core.items()}
    hand_top, hand_bottom = core["hand_top"], core["hand_bottom"]
    letters = {n: core[n] for n in LETTERS}
    taglines = {n: core[n] for n in taglines}
    hands = hand_top | hand_bottom

    # letter pixels win over the hands only where the letter sits in front (the M
    # diagonal across the pinching fingers); elsewhere hands are on top
    enclosed = cv2.morphologyEx(hand_top.astype(np.uint8), cv2.MORPH_CLOSE, K(14)) > 0
    m_front = letters["M"] & enclosed & ~hand_top
    m_front = cv2.morphologyEx(m_front.astype(np.uint8), cv2.MORPH_OPEN, K(1)) > 0

    hand_top_a = hand_top & ~m_front
    hand_bottom_a = hand_bottom & ~hand_top_a
    hand_top_full = hand_top_a | m_front
    hand_layers = hand_top_full | hand_bottom_a
    letter_a = {n: m & ~hand_layers for n, m in letters.items()}
    tag_all = np.logical_or.reduce(list(taglines.values()))

    # ---- base plate: everything removed, hidden area inpainted ----
    # (only pixels an upper layer covers at rest are generated, so the base
    # never shows a generated pixel in the final pose)
    upper = hand_layers | np.logical_or.reduce(list(letter_a.values())) | tag_all
    filled = clean_plate(grow(upper, 3))
    base = np.where(upper[..., None], filled, rgb)
    Image.fromarray(base).save(WORK / "base_filled.png")

    # ---- hands: the fingers behind the M diagonal are hidden, fill them ----
    ht = lama(rgb, m_front)

    # ---- letters: strokes hidden under the hands come from the team's lettering layer ----
    # (visible pixels stay the JPEG's; only covered pixels are taken from the source.
    # Where the source itself was never painted, e.g. under the thumb, the letter
    # simply has no pixels.)
    src_rgb, src_a = load_source("letters", W)
    letter_full = {}
    letter_rgb = {}
    for n, m in letter_a.items():
        near = grow(letters[n], 12)
        hidden = hand_layers & ~m & near & (src_a > 0)
        alpha = np.where(m, 255, np.where(hidden, src_a, 0)).astype(np.uint8)
        letter_full[n] = alpha
        letter_rgb[n] = np.where(hidden[..., None], src_rgb, rgb)

    # ---- machine hand: fingers that pass behind the T and M, from the team's hand layer ----
    # They go in their own layer under the letters, moving with the hand, so at
    # rest they stay covered exactly as in the logo.
    hsrc_rgb, hsrc_a = load_source("machine_hand", W)
    letters_vis = np.logical_or.reduce(list(letter_a.values()))
    behind = (hsrc_a > 0) & ~hand_bottom_a & (letters_vis | grow(m_front, 0))
    hand_back_alpha = np.where(behind, hsrc_a, 0).astype(np.uint8)

    # ---- layers: (name, rgb source, alpha, opaque?) back to front ----
    ring_band = (radius >= RING_IN) & (radius <= RING_OUT)
    layers = [
        ("outer", base, radius > RING_OUT, False),
        ("disc", base, radius < RING_IN, False),
        ("ring", base, ring_band, False),
        ("hand_bottom_back", hsrc_rgb, hand_back_alpha, False),
        *[(n, letter_rgb[n], letter_full[n], False) for n in LETTERS],
        ("hand_bottom", rgb, hand_bottom_a, False),
        ("hand_top", ht, hand_top_full, False),
        ("m_front", rgb, grow(m_front, 0), False),
        *[(n, rgb, a, False) for n, a in taglines.items()],
    ]

    manifest = {"size": [W, H], "ring": {"cx": RING_C[0], "cy": RING_C[1], "r": RING_R}, "layers": []}
    for name, src, alpha, _ in layers:
        ys, xs = np.nonzero(alpha)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        a8 = alpha.astype(np.uint8) * 255 if alpha.dtype == bool else alpha.astype(np.uint8)
        rgba = np.dstack([src, a8])[y0:y1, x0:x1]
        Image.fromarray(rgba).save(WORK / f"{name}.png")
        # lossless keeps every visible pixel exact
        Image.fromarray(rgba).save(PUBLIC / f"{name}.webp", lossless=True, quality=100, method=6)
        kb = (PUBLIC / f"{name}.webp").stat().st_size / 1024
        manifest["layers"].append({"name": name, "x": int(x0), "y": int(y0), "w": int(x1 - x0), "h": int(y1 - y0)})
        print(f"{name:15s} {x1 - x0:4d}x{y1 - y0:<4d} {kb:7.1f} KB")

    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
