import { Suspense, useEffect } from 'react';
import { useLocation, useOutlet } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { SmoothScroll, useLenis, scrollToTarget } from '../components/SmoothScroll';
import { useReducedMotion } from '../lib/hooks';
import { Nav } from './Nav';
import { Footer } from './Footer';
import { Cursor } from './Cursor';

const EASE = [0.87, 0, 0.13, 1] as const;

// the first page of a visit arrives without the iris (the hero has its own intro)
let firstPage = true;

export default function Layout() {
  return (
    <SmoothScroll>
      <a
        href="#main"
        className="meta fixed left-4 top-3 z-[90] -translate-y-20 bg-brass px-3 py-2 text-void focus:translate-y-0"
      >
        Skip to content
      </a>
      <Nav />
      <Pages />
      <Cursor />
      <div aria-hidden className="grain" />
      {/* duotone for photos: luminance mapped black → brass → stone */}
      <svg aria-hidden width="0" height="0" className="absolute">
        <filter id="duotone" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 1 0" />
          <feComponentTransfer>
            <feFuncR type="table" tableValues="0.01 0.42 0.79 0.92" />
            <feFuncG type="table" tableValues="0.01 0.24 0.55 0.86" />
            <feFuncB type="table" tableValues="0.01 0.07 0.2 0.8" />
          </feComponentTransfer>
        </filter>
      </svg>
    </SmoothScroll>
  );
}

// Route changes play a ring iris: the brass ring swells to swallow the old page,
// then contracts to a point to reveal the new one.
function Pages() {
  const location = useLocation();
  const outlet = useOutlet();
  const lenis = useLenis();
  const still = useReducedMotion();
  // hash links: scroll to the anchor once the new page is in
  useEffect(() => {
    if (!location.hash) return;
    const id = setTimeout(() => scrollToTarget(lenis, location.hash), 120);
    return () => clearTimeout(id);
  }, [location.hash, location.pathname, lenis]);

  const d = still ? 0 : 0.55;
  const cover = firstPage ? 'open' : 'cover';
  useEffect(() => {
    firstPage = false;
  }, []);
  return (
    <AnimatePresence mode="wait" onExitComplete={() => !location.hash && scrollToTarget(lenis, 0, true)}>
      <motion.div key={location.pathname} initial={cover} animate="open" exit="close">
        <main id="main">
          <Suspense fallback={<div className="min-h-svh" />}>{outlet}</Suspense>
        </main>
        <Footer />
        <motion.div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[75] bg-void"
          variants={{
            cover: { clipPath: 'circle(75vmax at 50% 50%)' },
            open: { clipPath: 'circle(0vmax at 50% 50%)', transition: { duration: d * 1.2, ease: EASE, delay: 0.05 } },
            close: { clipPath: 'circle(75vmax at 50% 50%)', transition: { duration: d, ease: EASE } },
          }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none fixed left-1/2 top-1/2 z-[76] -ml-[75vmax] -mt-[75vmax] size-[150vmax] rounded-full border-2 border-brass"
          variants={{
            cover: { scale: 1, opacity: 1 },
            open: { scale: 0, opacity: 0.2, transition: { duration: d * 1.2, ease: EASE, delay: 0.05 } },
            close: { scale: 1, opacity: 1, transition: { duration: d, ease: EASE } },
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}
