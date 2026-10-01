import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useAnimate } from 'framer-motion';
import manifest from '../../data/logoLayers.json';
import { intro, markBooted } from '../../lib/intro';

/**
 * Boot sequence: a skeleton pocket watch ticks while the hero's assets load
 * (the counter follows real loads). At 100% the watch's works fall away and
 * its case slides and scales onto the hero's brass ring, the clockwork era
 * handing over to the circuit one. The preloader then fades and the hero
 * builds from that ring.
 */

const RING = manifest.ring;
const SIZE = manifest.size[0];
const MIN_MS = 2300;
const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
const EXPO = [0.16, 1, 0.3, 1] as const;
const IN_OUT = [0.87, 0, 0.13, 1] as const;

function gearPath(r: number, teeth: number, depth = 5) {
  const pts: string[] = [];
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const corners = [
      [a, r - depth],
      [a + step * 0.12, r],
      [a + step * 0.45, r],
      [a + step * 0.57, r - depth],
    ];
    for (const [ang, rad] of corners) pts.push(`${(Math.cos(ang) * rad).toFixed(2)},${(Math.sin(ang) * rad).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

function Gear({ cx, cy, r, teeth, spokes = 5, speed }: {
  cx: number; cy: number; r: number; teeth: number; spokes?: number; speed: number;
}) {
  const d = useMemo(() => gearPath(r, teeth), [r, teeth]);
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <motion.g
        animate={{ rotate: speed > 0 ? 360 : -360 }}
        transition={{ duration: Math.abs(speed), ease: 'linear', repeat: Infinity }}
      >
        <path d={d} />
        <circle r={r * 0.72} />
        <circle r={r * 0.16} />
        {Array.from({ length: spokes }).map((_, i) => {
          const a = (i / spokes) * Math.PI * 2;
          return <line key={i} x1={Math.cos(a) * r * 0.16} y1={Math.sin(a) * r * 0.16} x2={Math.cos(a) * r * 0.72} y2={Math.sin(a) * r * 0.72} />;
        })}
      </motion.g>
    </g>
  );
}

export function Preloader() {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const [pct, setPct] = useState(0);
  const [sec, setSec] = useState(0);
  const [gone, setGone] = useState(false);
  const target = useRef(0);
  const shown = useRef(0);

  // count real loads: every logo layer plus the web fonts
  useEffect(() => {
    const jobs: Promise<unknown>[] = manifest.layers.map((l) => {
      const img = new Image();
      img.src = `/logo/${l.name}.webp`;
      return img.decode().catch(() => undefined);
    });
    jobs.push(document.fonts.ready);
    let done = 0;
    jobs.forEach((j) => j.then(() => (target.current = ++done / jobs.length)));
  }, []);

  // ease the displayed number towards what has actually loaded, never faster
  // than the minimum run so the watch gets seen; then hand over to the hero
  useEffect(() => {
    async function handoff() {
      const root = scope.current;
      if (!root) return;
      await animate('[data-works]', { opacity: 0, scale: 0.92 }, { duration: 0.45, ease: EXPO });

      // slide the case onto the hero ring
      const stage = document.querySelector('[data-hero-stage]')?.getBoundingClientRect();
      const watch = root.querySelector('[data-watch]')!.getBoundingClientRect();
      if (stage && watch.width) {
        const ringX = stage.left + (RING.cx / SIZE) * stage.width;
        const ringY = stage.top + (RING.cy / SIZE) * stage.height;
        const ringR = (RING.r / SIZE) * stage.width;
        const caseR = (170 / 400) * watch.width;
        await animate(
          '[data-watch]',
          { x: ringX - (watch.left + watch.width / 2), y: ringY - (watch.top + watch.height / 2), scale: ringR / caseR },
          { duration: 0.95, ease: IN_OUT },
        );
      }
      intro.markHandoff();
      intro.set('handoff');
      intro.set('building');
      markBooted();
      await animate(root, { opacity: 0 }, { duration: 0.7, ease: EXPO, delay: 0.1 });
      setGone(true);
    }

    const t0 = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const cap = Math.min(1, (now - t0) / MIN_MS);
      const goal = Math.min(target.current, cap);
      shown.current += (goal - shown.current) * 0.08;
      if (goal === 1 && shown.current > 0.995) shown.current = 1;
      setPct(Math.floor(shown.current * 100));
      setSec(Math.floor((now - t0) / 1000));
      if (shown.current >= 1) {
        handoff();
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [animate, scope]);

  if (gone) return null;
  const minute = pct * 3.6;
  const hour = 300 + pct * 0.3;
  const rad = (deg: number) => (deg * Math.PI) / 180;

  return (
    <div
      ref={scope}
      data-preloader
      className="fixed inset-0 z-[95] flex flex-col items-center justify-center bg-void"
      role="progressbar"
      aria-label="Loading ATMOS ’26"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div data-watch className="relative aspect-square w-[min(72vmin,440px)]">
        <svg viewBox="0 0 400 400" className="absolute inset-0 size-full overflow-visible" aria-hidden>
          <defs>
            <radialGradient id="pl-glow">
              <stop offset="0%" stopColor="#2fa3a8" stopOpacity="0.35" />
              <stop offset="60%" stopColor="#123e44" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
          </defs>

          <g data-works style={{ transformOrigin: '200px 200px' }}>
            <circle cx="200" cy="200" r="150" fill="url(#pl-glow)" />
            {/* bow + crown */}
            <circle cx="200" cy="12" r="12" fill="none" stroke="#c9962b" strokeWidth="2" />
            <rect x="192" y="22" width="16" height="10" rx="2" fill="none" stroke="#c9962b" strokeWidth="1.5" />

            {/* skeleton works */}
            <g fill="none" stroke="#c9962b" strokeWidth="1.1" strokeOpacity="0.55">
              <Gear cx={200} cy={212} r={70} teeth={40} spokes={6} speed={36} />
              <Gear cx={272} cy={150} r={36} teeth={20} speed={-19} />
              <Gear cx={134} cy={146} r={26} teeth={16} speed={-13} />
              <Gear cx={146} cy={276} r={24} teeth={15} spokes={4} speed={-6} />
            </g>
            <g fill="none" stroke="#2fa3a8" strokeWidth="1" strokeOpacity="0.7">
              {/* balance wheel swings back and forth */}
              <g transform="translate(262 272)">
                <motion.g
                  animate={{ rotate: [-38, 38] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
                >
                  <circle r="26" />
                  <line x1="-26" y1="0" x2="26" y2="0" />
                  <path d="M0 0 m-8 0 a8 8 0 1 0 16 0 a10 10 0 1 0 -20 0" />
                </motion.g>
              </g>
            </g>

            {/* chapter ring */}
            {Array.from({ length: 60 }).map((_, i) => {
              const a = (i / 60) * Math.PI * 2;
              const long = i % 5 === 0;
              return (
                <line
                  key={i}
                  x1={200 + Math.sin(a) * 158}
                  y1={200 - Math.cos(a) * 158}
                  x2={200 + Math.sin(a) * (long ? 146 : 152)}
                  y2={200 - Math.cos(a) * (long ? 146 : 152)}
                  stroke={long ? '#e8c170' : '#6b4e16'}
                  strokeWidth={long ? 1.6 : 1}
                />
              );
            })}
            {ROMAN.map((n, i) => {
              const a = (i / 12) * Math.PI * 2;
              return (
                <text
                  key={n}
                  x={200 + Math.sin(a) * 128}
                  y={200 - Math.cos(a) * 128}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#eadbd2"
                  fontFamily="Cinzel Variable, Cinzel, serif"
                  fontWeight="700"
                  fontSize="15"
                >
                  {n}
                </text>
              );
            })}

            {/* hands: minute sweeps with progress, seconds tick */}
            <g stroke="#e8c170" strokeLinecap="round">
              <line x1="200" y1="200" x2={200 + Math.sin(rad(hour)) * 72} y2={200 - Math.cos(rad(hour)) * 72} strokeWidth="4" />
              <line x1="200" y1="200" x2={200 + Math.sin(rad(minute)) * 112} y2={200 - Math.cos(rad(minute)) * 112} strokeWidth="2.5" />
            </g>
            <line
              x1="200"
              y1="200"
              x2={200 + Math.sin(rad(sec * 6)) * 132}
              y2={200 - Math.cos(rad(sec * 6)) * 132}
              stroke="#e0263a"
              strokeWidth="1"
            />
            <circle cx="200" cy="200" r="5" fill="#e8c170" />
          </g>

          {/* the case: this is what becomes the hero ring */}
          <circle cx="200" cy="200" r="170" fill="none" stroke="#c9962b" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          <circle cx="200" cy="200" r="164" fill="none" stroke="#c9962b" strokeOpacity="0.45" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>

      <div data-works className="mt-8 flex flex-col items-center gap-2">
        <span className="stencil tabular text-6xl text-stone">{String(pct).padStart(3, '0')}</span>
        <span className="text-sm text-stone-dim">Winding up ATMOS ’26</span>
      </div>
    </div>
  );
}
