import { useEffect, useLayoutEffect, useRef } from 'react';
import { motion, useAnimate, useTransform, type MotionValue } from 'framer-motion';
import manifest from '../../data/logoLayers.json';
import { ConvergenceSpark, type SparkHandle } from './ConvergenceSpark';

/**
 * LogoStage
 * ---------
 * The official ATMOS '26 artwork, rebuilt from layers cut out of the original
 * JPEG (scripts/logo_layers.py). In the final pose every pixel matches the
 * original (scripts/verify_logo.py); only pixels hidden behind other layers
 * were ever generated.
 *
 * Build-up: ring draws itself → vortex spins up → circuits light outwards →
 * the two hands glide in from their corners → a spark where they converge →
 * the letters ripple out from the M → taglines wipe in.
 */

type LayerName =
  | 'outer' | 'disc' | 'ring' | 'A' | 'T' | 'M' | 'O' | 'S'
  | 'hand_bottom_back' | 'hand_bottom' | 'hand_top' | 'm_front' | 'tagline_top' | 'tagline_bottom';

const SIZE = manifest.size[0];
const RING = manifest.ring;
const pct = (v: number) => `${(v / SIZE) * 100}%`;
const layers = manifest.layers as { name: LayerName; x: number; y: number; w: number; h: number }[];

// where the fingertips meet, in logo pixels
const CONVERGE = { x: 566, y: 548 };

// parallax depth per layer (px of travel at the edge of the stage)
const DEPTH: Record<LayerName, number> = {
  outer: 4, disc: 7, ring: 8,
  A: 13, T: 13, M: 14, O: 13, S: 13, m_front: 14,
  hand_bottom: 22, hand_bottom_back: 22, hand_top: 20,
  tagline_top: 11, tagline_bottom: 11,
};

// origin for rotating/scaling a layer about the ring centre
const ringOrigin = (l: { x: number; y: number; w: number; h: number }) =>
  `${((RING.cx - l.x) / l.w) * 100}% ${((RING.cy - l.y) / l.h) * 100}%`;

const EXPO = [0.16, 1, 0.3, 1] as const;

export function LogoStage({
  play,
  still,
  interactive,
  exit,
  skipRingDraw = false,
  onBuilt,
}: {
  /** start the build-up */
  play: boolean;
  /** reduced motion: show the final pose immediately */
  still: boolean;
  /** pointer parallax */
  interactive: boolean;
  /** 0..1 as the hero scrolls away */
  exit: MotionValue<number>;
  /** the preloader already left a ring in place */
  skipRingDraw?: boolean;
  onBuilt?: () => void;
}) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const spark = useRef<SparkHandle>(null);
  const built = useRef(false);

  // pre-intro poses for transforms (framer owns transforms, so set them through it
  // before the first paint rather than as inline CSS)
  useLayoutEffect(() => {
    if (still || built.current) return;
    const q = (n: string) => `[data-layer="${n}"] > * > .l-anim`;
    animate(q('disc'), { rotate: -70, scale: 0.86 }, { duration: 0 });
    animate(q('hand_top'), { x: '-42%', y: '-46%' }, { duration: 0 });
    animate(q('hand_bottom'), { x: '38%', y: '40%' }, { duration: 0 });
    // the fingertips behind the letters travel with the hand (their layer is
    // smaller, so move it by the same distance in logo pixels, not percent)
    const hb = layers.find((l) => l.name === 'hand_bottom')!;
    const hbb = layers.find((l) => l.name === 'hand_bottom_back')!;
    animate(q('hand_bottom_back'), { x: `${(0.38 * hb.w * 100) / hbb.w}%`, y: `${(0.4 * hb.h * 100) / hbb.h}%` }, { duration: 0 });
    for (const n of ['A', 'T', 'M', 'O', 'S', 'm_front']) animate(q(n), { y: '6%', scale: 1.35 }, { duration: 0 });
  }, [still, animate]);

  // ---- build-up ----
  useEffect(() => {
    if (still) {
      built.current = true;
      onBuilt?.();
      return;
    }
    if (!play || built.current) return;
    built.current = true;
    const q = (n: LayerName) => `[data-layer="${n}"] > * > .l-anim`;
    const run = async () => {
      if (!skipRingDraw) animate(q('ring'), { '--sweep': '360deg' }, { duration: 1.5, ease: EXPO });
      animate(q('disc'), { opacity: 1, rotate: 0, scale: 1, filter: 'blur(0px)' }, { duration: 2.2, ease: EXPO, delay: 0.15 });
      animate(q('outer'), { '--reach': '120%' }, { duration: 1.8, ease: EXPO, delay: 0.55 });

      const handIn = { opacity: 1, x: 0, y: 0, filter: 'blur(0px)' };
      animate(q('hand_top'), handIn, { duration: 1.6, ease: EXPO, delay: 0.9 });
      animate(q('hand_bottom_back'), handIn, { duration: 1.6, ease: EXPO, delay: 1.0 });
      await animate(q('hand_bottom'), handIn, { duration: 1.6, ease: EXPO, delay: 1.0 });

      spark.current?.fire();

      const letterIn = { opacity: 1, scale: 1, filter: 'blur(0px)', y: 0 };
      const letter = (n: LayerName[], delay: number) =>
        n.forEach((l) => animate(q(l), letterIn, { duration: 0.9, ease: EXPO, delay }));
      letter(['M', 'm_front'], 0);
      letter(['T', 'O'], 0.12);
      letter(['A', 'S'], 0.24);

      animate(q('tagline_top'), { clipPath: 'inset(0% 0% 0% 0%)' }, { duration: 1.1, ease: EXPO, delay: 0.55 });
      await animate(q('tagline_bottom'), { clipPath: 'inset(0% 0% 0% 0%)' }, { duration: 1.1, ease: EXPO, delay: 0.75 });
      onBuilt?.();
    };
    run();
  }, [play, still, animate, onBuilt, skipRingDraw]);

  // ---- idle parallax, only after the build-up ----
  useEffect(() => {
    if (!interactive || still) return;
    const root = scope.current;
    const wraps = [...root.querySelectorAll<HTMLElement>('[data-layer]')];
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const loop = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      for (const w of wraps) {
        const d = DEPTH[w.dataset.layer as LayerName];
        w.style.transform = `translate3d(${(-cx * d).toFixed(2)}px,${(-cy * d).toFixed(2)}px,0)`;
      }
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      wraps.forEach((w) => (w.style.transform = ''));
    };
  }, [interactive, still, scope]);

  // ---- scroll exit: hands part, letters lift, the ring stays ----
  const topX = useTransform(exit, [0, 1], ['0%', '-16%']);
  const topY = useTransform(exit, [0, 1], ['0%', '-22%']);
  const botX = useTransform(exit, [0, 1], ['0%', '14%']);
  const botY = useTransform(exit, [0, 1], ['0%', '20%']);
  // same travel for the fingertip layer, converted to its own box size
  const hbBox = layers.find((l) => l.name === 'hand_bottom')!;
  const hbbBox = layers.find((l) => l.name === 'hand_bottom_back')!;
  const botXBack = useTransform(exit, [0, 1], ['0%', `${(14 * hbBox.w) / hbbBox.w}%`]);
  const botYBack = useTransform(exit, [0, 1], ['0%', `${(20 * hbBox.h) / hbbBox.h}%`]);
  const fadeLate = useTransform(exit, [0.1, 0.75], [1, 0]);
  const fadeEarly = useTransform(exit, [0, 0.45], [1, 0]);
  const letterLift = useTransform(exit, [0, 1], ['0%', '-18%']);
  const outerFade = useTransform(exit, [0, 0.6], [1, 0.25]);

  const exitStyle = (n: LayerName) => {
    switch (n) {
      case 'hand_top':
        return { x: topX, y: topY, opacity: fadeLate };
      case 'hand_bottom':
        return { x: botX, y: botY, opacity: fadeLate };
      case 'hand_bottom_back':
        return { x: botXBack, y: botYBack, opacity: fadeLate };
      case 'A': case 'T': case 'M': case 'O': case 'S': case 'm_front':
        return { y: letterLift, opacity: fadeEarly };
      case 'tagline_top': case 'tagline_bottom':
        return { opacity: fadeEarly };
      case 'outer':
        return { opacity: outerFade };
      default:
        return {};
    }
  };

  // initial (pre-intro) styles per layer
  const from = (l: (typeof layers)[number]): React.CSSProperties => {
    if (still) return {};
    switch (l.name) {
      case 'ring':
        return {
          '--sweep': skipRingDraw ? '360deg' : '0deg',
          maskImage: 'conic-gradient(from -90deg at var(--ox) var(--oy), #000 var(--sweep), transparent 0)',
          WebkitMaskImage: 'conic-gradient(from -90deg at var(--ox) var(--oy), #000 var(--sweep), transparent 0)',
          '--ox': `${((RING.cx - l.x) / l.w) * 100}%`,
          '--oy': `${((RING.cy - l.y) / l.h) * 100}%`,
        } as React.CSSProperties;
      case 'outer':
        return {
          '--reach': '40%',
          maskImage: `radial-gradient(circle at ${pct(RING.cx)} ${pct(RING.cy)}, #000 var(--reach), transparent calc(var(--reach) + 12%))`,
          WebkitMaskImage: `radial-gradient(circle at ${pct(RING.cx)} ${pct(RING.cy)}, #000 var(--reach), transparent calc(var(--reach) + 12%))`,
        } as React.CSSProperties;
      case 'disc':
        return { opacity: 0, filter: 'blur(14px)', transformOrigin: ringOrigin(l) };
      case 'hand_top':
      case 'hand_bottom':
      case 'hand_bottom_back':
        return { opacity: 0, filter: 'blur(8px)' };
      case 'tagline_top':
      case 'tagline_bottom':
        return { clipPath: 'inset(0% 100% 0% 0%)' };
      default:
        // letters
        return {
          opacity: 0,
          filter: 'blur(10px)',
          transformOrigin: `${((CONVERGE.x - l.x) / l.w) * 100}% ${((CONVERGE.y - l.y) / l.h) * 100}%`,
        };
    }
  };

  return (
    <div ref={scope} className="relative aspect-square w-full select-none" aria-hidden>
      {layers.map((l) => (
        <div
          key={l.name}
          data-layer={l.name}
          className="absolute will-change-transform"
          style={{ left: pct(l.x), top: pct(l.y), width: pct(l.w), height: pct(l.h) }}
        >
          <motion.div className="size-full" style={exitStyle(l.name)}>
            <img
              src={`/logo/${l.name}.webp`}
              alt=""
              draggable={false}
              decoding="async"
              fetchPriority={l.name === 'disc' || l.name === 'outer' ? 'high' : 'auto'}
              className="l-anim block size-full"
              style={from(l)}
            />
          </motion.div>
        </div>
      ))}
      <ConvergenceSpark ref={spark} x={CONVERGE.x / SIZE} y={CONVERGE.y / SIZE} />
    </div>
  );
}
