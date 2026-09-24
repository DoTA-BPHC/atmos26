import { forwardRef, useImperativeHandle, useRef } from 'react';

export interface SparkHandle {
  fire: () => void;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; size: number; hue: 'brass' | 'signal' | 'white';
}

const COLORS = {
  brass: [232, 193, 112],
  signal: [127, 246, 255],
  white: [255, 244, 222],
} as const;

/**
 * The moment the fingertips meet: a white-hot core, a shock ring in brass, and
 * sparks that arc outward and fall. Drawn with additive blending on a canvas
 * laid over the stage; the canvas only runs for the ~1.6 s the burst lasts.
 */
export const ConvergenceSpark = forwardRef<SparkHandle, { x: number; y: number }>(function ConvergenceSpark(
  { x, y },
  ref,
) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(ref, () => ({
    fire() {
      const c = canvas.current;
      if (!c) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = c.getBoundingClientRect();
      c.width = width * dpr;
      c.height = height * dpr;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      const ox = x * width;
      const oy = y * height;
      const unit = width / 1000;

      const parts: Particle[] = Array.from({ length: 90 }, (_, i) => {
        const a = Math.random() * Math.PI * 2;
        const sp = (0.6 + Math.random() * 2.6) * unit * 3.2;
        return {
          x: ox, y: oy,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - unit * 0.8,
          life: 0,
          max: 45 + Math.random() * 55,
          size: (0.6 + Math.random() * 1.8) * unit * 1.6,
          hue: i % 5 === 0 ? 'white' : i % 3 === 0 ? 'signal' : 'brass',
        };
      });

      const start = performance.now();
      const frame = (now: number) => {
        const t = (now - start) / 1000;
        ctx.clearRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'lighter';

        // core flash
        const flash = Math.max(0, 1 - t / 0.55);
        if (flash > 0) {
          const r = unit * (40 + 160 * (1 - flash));
          const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
          g.addColorStop(0, `rgba(255,250,235,${0.95 * flash})`);
          g.addColorStop(0.25, `rgba(127,246,255,${0.55 * flash})`);
          g.addColorStop(1, 'rgba(47,163,168,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(ox, oy, r, 0, Math.PI * 2);
          ctx.fill();
        }

        // shock ring
        const ring = Math.min(1, t / 0.9);
        if (ring < 1) {
          const e = 1 - Math.pow(1 - ring, 3);
          ctx.strokeStyle = `rgba(232,193,112,${0.8 * (1 - ring)})`;
          ctx.lineWidth = unit * 2.4 * (1 - ring) + 0.5;
          ctx.beginPath();
          ctx.arc(ox, oy, unit * (10 + 300 * e), 0, Math.PI * 2);
          ctx.stroke();
        }

        let alive = false;
        for (const p of parts) {
          if (p.life > p.max) continue;
          alive = true;
          p.life++;
          p.vx *= 0.965;
          p.vy = p.vy * 0.965 + unit * 0.045;
          p.x += p.vx;
          p.y += p.vy;
          const k = 1 - p.life / p.max;
          const [r, g, b] = COLORS[p.hue];
          ctx.fillStyle = `rgba(${r},${g},${b},${k})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (0.4 + k * 0.6), 0, Math.PI * 2);
          ctx.fill();
        }

        if (alive || flash > 0) requestAnimationFrame(frame);
        else ctx.clearRect(0, 0, width, height);
      };
      requestAnimationFrame(frame);
    },
  }), [x, y]);

  return <canvas ref={canvas} className="pointer-events-none absolute inset-0 size-full" aria-hidden />;
});
