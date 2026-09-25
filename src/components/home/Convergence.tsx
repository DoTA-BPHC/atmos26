import { motion } from 'framer-motion';
import { ShapeSection } from '../particles/ShapeSection';

const EXPO = [0.16, 1, 0.3, 1] as const;

const line = (delay: number) => ({
  initial: { opacity: 0, y: '0.4em', filter: 'blur(8px)' },
  whileInView: { opacity: 1, y: '0em', filter: 'blur(0px)' },
  viewport: { once: true, margin: '-20% 0px' },
  transition: { duration: 1.1, ease: EXPO, delay },
});

// The logo's moment, in dots: two hands reaching, and the line that says why.
export function Convergence() {
  return (
    <ShapeSection
      pose={{ shape: 'hands', size: 0.95, x: 0, y: 0, rx: 0.1, ry: -0.35, spin: 0.05, opacity: 0.75 }}
      className="relative h-[170svh]"
      aria-labelledby="convergence-title"
    >
      <div className="sticky top-0 flex h-svh items-center justify-center px-4 sm:px-8">
        <h2 id="convergence-title" className="display max-w-[16ch] text-center text-[clamp(2rem,4.2vw,4rem)] text-stone">
          <motion.span className="block" {...line(0)}>
            Every era built
          </motion.span>
          <motion.span className="block" {...line(0.08)}>
            a better hand
          </motion.span>
          <motion.span className="block" {...line(0.16)}>
            for its tools.
          </motion.span>
          <motion.span className="mt-[0.3em] block text-brass-hi" {...line(0.32)}>
            This time the tool
          </motion.span>
          <motion.span className="block text-brass-hi" {...line(0.4)}>
            reaches back.
          </motion.span>
        </h2>
      </div>
    </ShapeSection>
  );
}
