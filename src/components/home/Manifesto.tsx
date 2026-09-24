import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { ShapeSection } from '../particles/ShapeSection';
import { particles } from '../particles/store';
import type { ShapePose } from '../particles/shapes';
import { PassesButton } from '../PassesButton';
import manifest from '../../data/logoLayers.json';

const EXPO = [0.16, 1, 0.3, 1] as const;
const LINES = [
  { t: 'The human hand.', hi: false },
  { t: 'The machine hand.', hi: false },
  { t: 'One campus,', hi: true },
  { t: '23 — 25 October.', hi: true },
];

// Where the dots put the ring (keep in step with the raster placement below).
const POSE: ShapePose = { shape: 'halo', x: 0.58, size: 0.56, narrowSize: 0.8, narrowY: -0.45, spin: 0, opacity: 0.9 };
const SIZE = manifest.size[0];
const RING = manifest.ring;
// shapes are stored at 1/1.05 of their unit radius (scripts/halo_points.py)
const HALO = 1.05;

/**
 * The close. Every dot on the page gathers into the logo's brass ring, then
 * the official artwork itself (the untouched JPEG) resolves inside it. The
 * dots only ever draw the ring; the logo is never redrawn.
 */
export function Manifesto() {
  const [here, setHere] = useState(false);
  const handoff = useRef(0);
  useEffect(() => () => clearTimeout(handoff.current), []);

  // once the raster is fully in, it carries its own ring: let the dot ring go,
  // so nothing is left floating when the pin releases
  const onActive = () => {
    setHere(true);
    clearTimeout(handoff.current);
    handoff.current = window.setTimeout(() => {
      if (particles.get().shape === 'halo') particles.set({ ...POSE, opacity: 0 });
    }, 3200);
  };

  // ring radius from the same numbers the particle field uses, in units of this
  // pinned stage (it spans the canvas exactly, scrollbar excluded)
  // (phone values inline, desktop values swapped in by the md: classes)
  const ringStyle = {
    '--m': 'min(100cqw, 100cqh)',
    '--s': POSE.narrowSize,
    '--cx': '50cqw',
    '--cy': `calc(50cqh + ${-(POSE.narrowY ?? 0) * 50}cqh)`,
    '--r': `calc(var(--m) * var(--s) / 2 / ${HALO})`,
    '--w': `calc(var(--r) * ${SIZE / RING.r})`,
    left: `calc(var(--cx) - var(--w) * ${RING.cx / SIZE})`,
    top: `calc(var(--cy) - var(--w) * ${RING.cy / SIZE})`,
    width: 'var(--w)',
  } as React.CSSProperties;

  return (
    <ShapeSection pose={POSE} onActive={onActive} className="relative h-[200svh]" aria-labelledby="close-title">
      <div className="sticky top-0 h-svh overflow-hidden [container-type:size]">
        <motion.img
          src="/logo/atmos-website.jpg"
          alt="ATMOS ’26 official artwork"
          width={SIZE}
          height={SIZE}
          loading="lazy"
          className="pointer-events-none absolute aspect-square max-w-none md:[--cx:79cqw]! md:[--cy:50cqh]! md:[--s:0.56]!"
          style={ringStyle}
          initial={{ opacity: 0 }}
          animate={{ opacity: here ? 1 : 0 }}
          transition={{ duration: 1.4, ease: EXPO, delay: here ? 1.6 : 0 }}
        />

        <div className="relative mx-auto flex h-full w-full max-w-[1440px] flex-col justify-start px-4 pt-24 sm:px-8 md:justify-center md:pt-0">
          <h2 id="close-title" className="display text-[clamp(2rem,4.2vw,4.6rem)]">
            {LINES.map((l, i) => (
              <motion.span
                key={l.t}
                className={`block ${l.hi ? 'text-brass-hi' : 'text-stone'}`}
                initial={{ opacity: 0, y: '0.5em', filter: 'blur(10px)' }}
                whileInView={{ opacity: 1, y: '0em', filter: 'blur(0px)' }}
                viewport={{ once: true, margin: '-15% 0px' }}
                transition={{ duration: 1.1, ease: EXPO, delay: i * 0.1 }}
              >
                {l.t}
              </motion.span>
            ))}
          </h2>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row md:mt-12">
            <Link
              to="/events"
              className="inline-flex h-12 items-center justify-center bg-stone px-7 text-[0.95rem] font-semibold text-void transition-colors hover:bg-brass-hi"
            >
              Explore events
            </Link>
            <PassesButton />
          </div>
        </div>
      </div>
    </ShapeSection>
  );
}
