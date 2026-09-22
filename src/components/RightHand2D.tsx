import { useRef, useEffect } from 'react';
import pointingHandImg from '../assets/pointing_hand.png';

/**
 * RightHand2D
 * -----------
 * A pure HTML/CSS overlay (NOT inside the R3F Canvas).
 * Positioned at the bottom-right of the hero viewport.
 * Uses Math.atan2 in screen-space to calculate the angle from its anchor
 * (wrist, at the bottom-right corner) to the cursor, then smoothly
 * rotates the image via CSS transform so the index finger always aims
 * at the cursor.
 *
 * The generated image shows a hand entering from the lower-right with
 * the index finger pointing upper-left — roughly at –135° in screen-space
 * atan2 (where Y-down, 0° = right).
 */
export function RightHand2D() {
  const containerRef = useRef<HTMLDivElement>(null!);
  const currentAngle = useRef(0);
  const targetAngle = useRef(0);

  useEffect(() => {
    let rafId: number;

    // ---- Mouse tracking ----
    const onMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      // Anchor = bottom-right corner of the container (≈ the wrist)
      const rect = containerRef.current.getBoundingClientRect();
      const anchorX = rect.right - 40;   // slightly inset from edge
      const anchorY = rect.bottom - 40;

      const dx = e.clientX - anchorX;
      const dy = e.clientY - anchorY;

      // Screen-space angle (Y-down, 0° = right, CW positive)
      const mouseAngle = Math.atan2(dy, dx);

      // The image's natural pointing direction ≈ upper-left from its
      // wrist corner, which is about –135° (–3π/4) in this coord system.
      const naturalAngle = (-3 * Math.PI) / 4;

      targetAngle.current = mouseAngle - naturalAngle;
    };

    // ---- Smooth animation loop ----
    const animate = () => {
      // Shortest-path angular lerp (handles ±π wrapping)
      let diff = targetAngle.current - currentAngle.current;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;

      currentAngle.current += diff * 0.06;

      if (containerRef.current) {
        const img = containerRef.current.querySelector('img');
        if (img) {
          img.style.transform = `rotate(${currentAngle.current}rad)`;
        }
      }

      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', onMouseMove);
    rafId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute bottom-0 right-0 pointer-events-none z-[2]"
      style={{ width: 600, height: 600 }}
    >
      <img
        src={pointingHandImg}
        alt=""
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          transformOrigin: '75% 75%',   // roughly where the wrist is
          willChange: 'transform',
        }}
      />
    </div>
  );
}
