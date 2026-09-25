import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShapeSection } from '../particles/ShapeSection';
import type { ShapePose } from '../particles/shapes';
import { FEST } from '../../data/fest';

const EXPO = [0.16, 1, 0.3, 1] as const;

// Reel 1's journey, one era per screen. The dots on the right become each
// era's machine; the panel on the left holds the story.
const ERAS: { when: string; name: string; line: string; pose: ShapePose }[] = [
  {
    when: '1700s',
    name: 'Clockwork',
    line: 'Time made mechanical. Gears taught us to trust a machine to keep count.',
    pose: { shape: 'watch', x: 0.42, size: 0.78, rx: 0.25, ry: -0.5, spin: 0.12 },
  },
  {
    when: '1800s',
    name: 'Steam',
    line: 'Muscle multiplied. Pistons pulled whole cities across continents.',
    pose: { shape: 'locomotive', x: 0.4, size: 0.92, rx: 0.2, ry: 0.55, spin: 0.08 },
  },
  {
    when: '1950s',
    name: 'Silicon',
    line: 'Logic etched into sand. The circuit board grew into a skyline.',
    pose: { shape: 'city', x: 0.42, size: 0.95, rx: 0.3, ry: 0.4, spin: 0.08 },
  },
  {
    when: '2000s',
    name: 'Genome',
    line: 'Life read like source code, and then rewritten.',
    pose: { shape: 'dna', x: 0.42, size: 0.95, rz: 0.45, spin: 0.35 },
  },
  {
    when: '2026',
    name: 'Intelligence',
    line: 'Thought shared with machines. The next hand is the one we build together.',
    pose: { shape: 'brain', x: 0.56, size: 0.74, rx: 0.15, ry: 1.57, spin: 0.03 },
  },
];

export function Eras() {
  const [active, setActive] = useState(0);

  const era = ERAS[active];

  return (
    <div className="relative" aria-labelledby="eras-title">
      {/* sticky story panel */}
      <div className="pointer-events-none sticky top-0 z-10 flex h-svh flex-col justify-between px-4 pb-10 pt-24 sm:px-8 md:justify-center md:pb-0 md:pt-0">
        <div className="mx-auto w-full max-w-[1440px]">
          <h2 id="eras-title" className="sr-only">
            {FEST.subtheme}: five eras of technology
          </h2>

          <div className="md:max-w-[58%]">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -24, filter: 'blur(10px)' }}
                transition={{ duration: 0.7, ease: EXPO }}
              >
                <p className="stencil text-[clamp(1.3rem,2vw,1.8rem)] text-brass" style={{ textTransform: 'none' }}>
                  {era.when}
                </p>
                <p className="display mt-3 text-[clamp(2rem,4.2vw,4rem)] text-stone">{era.name}</p>
                <p className="mt-6 max-w-[34ch] text-[clamp(1.05rem,1.4vw,1.3rem)] leading-relaxed text-stone-dim text-pretty text-lift">
                  {era.line}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* era index */}
        <ol className="mx-auto mt-10 flex w-full max-w-[1440px] gap-5 md:absolute md:inset-x-0 md:bottom-10 md:mt-0 md:px-8">
          {ERAS.map((e, i) => (
            <li key={e.name} className="flex-1">
              <span className={`block h-px w-full transition-colors duration-700 ${i <= active ? 'bg-brass' : 'bg-stone/15'}`} />
              <span
                style={{ textTransform: 'none' }}
                className={`meta mt-3 hidden transition-colors duration-500 sm:block ${
                  i === active ? 'text-stone' : 'text-stone-mute'
                }`}
              >
                {e.when} · {e.name}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* one screen of scroll per era; these drive the particles */}
      <div className="-mt-[100svh]">
        {ERAS.map((e, i) => (
          <ShapeSection
            key={e.name}
            pose={e.pose}
            onActive={() => setActive(i)}
            className="h-[110svh]"
            aria-label={`${e.when}, ${e.name}`}
          />
        ))}
      </div>
    </div>
  );
}
