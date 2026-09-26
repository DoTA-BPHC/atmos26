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

const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
const unitVec = (x: number, y: number) => {
  const l = Math.hypot(x, y) || 1;
  return { x: x / l, y: y / l };
};

export function LogoStage({
  play,
  still,
  interactive,
  fine,
  exit,
  skipRingDraw = false,
  onBuilt,
}: {
  /** start the build-up */
  play: boolean;
  /** reduced motion: show the final pose immediately */
  still: boolean;
  /** parallax, hands, tap and vortex (after the build-up) */
  interactive: boolean;
  /** mouse available: hands follow it; otherwise tilt drives the parallax */
  fine: boolean;
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

  // ---- after the build-up: parallax (pointer or tilt), hands that follow the
  // pointer, tap to converge again, a vortex you can stir. Everything eases
  // back to zero, so at rest the layers sit exactly as in the artwork. ----
  useEffect(() => {
    if (!interactive || still) return;
    const root = scope.current;
    const wraps = [...root.querySelectorAll<HTMLElement>('[data-layer]')];
    const wrap = (n: LayerName) => wraps.find((w) => w.dataset.layer === n)!;
    const disc = wrap('disc');
    disc.style.transformOrigin = ringOrigin(layers.find((l) => l.name === 'disc')!);
    const ht = layers.find((l) => l.name === 'hand_top')!;
    const hb = layers.find((l) => l.name === 'hand_bottom')!;
    // each hand parts along the diagonal it flew in on
    const dirTop = unitVec(-0.42 * ht.w, -0.46 * ht.h);
    const dirBot = unitVec(0.38 * hb.w, 0.4 * hb.h);

    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0, visible = true;
    let over = false, lx = 0, ly = 0, prevX = NaN, prevY = NaN;
    let gap = 0, leanX = 0, leanY = 0;
    let armed = true, cooldown = 0;
    let burstAt = -1, burstFired = false;
    let theta = 0, omega = 0, lastScroll = window.scrollY;
    let downX = 0, downY = 0;
    let tiltBase: { b: number; g: number } | null = null;

    const toLogo = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * SIZE, y: ((e.clientY - r.top) / r.height) * SIZE };
    };
    const inRing = (x: number, y: number) => Math.hypot(x - RING.cx, y - RING.cy) < RING.r;

    const onMove = (e: PointerEvent) => {
      if (!fine || e.pointerType !== 'mouse') return;
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      const p = toLogo(e);
      over = inRing(p.x, p.y);
      if (over && !Number.isNaN(prevX)) {
        // stirring: how far the pointer swept around the ring centre
        const rx = p.x - RING.cx, ry = p.y - RING.cy;
        const swept = (rx * (p.y - prevY) - ry * (p.x - prevX)) / (rx * rx + ry * ry + 1e3);
        omega = clamp(omega + swept * 57.3 * 0.4, 6);
      }
      prevX = p.x;
      prevY = p.y;
      lx = p.x;
      ly = p.y;
      const d = Math.hypot(lx - CONVERGE.x, ly - CONVERGE.y);
      if (d > 90) armed = true;
      if (over && armed && d < 55 && performance.now() > cooldown && burstAt < 0) {
        armed = false;
        cooldown = performance.now() + 1200;
        spark.current?.fire();
      }
    };
    const onLeave = () => {
      over = false;
      prevX = prevY = NaN;
    };

    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      if (!tiltBase) tiltBase = { b: e.beta, g: e.gamma };
      // the baseline drifts to however the phone is being held
      tiltBase.b += (e.beta - tiltBase.b) * 0.004;
      tiltBase.g += (e.gamma - tiltBase.g) * 0.004;
      tx = clamp((e.gamma - tiltBase.g) / 25, 1);
      ty = clamp((e.beta - tiltBase.b) / 25, 1);
    };
    let tilting = false;
    const startTilt = () => {
      if (tilting) return;
      tilting = true;
      window.addEventListener('deviceorientation', onTilt);
    };
    const ask = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission;
    if (!fine && typeof window.DeviceOrientationEvent !== 'undefined' && !ask) startTilt();

    const onDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8) return;
      if ((e.target as Element | null)?.closest('a,button,input,textarea,select')) return;
      const p = toLogo(e);
      if (!inRing(p.x, p.y) || burstAt >= 0) return;
      // iOS only hands out tilt after a tap
      if (!fine && ask && !tilting) ask().then((s) => s === 'granted' && startTilt()).catch(() => {});
      burstAt = performance.now();
      burstFired = false;
      omega = clamp(omega + 7, 6);
      const letterRipple = (n: LayerName[], delay: number) =>
        n.forEach((l) =>
          animate(`[data-layer="${l}"] > * > .l-anim`, { scale: [1, 1.06, 1] }, { duration: 0.7, ease: EXPO, delay: 0.3 + delay }),
        );
      letterRipple(['M', 'm_front'], 0);
      letterRipple(['T', 'O'], 0.08);
      letterRipple(['A', 'S'], 0.16);
    };

    const loop = (now: number) => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;

      // hands: hover opens a gap that closes as the pointer nears the meeting point
      const d = Math.hypot(lx - CONVERGE.x, ly - CONVERGE.y);
      const hoverGap = over ? Math.min(1, d / 300) * 26 : 0;
      leanX += ((over ? clamp((lx - CONVERGE.x) * 0.03, 12) : 0) - leanX) * 0.08;
      leanY += ((over ? clamp((ly - CONVERGE.y) * 0.03, 12) : 0) - leanY) * 0.08;
      if (burstAt >= 0) {
        // tap: part quickly, then glide back together and spark on contact
        const t = (now - burstAt) / 1000;
        if (t < 0.3) gap = 40 * (1 - Math.pow(1 - t / 0.3, 3));
        else if (t < 1.2) gap = 40 * Math.pow(2, -10 * ((t - 0.3) / 0.9));
        else burstAt = -1;
        if (t > 0.3 && gap < 4 && !burstFired) {
          burstFired = true;
          spark.current?.fire();
        }
      } else {
        gap += (hoverGap - gap) * 0.08;
      }

      // vortex: stirred by the pointer and by scrolling, always settling back
      const scrollY = window.scrollY;
      omega = clamp(omega + (scrollY - lastScroll) * 0.02, 6);
      lastScroll = scrollY;
      omega *= 0.93;
      theta = (theta + omega) * 0.985;
      if (Math.abs(theta) < 0.01 && Math.abs(omega) < 0.01) theta = omega = 0;

      const k = root.offsetWidth / SIZE; // logo px → local px
      for (const w of wraps) {
        const n = w.dataset.layer as LayerName;
        const depth = DEPTH[n];
        let x = -cx * depth, y = -cy * depth, extra = '';
        if (n === 'hand_top') {
          x += (dirTop.x * gap + leanX) * k;
          y += (dirTop.y * gap + leanY) * k;
        } else if (n === 'hand_bottom' || n === 'hand_bottom_back') {
          x += (dirBot.x * gap + leanX) * k;
          y += (dirBot.y * gap + leanY) * k;
        } else if (n === 'disc' && theta) {
          extra = ` rotate(${theta.toFixed(3)}deg)`;
        }
        w.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)${extra}`;
      }
      raf = visible ? requestAnimationFrame(loop) : 0;
    };

    // stop drawing while the hero is scrolled away
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(loop);
    });
    io.observe(root);

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('deviceorientation', onTilt);
      wraps.forEach((w) => (w.style.transform = ''));
      disc.style.transformOrigin = '';
    };
  }, [interactive, fine, still, scope, animate]);

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
    <div
      ref={scope}
      className="relative aspect-square w-full touch-manipulation select-none"
      data-cursor={interactive && !still ? 'hot' : undefined}
      aria-hidden
    >
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
