import { useSyncExternalStore } from 'react';

// Hand-off between the preloader and the hero build-up.
//  loading  → preloader visible, counting real asset loads
//  handoff  → watch face has become the ring; preloader fading out
//  building → hero plays its build-up
//  done     → idle
export type IntroPhase = 'loading' | 'handoff' | 'building' | 'done';

let phase: IntroPhase = 'loading';
// true when the preloader's watch face became the hero ring (so the ring is already drawn)
let handedOff = false;
const listeners = new Set<() => void>();

export const intro = {
  get: () => phase,
  set(next: IntroPhase) {
    if (next === phase) return;
    phase = next;
    listeners.forEach((l) => l());
  },
  handedOff: () => handedOff,
  markHandoff() {
    handedOff = true;
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export const useIntroPhase = () => useSyncExternalStore(intro.subscribe, intro.get, intro.get);

// the preloader runs once per browser session, and never with reduced motion
export function shouldShowPreloader() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    return sessionStorage.getItem('atmos:booted') !== '1';
  } catch {
    return true;
  }
}

export function markBooted() {
  try {
    sessionStorage.setItem('atmos:booted', '1');
  } catch {
    /* private mode: preloader simply plays again next time */
  }
}
