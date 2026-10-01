import type { ShapePose } from './shapes';

// which shape the particle field should be showing
let current: ShapePose = { shape: 'dust', opacity: 0 };
const subs = new Set<(p: ShapePose) => void>();

export const particles = {
  get: () => current,
  set(p: ShapePose) {
    current = p;
    subs.forEach((s) => s(p));
  },
  subscribe(fn: (p: ShapePose) => void) {
    subs.add(fn);
    return () => {
      subs.delete(fn);
    };
  },
};
