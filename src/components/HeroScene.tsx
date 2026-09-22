import { Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { Play } from 'lucide-react';
import { LeftHand3D } from './LeftHand3D';
import { RightHand2D } from './RightHand2D';
import { createRig, PULL, BUTTON_RADIUS } from './heroRig';

/**
 * HeroScene
 * ---------
 * "Creation of Adam" hero: a 3D wireframe hand reaches in from the top-left,
 * a real hand points up from the bottom-right, and their fingertips meet at
 * the play button in the middle.
 *
 * Both hands aim at a shared convergence point (see heroRig.ts) that sits at
 * the centre and gets pulled slightly towards the cursor.
 */
export default function HeroScene({ onPlay }: { onPlay?: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null!);
  const rig = useRef(createRig());

  useEffect(() => {
    const r = rig.current;
    const el = containerRef.current;
    r.still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    r.coarse = window.matchMedia('(pointer: coarse)').matches;
    r.w = el.clientWidth;
    r.h = el.clientHeight;
    r.px = r.tx = r.w / 2;
    r.py = r.ty = r.h / 2;
    r.start = performance.now();

    const onMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      r.px = e.clientX - rect.left;
      r.py = e.clientY - rect.top;
    };

    let rafId: number;
    const tick = () => {
      r.w = el.clientWidth;
      r.h = el.clientHeight;
      const cx = r.w / 2;
      const cy = r.h / 2;
      const track = !r.still && !r.coarse;
      const goalX = track ? cx + (r.px - cx) * PULL : cx;
      const goalY = track ? cy + (r.py - cy) * PULL : cy;
      r.tx += (goalX - r.tx) * 0.06;
      r.ty += (goalY - r.ty) * 0.06;
      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMouseMove);
    rafId = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 overflow-hidden bg-[#050505]">
      <Canvas
        camera={{ position: [0, 0, 12], fov: 50 }}
        style={{ width: '100%', height: '100%', display: 'block' }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#050505']} />

        <Stars radius={120} depth={60} count={3000} factor={3} saturation={0} fade speed={0.6} />

        <Suspense fallback={null}>
          <LeftHand3D rig={rig} />
        </Suspense>
      </Canvas>

      <RightHand2D rig={rig} />

      {/* play button the fingertips reach for */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[3]">
        <button
          type="button"
          onClick={onPlay}
          aria-label="Play ATMOS teaser"
          className="group relative flex items-center justify-center rounded-full border border-[#C9962B]/70 bg-[#0b0b0b]/80 text-[#e9d9b8] shadow-[0_0_28px_rgba(201,150,43,0.25)] backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-[#C9962B] hover:shadow-[0_0_40px_rgba(201,150,43,0.45)] cursor-pointer"
          style={{ width: BUTTON_RADIUS * 2, height: BUTTON_RADIUS * 2 }}
        >
          <span className="absolute inset-[5px] rounded-full border border-[#C9962B]/20" />
          <Play className="w-5 h-5 translate-x-[1px] fill-current" />
        </button>
      </div>
    </div>
  );
}
