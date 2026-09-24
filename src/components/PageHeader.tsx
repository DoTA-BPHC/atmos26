import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { FilmScratches } from './FilmScratches';

const EXPO = [0.16, 1, 0.3, 1] as const;

// Top of every inner page: one huge line, one plain sentence under it.
export function PageHeader({ title, accent, children }: { title: string; accent?: string; children?: ReactNode }) {
  return (
    <header className="relative overflow-hidden px-4 pb-14 pt-36 sm:px-8 md:pt-44">
      <div className="mx-auto max-w-[1440px]">
        <motion.h1
          className="display text-[clamp(3rem,11vw,11rem)] text-stone"
          initial={{ opacity: 0, y: '0.3em', filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1.1, ease: EXPO, delay: 0.25 }}
        >
          {title}
          {accent && <span className="text-brass-hi"> {accent}</span>}
        </motion.h1>
        {children && (
          <motion.div
            className="mt-8 max-w-[52ch] text-[clamp(1.05rem,1.4vw,1.3rem)] leading-relaxed text-stone-dim text-lift"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EXPO, delay: 0.45 }}
          >
            {children}
          </motion.div>
        )}
      </div>
      <FilmScratches className="absolute inset-0 size-full opacity-60" density={0.5} />
    </header>
  );
}
