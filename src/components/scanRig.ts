// Shared state for the hero scan line. HeroScene writes the scan position,
// AugmentedHand reads it every frame and writes back how much of the hand
// is "augmented" so the HUD can show it.
// Positions are in hero-local pixels (0 = top of the hero).

export interface ScanRig {
  w: number;
  h: number;
  scanY: number;
  pointerY: number;
  pointerX: number;
  pointerMoved: boolean;
  // 0..1, how far the hero has been scrolled out
  scroll: number;
  // 0..1, fraction of the hand below the scan line
  pct: number;
  // ring diameter in px (matches --ring in HeroScene)
  ring: number;
  // where the hand currently is on screen, written by AugmentedHand
  handTop: number;
  handBottom: number;
  start: number;
  still: boolean;
  coarse: boolean;
}

// one hero on the page, so one shared rig
export const rig: ScanRig = {
  w: 1,
  h: 1,
  scanY: 0,
  pointerY: 0,
  pointerX: 0,
  pointerMoved: false,
  scroll: 0,
  pct: 0,
  ring: 1,
  handTop: 0,
  handBottom: 0,
  start: performance.now(),
  still: false,
  coarse: false,
};
