import { useEffect, useRef, type ComponentPropsWithoutRef } from 'react';
import type { ShapePose } from './shapes';
import { particles } from './store';

// A section that tells the particle field what to become while it holds the
// middle of the screen.
export function ShapeSection({
  pose,
  onActive,
  children,
  ...rest
}: { pose: ShapePose; onActive?: () => void } & ComponentPropsWithoutRef<'section'>) {
  const ref = useRef<HTMLElement>(null);
  const poseRef = useRef(pose);
  const activeRef = useRef(onActive);
  useEffect(() => {
    poseRef.current = pose;
    activeRef.current = onActive;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        particles.set(poseRef.current);
        activeRef.current?.();
      },
      { rootMargin: '-50% 0px -50% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // pose changes while active (e.g. a pinned section stepping through eras)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const mid = window.innerHeight / 2;
    if (r.top <= mid && r.bottom >= mid) particles.set(pose);
  }, [pose]);

  return (
    <section ref={ref} {...rest}>
      {children}
    </section>
  );
}
