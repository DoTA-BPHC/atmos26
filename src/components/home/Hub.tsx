import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { CATEGORIES, EVENTS } from '../../data/events';
import { LINEUP_SEALED, PROSHOWS } from '../../data/proshows';
import { STATS } from '../../data/fest';
import { PassesButton } from '../PassesButton';

const EXPO = [0.16, 1, 0.3, 1] as const;

// the photo that best stands for each arena
const COVER: Record<string, string> = {
  competitions: '/gallery/robo_soccer.jpg',
  workshops: '/gallery/womenInCode.jpg',
  experiences: '/gallery/puzzle_event.jpg',
  talks: '/gallery/actors_guest_talks.jpg',
  proshows: '/gallery/proshow.jpg',
};

interface Arena {
  id: string;
  label: string;
  blurb: string;
  to?: string;
  count?: number;
}

const ARENAS: Arena[] = [
  ...CATEGORIES.map((c) => ({
    ...c,
    to: `/events?c=${c.id}`,
    count: EVENTS.filter((e) => e.category === c.id).length,
  })),
  { id: 'talks', label: 'Talks', blurb: 'Speakers are revealed closer to the fest.' },
  {
    id: 'proshows',
    label: 'Proshows',
    blurb: LINEUP_SEALED ? 'Three nights on the main stage. The line-up stays sealed.' : 'Three nights on the main stage.',
    to: '/proshows',
  },
];

// past editions, counted; the figure glitches once as it lands
function Figure({ to, prefix = '', suffix = '', glitch }: { to: number; prefix?: string; suffix?: string; glitch: boolean }) {
  const text = `${prefix}${to.toLocaleString('en-IN')}${suffix}`;
  return (
    <span data-text={text} className={`tabular glitch-text inline-block ${glitch ? 'glitch-run' : ''}`}>
      {text}
    </span>
  );
}

function Stat({ s, i }: { s: (typeof STATS)[number]; i: number }) {
  const [glitch, setGlitch] = useState(false);
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    if (!landed) return;
    const at = 350 + i * 140;
    const on = window.setTimeout(() => setGlitch(true), at);
    const off = window.setTimeout(() => setGlitch(false), at + 500);
    return () => {
      clearTimeout(on);
      clearTimeout(off);
    };
  }, [landed, i]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      onViewportEnter={() => setLanded(true)}
      transition={{ duration: 1, ease: EXPO, delay: i * 0.05 }}
      className="glitch-hover flex flex-col-reverse"
    >
      <dt className="mt-1 text-sm">
        <span className="text-brass-hi">{s.label}</span>
        <span className="hidden text-stone-mute 2xl:block">{s.note}</span>
      </dt>
      <dd className="display text-[clamp(2rem,3.4vw,3.4rem)] leading-none text-stone">
        <Figure to={s.value} prefix={'prefix' in s ? s.prefix : ''} suffix={s.suffix} glitch={glitch} />
      </dd>
    </motion.div>
  );
}

export function Hub() {
  const [hot, setHot] = useState<string | null>(null);

  return (
    <section id="hub" className="relative flex min-h-svh flex-col justify-center px-4 pb-[5svh] pt-[calc(4rem+3svh)] sm:px-8" aria-labelledby="hub-title">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="grid gap-x-10 lg:grid-cols-12">
          {/* Arenas */}
          <div className="lg:col-span-7">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 id="hub-title" className="display text-[clamp(2.4rem,4.4vw,4.4rem)] text-stone">
                Pick your <span className="text-brass-hi">arena</span>
              </h2>
              <Link to="/events" className="text-[1.05rem] text-stone-dim underline decoration-brass/60 hover:text-stone">
                All {EVENTS.length} events
              </Link>
            </div>

            <ul className="relative mt-6 border-b border-stone/12" onMouseLeave={() => setHot(null)}>
              {ARENAS.map((c) => {
                const on = hot === c.id;
                const row = 'group relative grid grid-cols-[1fr_auto] items-center gap-6 py-[clamp(0.5rem,1.4svh,1rem)]';
                const inner = (
                  <>
                    <span
                      className={`display text-[clamp(1.5rem,min(2.4vw,4.4svh),2.4rem)] transition-[color,transform] duration-500 ease-out-expo ${
                        hot && !on ? 'text-stone/25' : 'text-stone'
                      } ${on ? 'translate-x-3 text-brass-hi' : ''}`}
                    >
                      {c.label}
                    </span>
                    <span className="text-lift max-w-[26ch] text-right text-stone-dim">
                      {c.count === undefined ? (
                        <span className="block text-xl text-stone">Coming soon</span>
                      ) : (
                        <span className="stencil block text-2xl text-stone">{String(c.count).padStart(2, '0')}</span>
                      )}
                      <span className="hidden 2xl:block">{c.blurb}</span>
                    </span>
                  </>
                );
                return (
                  <li key={c.id} className="border-t border-stone/12">
                    {c.to ? (
                      <Link to={c.to} onMouseEnter={() => setHot(c.id)} onFocus={() => setHot(c.id)} className={row}>
                        {inner}
                      </Link>
                    ) : (
                      <div onMouseEnter={() => setHot(c.id)} className={row}>
                        {inner}
                      </div>
                    )}
                  </li>
                );
              })}

              {/* the photo that follows the hovered row */}
              <AnimatePresence>
                {hot && (
                  <motion.img
                    key={hot}
                    src={COVER[hot]}
                    alt=""
                    className="duotone pointer-events-none absolute right-[18%] top-1/2 hidden aspect-[4/5] w-[min(18vw,260px)] -translate-y-1/2 object-cover lg:block"
                    initial={{ opacity: 0, scale: 0.9, rotate: -3, clipPath: 'inset(50% 0 50% 0)' }}
                    animate={{ opacity: 1, scale: 1, rotate: 0, clipPath: 'inset(0% 0 0% 0)' }}
                    exit={{ opacity: 0, scale: 0.96, clipPath: 'inset(50% 0 50% 0)' }}
                    transition={{ duration: 0.55, ease: EXPO }}
                  />
                )}
              </AnimatePresence>
            </ul>
          </div>

          {/* Proshows */}
          <div className="relative isolate mt-12 overflow-hidden border-l border-stone/12 pl-8 lg:col-span-5 lg:mt-0">
            <img src="/gallery/proshow-960.jpg" alt="" className="duotone absolute inset-0 -z-10 size-full object-cover opacity-30" />
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#000_0%,rgb(0_0_0/0.4)_35%,rgb(0_0_0/0.4)_65%,#000_100%)]" />
            <h3 className="display text-[clamp(1.8rem,2.8vw,2.8rem)] text-stone">
              Three nights.
              <br />
              <span className="text-brass-hi">{LINEUP_SEALED ? 'Names sealed.' : 'The line-up.'}</span>
            </h3>
            <ol className="mt-6 border-b border-stone/15">
              {PROSHOWS.map((p, i) => (
                <motion.li
                  key={p.night}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-10% 0px' }}
                  transition={{ duration: 0.9, ease: EXPO, delay: i * 0.08 }}
                  className="glitch-hover border-t border-stone/15 py-[clamp(0.4rem,1.1svh,0.75rem)]"
                >
                  <p className="text-lift text-stone-dim">
                    {p.night} · {p.date}
                  </p>
                  <p className="stencil glitch-text text-[clamp(1.6rem,min(2.6vw,4.4svh),2.6rem)] text-stone" data-text={p.codename}>
                    {p.codename}
                  </p>
                  <p className="text-lift text-stone-dim">
                    {p.genre} · <span className="text-brass-hi">{p.artist ?? 'Act sealed'}</span>
                  </p>
                </motion.li>
              ))}
            </ol>
            <Link to="/proshows" className="mt-6 inline-block text-[1.05rem] text-stone-dim underline decoration-brass/60 hover:text-stone">
              Proshow details
            </Link>
          </div>

          {/* Bottom row */}
          <div className="mt-[4svh] flex flex-wrap items-end justify-between gap-8 border-t border-stone/12 pt-[3svh] lg:col-span-12">
            <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
              {STATS.map((s, i) => (
                <Stat key={s.label} s={s} i={i} />
              ))}
            </dl>
            <div className="flex gap-3">
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
      </div>
    </section>
  );
}
