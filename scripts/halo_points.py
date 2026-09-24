"""Bake the official logo's brass ring into a point cloud for the particle finale.

Only the ring is turned into dots (a redrawn logo would break the brand rule).
The dots gather exactly onto the ring's position, then the real logo raster
resolves over them. Points come from the ring layer written by logo_layers.py,
normalised so the ring radius is 1, and are written to public/shapes/halo.bin
(int16 xyz, same format as the Blender shapes).
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
LAYERS = ROOT / "design/logo/layers"
OUT = ROOT / "public/shapes/halo.bin"
N = 12000
rng = np.random.default_rng(26)


def main() -> None:
    manifest = json.loads((ROOT / "src/data/logoLayers.json").read_text(encoding="utf-8"))
    box = next(l for l in manifest["layers"] if l["name"] == "ring")
    im = np.array(Image.open(LAYERS / "ring.png"))
    rgb, a = im[..., :3].astype(np.int16), im[..., 3]
    # the brass line itself, not the dark gap between its two strokes
    brass = (a > 127) & (rgb[..., 0] > 110) & (rgb[..., 0] - rgb[..., 2] > 50)
    ys, xs = np.nonzero(brass)
    px = np.stack([xs + box["x"], ys + box["y"]], axis=1).astype(np.float32)
    idx = rng.choice(len(px), N, replace=len(px) < N)
    pts = px[idx] + rng.uniform(-0.5, 0.5, (N, 2))
    c = np.array([manifest["ring"]["cx"], manifest["ring"]["cy"]])
    xy = (pts - c) / manifest["ring"]["r"]
    out = np.stack([xy[:, 0], -xy[:, 1], rng.normal(0, 0.01, N)], axis=1)
    # keep the ring at radius 1 (no max-normalisation), so the page can align the raster to it
    q = np.clip(np.round(out / 1.05 * 32767), -32767, 32767).astype("<i2")
    OUT.write_bytes(q.tobytes())
    print(f"halo: {N} points from {len(px)} brass pixels -> {OUT}")


if __name__ == "__main__":
    main()
