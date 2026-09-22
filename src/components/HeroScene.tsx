import { Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { AugmentedHand } from './AugmentedHand';
import { CircuitRing } from './CircuitRing';
import { rig as r } from './scanRig';

/**
 * HeroScene — "Augmentation Scanner"
 * ----------------------------------
 * A hand rises inside the brass ring from the ATMOS logo. The cursor is a
 * horizontal scan line: everything above it stays human, everything below it
 * turns into machine. Scrolling pushes the line to the top, so the hand ends
 * up fully augmented as you leave the hero.
 *
 * Layers (back → front): ring + vortex, ATMOS lettering, WebGL (stars + hand),
 * scan line HUD, bottom fade.
 */

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeInCubic = (x: number) => x * x * x;

export default function HeroScene() {
  const containerRef = useRef<HTMLDivElement>(null!);
  const lineRef = useRef<HTMLDivElement>(null!);
  const pctRef = useRef<HTMLSpanElement>(null!);

  useEffect(() => {
    const el = containerRef.current;
    r.still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    r.coarse = window.matchMedia('(pointer: coarse)').matches;
    r.w = el.clientWidth;
    r.h = el.clientHeight;
    // start below the wrist (fully human) so the intro sweeps upwards
    r.scanY = r.still ? r.h * 0.66 : r.h;
    r.start = performance.now();

    const setPointer = (x: number, y: number) => {
      const rect = el.getBoundingClientRect();
      if (y < rect.top || y > rect.bottom) return;
      r.pointerX = x - rect.left;
      r.pointerY = y - rect.top;
      r.pointerMoved = true;
    };
    const onMouseMove = (e: MouseEvent) => setPointer(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => setPointer(e.touches[0].clientX, e.touches[0].clientY);

    let rafId: number;
    let lastPct = -1;
    const tick = () => {
      r.w = el.clientWidth;
      r.h = el.clientHeight;
      r.ring = Math.min(window.innerHeight * 0.74, window.innerWidth * 0.88);
      const t = (performance.now() - r.start) / 1000;

      let target: number;
      if (r.still) target = r.handBottom > 0 ? r.handBottom - (r.handBottom - r.handTop) * 0.4 : r.h * 0.66;
      else if (r.pointerMoved) target = r.pointerY;
      else if (r.handBottom > 0) {
        // idle: breathe around a third of the way up the hand
        const span = r.handBottom - r.handTop;
        target = r.handBottom - span * (0.35 + 0.12 * Math.sin(t * 0.7));
      } else target = r.h;

      // scrolling out finishes the augmentation
      r.scroll = clamp01(window.scrollY / (r.h * 0.9));
      target += (-r.h * 0.1 - target) * easeInCubic(r.scroll);

      r.scanY += (target - r.scanY) * (r.still ? 1 : 0.07);

      lineRef.current.style.transform = `translateY(${r.scanY}px)`;
      const pct = Math.round(r.pct * 100);
      if (pct !== lastPct) {
        pctRef.current.textContent = String(pct).padStart(3, '0');
        lastPct = pct;
      }
      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    rafId = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 overflow-hidden bg-[#050505] [--ring:min(74svh,88vw)]"
    >
      <CircuitRing />

      {/* lettering, sits behind the hand like in the logo */}
      <div className="absolute left-1/2 top-[calc(50%-var(--ring)*0.2)] -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none font-['Cinzel',serif]">
        <p className="text-right text-[#C9962B] font-bold uppercase tracking-[0.32em] leading-[1.7] text-[calc(var(--ring)*0.03)] pr-[0.2em] mb-[calc(var(--ring)*0.01)]">
          Augmented
          <br />
          Ascension
        </p>
        <h1 className="font-black leading-[0.9] tracking-[0.04em] text-[calc(var(--ring)*0.28)] bg-[linear-gradient(180deg,#eadbd2_0%,#c9b3a8_55%,#8f7b71_100%)] bg-clip-text text-transparent drop-shadow-[0_6px_18px_rgba(0,0,0,0.8)]">
          ATMOS
        </h1>
        <p className="text-[#C9962B] font-bold uppercase tracking-[0.32em] leading-[1.7] text-[calc(var(--ring)*0.03)] mt-[calc(var(--ring)*0.015)]">
          The Transitional
          <br />
          Convergence
        </p>
      </div>

      <Canvas
        className="!absolute inset-0"
        camera={{ position: [0, 0, 12], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
        }}
        style={{ pointerEvents: 'none' }}
      >
        <Stars radius={120} depth={60} count={2500} factor={3} saturation={0} fade speed={0.5} />
        <Suspense fallback={null}>
          <AugmentedHand />
        </Suspense>
      </Canvas>

      {/* scan line HUD */}
      <div ref={lineRef} className="absolute left-0 right-0 top-0 pointer-events-none will-change-transform">
        <div className="h-px w-full bg-[linear-gradient(90deg,transparent_0%,rgba(127,246,255,0.15)_15%,rgba(127,246,255,0.9)_50%,rgba(127,246,255,0.15)_85%,transparent_100%)] shadow-[0_0_12px_rgba(127,246,255,0.6)]" />
        <div className="absolute right-[4vw] -top-5 font-mono text-[11px] tracking-[0.25em] uppercase text-[#7ff6ff]">
          Augmentation <span ref={pctRef}>000</span>%
        </div>
        <div className="absolute left-[4vw] -top-5 font-mono text-[11px] tracking-[0.25em] uppercase text-neutral-300">
          ↑ Human
        </div>
        <div className="absolute left-[4vw] top-2 font-mono text-[11px] tracking-[0.25em] uppercase text-[#4fc4c9]">
          ↓ Machine
        </div>
      </div>

      {/* fade the wrist into the page */}
      <div className="absolute inset-x-0 bottom-0 h-[22%] bg-gradient-to-t from-[#050505] to-transparent pointer-events-none" />
    </div>
  );
}
