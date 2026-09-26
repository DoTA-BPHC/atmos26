"""Prove the layered hero logo is the official logo.

Re-stacks public/logo/*.webp at their manifest positions in manifest order and
compares with atmos-website.jpg. Fails (exit 1) if the mean absolute difference
is 1/255 or more, or if any pixel differs by more than 2/255.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    manifest = json.loads((ROOT / "src/data/logoLayers.json").read_text())
    ref = np.array(Image.open(ROOT / "atmos-website.jpg").convert("RGB")).astype(np.float32)
    W, H = manifest["size"]
    canvas = np.zeros((H, W, 3), np.float32)
    covered = np.zeros((H, W), bool)
    for layer in manifest["layers"]:
        im = np.array(Image.open(ROOT / "public/logo" / f"{layer['name']}.webp").convert("RGBA")).astype(np.float32)
        x, y, w, h = layer["x"], layer["y"], layer["w"], layer["h"]
        a = im[..., 3:4] / 255
        region = canvas[y : y + h, x : x + w]
        canvas[y : y + h, x : x + w] = region * (1 - a) + im[..., :3] * a
        covered[y : y + h, x : x + w] |= a[..., 0] > 0

    diff = np.abs(canvas - ref)
    mean, worst = diff.mean(), diff.max()
    print(f"coverage {covered.mean() * 100:.3f}%  mean abs diff {mean:.4f}/255  max {worst:.0f}/255")
    ok = covered.all() and mean < 1 and worst <= 2
    if not ok:
        bad = diff.max(axis=2) > 2
        Image.fromarray((bad * 255).astype(np.uint8)).save(ROOT / "design/logo/debug/verify_fail.png")
        print("FAIL: layered logo does not match atmos-website.jpg (see design/logo/debug/verify_fail.png)")
        return 1
    print("PASS: layered logo is pixel-identical to the official artwork")
    return 0


if __name__ == "__main__":
    sys.exit(main())
