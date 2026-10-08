import { useEffect, useRef, useState } from 'react';
import type { Engine } from './engine';
import { guessTier, type Tier } from './quality';
import { world } from './store';

/**
 * The fixed WebGL layer behind the home page. Loaded lazily after the hero
 * paints; picks a tier, and steps down (or out, to stills) if the engine
 * reports the device can't keep up.
 */
export default function World() {
  const host = useRef<HTMLDivElement>(null);
  const [tier, setTier] = useState<Tier>(guessTier);

  useEffect(() => {
    world.set({ tier });
  }, [tier]);

  useEffect(() => {
    const el = host.current;
    if (!el || tier === 'still') return;
    // three.js comes with the engine, so the still tier never downloads it
    let engine: Engine | undefined;
    let gone = false;
    import('./engine').then((m) => {
      if (!gone) engine = new m.Engine(el, tier, setTier);
    });
    return () => {
      gone = true;
      engine?.dispose();
    };
  }, [tier]);

  if (tier === 'still') return null;
  return <div ref={host} aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-0 h-lvh" style={{ opacity: 0 }} />;
}
