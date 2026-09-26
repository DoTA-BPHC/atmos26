import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../lib/hooks';

/**
 * The damaged-film overlay from the countdown reel: a few hairline scratches
 * and specks of dust that jump every couple of frames. Runs at ~12 fps like
 * a projector gate, and only while on screen.
 */
export function FilmScratches({ className = '', density = 1 }: { className?: string; density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const still = useReducedMotion();

  useEffect(() => {
    const c = ref.current;
    if (!c || still) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0, h = 0, timer = 0, visible = true;
    const resize = () => {
      const r = c.getBoundingClientRect();
      w = r.width;
      h = r.height;
      c.width = w * dpr;
      c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // a couple of long scratches persist for a while and wobble
    const long = Array.from({ length: 2 }, () => ({ x: Math.random(), life: 0 }));

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = 'round';
      // hairlines: short curved strokes, like hairs caught in the gate
      const n = Math.round((2 + Math.random() * 4) * density);
      for (let i = 0; i < n; i++) {
        const x = Math.random() * w, y = Math.random() * h;
        const len = 20 + Math.random() * 90;
        const a = Math.random() * Math.PI * 2;
        ctx.strokeStyle = `rgba(235,228,220,${0.18 + Math.random() * 0.35})`;
        ctx.lineWidth = 0.6 + Math.random() * 0.8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(
          x + Math.cos(a + 0.8) * len * 0.6, y + Math.sin(a + 0.8) * len * 0.6,
          x + Math.cos(a) * len, y + Math.sin(a) * len,
        );
        ctx.stroke();
      }
      // dust specks
      const d = Math.round((6 + Math.random() * 10) * density);
      for (let i = 0; i < d; i++) {
        ctx.fillStyle = `rgba(240,235,228,${0.25 + Math.random() * 0.5})`;
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, 0.5 + Math.random() * 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      // vertical running scratches
      for (const s of long) {
        s.life--;
        if (s.life <= 0) {
          s.x = Math.random();
          s.life = Math.random() < 0.5 ? 0 : 6 + Math.random() * 20;
        }
        if (s.life > 0) {
          s.x += (Math.random() - 0.5) * 0.002;
          ctx.strokeStyle = 'rgba(235,228,220,0.12)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(s.x * w, 0);
          ctx.lineTo(s.x * w + (Math.random() - 0.5) * 3, h);
          ctx.stroke();
        }
      }
    };

    const start = () => {
      clearInterval(timer);
      timer = window.setInterval(() => visible && draw(), 83);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (!visible) ctx.clearRect(0, 0, w, h);
    });
    io.observe(c);
    start();
    return () => {
      clearInterval(timer);
      ro.disconnect();
      io.disconnect();
    };
  }, [still, density]);

  return <canvas ref={ref} className={`pointer-events-none ${className}`} aria-hidden />;
}
