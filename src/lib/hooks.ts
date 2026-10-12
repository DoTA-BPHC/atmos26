import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

function mediaStore(query: string) {
  return {
    subscribe(cb: () => void) {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    get: () => window.matchMedia(query).matches,
  };
}

const reduced = mediaStore('(prefers-reduced-motion: reduce)');
const finePointer = mediaStore('(hover: hover) and (pointer: fine)');

export const useReducedMotion = () => useSyncExternalStore(reduced.subscribe, reduced.get, () => false);
export const useFinePointer = () => useSyncExternalStore(finePointer.subscribe, finePointer.get, () => false);

// true once the element has come within `margin` of the viewport; optionally
// keeps tracking so callers can pause work when it leaves again
export function useInView<T extends Element>(margin = '0px', once = false) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && once) io.disconnect();
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin, once]);
  return [ref, inView] as const;
}

// ticking clock, one render per `ms`
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
