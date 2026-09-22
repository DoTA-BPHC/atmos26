import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { LeftHand3D } from './LeftHand3D';
import { RightHand2D } from './RightHand2D';

/**
 * HeroScene
 * ---------
 * Full-screen hero container with:
 *  • A dark R3F Canvas (space stars + 3D wireframe left hand)
 *  • An HTML overlay for the 2D right hand (outside the Canvas)
 *
 * The Canvas covers the hero absolutely so the typography in App.tsx
 * can layer on top with pointer-events-none.
 */
export default function HeroScene() {
  return (
    <div className="absolute inset-0 z-0 bg-[#050505]">
      {/* ── WebGL Canvas ─────────────────────────────────────── */}
      <Canvas
        camera={{ position: [0, 0, 12], fov: 50 }}
        style={{ width: '100%', height: '100%', display: 'block' }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#050505']} />

        {/* Minimal lighting — the wireframe is MeshBasicMaterial so it
            ignores lights, but we keep a dim ambient for potential extras */}
        <ambientLight intensity={0.3} />

        {/* Star field */}
        <Stars
          radius={120}
          depth={60}
          count={4000}
          factor={4}
          saturation={0}
          fade
          speed={0.8}
        />

        {/* 3D Left Hand — wireframe, tracks cursor */}
        <Suspense fallback={null}>
          <LeftHand3D
            position={[-4.5, 0, 0]}
            scale={0.07}
            rotation={[-0.3, 0.5, 0.4]}
          />
        </Suspense>
      </Canvas>

      {/* ── HTML Overlay: 2D Right Hand ──────────────────────── */}
      <RightHand2D />
    </div>
  );
}
