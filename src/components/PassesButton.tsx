import { useState } from 'react';
import { FEST } from '../data/fest';

// Passes aren't on sale yet, so the button says so instead of linking nowhere.
// Set FEST.registration.open + url to turn it into a real link.
export function PassesButton({ className = '' }: { className?: string }) {
  const [pinged, setPinged] = useState(false);
  const cls = `inline-flex h-12 items-center justify-center gap-2 border border-stone/35 px-6 text-[0.95rem] font-semibold text-stone transition-colors duration-300 hover:border-brass hover:text-brass-hi ${className}`;

  if (FEST.registration.open && FEST.registration.url) {
    return (
      <a href={FEST.registration.url} target="_blank" rel="noreferrer" className={cls}>
        Get passes
      </a>
    );
  }
  return (
    <button type="button" className={cls} onClick={() => setPinged(true)} aria-live="polite">
      {pinged ? 'Passes drop on @atmos_bitshyd' : 'Passes: opening soon'}
    </button>
  );
}
