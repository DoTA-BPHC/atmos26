"""Segment the official logo into object masks with SAM 2.1.

Prompts (boxes + positive/negative points) are hand-placed in logo pixel
coordinates (1080x1080 atmos-website.jpg). Masks are written to
design/logo/masks/<name>.png, plus an overlay sheet for review.

Run:  HF_HOME=D:/atmos-ai/hf-cache python scripts/logo_segment.py
"""
from pathlib import Path

import cv2
import numpy as np
import torch
from PIL import Image
from transformers import Sam2Model, Sam2Processor

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "atmos-website.jpg"
OUT = ROOT / "design/logo/masks"

# name: (box, [(x, y, label), ...])   label 1 = inside, 0 = outside
PROMPTS = {
    "hand_top": (
        (205, 50, 668, 522),
        [(300, 120, 1), (400, 215, 1), (470, 300, 1), (540, 370, 1), (600, 430, 1),
         (640, 480, 1), (480, 440, 1), (262, 80, 1),
         (560, 560, 0), (530, 520, 0), (600, 540, 0), (380, 400, 0), (620, 250, 0)],
    ),
    "hand_bottom": (
        (415, 585, 1035, 975),
        [(470, 615, 1), (560, 640, 1), (650, 660, 1), (720, 720, 1), (800, 790, 1),
         (870, 850, 1), (930, 900, 1), (640, 600, 1),
         (590, 560, 0), (420, 560, 0), (560, 760, 0), (700, 900, 0), (1000, 700, 0)],
    ),
    "A": ((140, 485, 325, 640), [(180, 600, 1), (240, 510, 1), (290, 600, 1), (235, 580, 0)]),
    "T": ((285, 485, 475, 645), [(330, 505, 1), (440, 505, 1), (390, 580, 1), (330, 600, 0)]),
    "M": ((465, 435, 665, 615), [(495, 580, 1), (540, 500, 1), (600, 520, 1), (635, 580, 1),
                                  (530, 440, 0), (575, 470, 0), (640, 470, 0), (560, 590, 0)]),
    "O": ((638, 485, 788, 630), [(660, 560, 1), (760, 560, 1), (710, 500, 1), (710, 612, 1), (712, 556, 0)]),
    "S": ((782, 482, 928, 632), [(850, 500, 1), (820, 540, 1), (870, 560, 1), (840, 610, 1)]),
}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    processor = Sam2Processor.from_pretrained("facebook/sam2.1-hiera-large")
    model = Sam2Model.from_pretrained("facebook/sam2.1-hiera-large").to(device)
    image = Image.open(SRC).convert("RGB")

    overlay = np.array(image).astype(np.float32)
    colours = [(255, 60, 60), (60, 255, 120), (80, 140, 255), (255, 220, 60), (255, 80, 255), (60, 240, 255), (255, 150, 60)]
    for i, (name, (box, pts)) in enumerate(PROMPTS.items()):
        inputs = processor(
            images=image,
            input_boxes=[[list(box)]],
            input_points=[[[[x, y] for x, y, _ in pts]]],
            input_labels=[[[lab for *_, lab in pts]]],
            return_tensors="pt",
        ).to(device)
        with torch.no_grad():
            outputs = model(**inputs, multimask_output=False)
        mask = processor.post_process_masks(outputs.pred_masks.cpu(), inputs["original_sizes"])[0]
        mask = mask[0, 0].numpy().astype(np.uint8) * 255
        cv2.imwrite(str(OUT / f"{name}.png"), mask)
        c = np.array(colours[i % len(colours)], np.float32)
        m = mask > 0
        overlay[m] = overlay[m] * 0.45 + c * 0.55
        print(f"{name}: {m.sum()} px, iou={outputs.iou_scores.flatten().tolist()}")
    Image.fromarray(overlay.astype(np.uint8)).save(ROOT / "design/logo/debug/sam_overlay.png")


if __name__ == "__main__":
    main()
