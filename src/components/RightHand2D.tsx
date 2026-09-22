import { useRef, useEffect, type RefObject } from 'react';
import pointingHandImg from '../assets/pointing_hand.png';
import { DIR_RIGHT, fingertip, fingertipGap, type HeroRig } from './heroRig';

/**
 * RightHand2D
 * -----------
 * HTML overlay (not inside the Canvas). The photo has the wrist at the
 * bottom-right and the index finger pointing up-left.
 *
 * Every frame the image is moved so its fingertip lands on the convergence
 * point (plus the idle gap), and rotated around the fingertip by at most ±12°
 * towards the cursor — enough to feel alive without breaking the pose.
 *
 * The photo has a black background, so `mix-blend-mode: lighten` drops it
 * onto the starfield.
 */

// fingertip position inside pointing_hand.png, as a fraction of its size
const TIP = { x: 0.19, y: 0.195 };
const MAX_TILT = (12 * Math.PI) / 180;
// direction the finger points in the photo (wrist → tip)
const BASE_ANGLE = Math.atan2(-DIR_RIGHT.y, -DIR_RIGHT.x);

export function RightHand2D({ rig }: { rig: RefObject<HeroRig> }) {
  const imgRef = useRef<HTMLImageElement>(null!);

  useEffect(() => {
    let rafId: number;
    let angle = 0;

    const animate = () => {
      const r = rig.current;
      const img = imgRef.current;
      if (r && img) {
        const size = img.offsetWidth;
        const p = fingertip(r, DIR_RIGHT, fingertipGap(r, performance.now()));

        let target = 0;
        if (!r.still && !r.coarse) {
          // wrist sits roughly one image-width back along the finger
          const wx = p.x + DIR_RIGHT.x * size * 0.9;
          const wy = p.y + DIR_RIGHT.y * size * 0.9;
          let diff = Math.atan2(r.py - wy, r.px - wx) - BASE_ANGLE;
          while (diff > Math.PI) diff -= 2 * Math.PI;
          while (diff < -Math.PI) diff += 2 * Math.PI;
          target = Math.max(-MAX_TILT, Math.min(MAX_TILT, diff));
        }
        angle += (target - angle) * 0.06;

        img.style.transform = `translate(${p.x - TIP.x * size}px, ${p.y - TIP.y * size}px) rotate(${angle}rad)`;
      }
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [rig]);

  return (
    <img
      ref={imgRef}
      src={pointingHandImg}
      alt=""
      draggable={false}
      className="absolute left-0 top-0 pointer-events-none select-none z-[2] mix-blend-lighten"
      style={{
        width: 'clamp(300px, 58vw, 820px)',
        // the photo is a cropped square — fade the right/bottom edges so the forearm doesn't end in a hard line
        maskImage: 'linear-gradient(to right, black 70%, transparent 98%), linear-gradient(to bottom, black 70%, transparent 98%)',
        maskComposite: 'intersect',
        transformOrigin: `${TIP.x * 100}% ${TIP.y * 100}%`,
        willChange: 'transform',
        // start off-screen until the first frame positions it
        transform: 'translate(200vw, 200vh)',
      }}
    />
  );
}
