// Shared state for the hero "convergence" — both hands read from this every frame.
// Everything is in hero-local pixels (0,0 = top-left of the hero section).

export interface HeroRig {
  w: number;
  h: number;
  // raw pointer position
  px: number;
  py: number;
  // convergence point, lerped towards centre + a bit of pointer pull
  tx: number;
  ty: number;
  start: number;
  // reduced motion → static poses, no idle loop, no tracking
  still: boolean;
  // touch devices → no pointer tracking, idle loop only
  coarse: boolean;
}

export const PULL = 0.08;
export const BUTTON_RADIUS = 34;

// unit vectors pointing from the convergence point back towards each wrist
export const DIR_LEFT = norm(-0.75, -0.66);
export const DIR_RIGHT = norm(0.724, 0.69);

const INTRO_SECS = 1.4;
const CYCLE_SECS = 4.5;

function norm(x: number, y: number) {
  const len = Math.hypot(x, y);
  return { x: x / len, y: y / len };
}

const easeOutExpo = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));

export function createRig(): HeroRig {
  return { w: 1, h: 1, px: 0, py: 0, tx: 0, ty: 0, start: performance.now(), still: false, coarse: false };
}

// small screens get smaller swings
export function screenScale(rig: HeroRig) {
  return Math.max(0.55, Math.min(1, rig.w / 1200));
}

// distance from the convergence point to each fingertip, in px
export function fingertipGap(rig: HeroRig, now: number) {
  const minGap = BUTTON_RADIUS + 4;
  if (rig.still) return minGap + 30;

  const t = (now - rig.start) / 1000;
  const s = screenScale(rig);
  const intro = (1 - easeOutExpo(Math.min(t / INTRO_SECS, 1))) * 900 * s;
  // starts "apart" at t=0, almost touching halfway through the cycle
  const wave = 0.5 + 0.5 * Math.cos((t * 2 * Math.PI) / CYCLE_SECS);
  return minGap + wave * 90 * s + intro;
}

export function fingertip(rig: HeroRig, dir: { x: number; y: number }, gap: number) {
  return { x: rig.tx + dir.x * gap, y: rig.ty + dir.y * gap };
}

// pointer in -1..1 relative to the hero centre, 0 when tracking is off
export function pointerNdc(rig: HeroRig) {
  if (rig.still || rig.coarse) return { x: 0, y: 0 };
  return {
    x: (rig.px - rig.w / 2) / (rig.w / 2),
    y: (rig.py - rig.h / 2) / (rig.h / 2),
  };
}
