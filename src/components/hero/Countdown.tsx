import { useEffect, useRef, useState } from 'react';
import { FEST } from '../../data/fest';
import { useNow, useReducedMotion } from '../../lib/hooks';

// whole calendar days between today and the opening day, counted in IST
function daysUntil(now: number, when: Date) {
  const ist = (t: number) => {
    const d = new Date(t + 5.5 * 3_600_000);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  };
  return Math.round((ist(when.getTime()) - ist(now)) / 86_400_000);
}

// The countdown reel's title card, live: "29 DAYS TO GO", with its red glitch
// firing now and then.
export function Countdown({ className = '', glitch = true }: { className?: string; glitch?: boolean }) {
  const now = useNow(30_000);
  const still = useReducedMotion();
  const ref = useRef<HTMLParagraphElement>(null);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (!glitch || still) return;
    let t = 0;
    const next = () => {
      t = window.setTimeout(() => {
        setRun((r) => r + 1);
        next();
      }, 5000 + Math.random() * 7000);
    };
    // first one right after the hero lands
    t = window.setTimeout(() => {
      setRun(1);
      next();
    }, 900);
    return () => clearTimeout(t);
  }, [glitch, still]);

  const start = FEST.startsAt.getTime();
  const end = FEST.endsAt.getTime();
  let text: string;
  let label: string;
  if (now >= end) {
    text = 'See you in ’27';
    label = 'ATMOS 2026 has ended. See you next year.';
  } else if (now >= start) {
    const day = Math.min(3, Math.floor((now - start) / 86_400_000) + 1);
    text = `Day ${day} is live`;
    label = `ATMOS 2026 is live, day ${day} of 3.`;
  } else {
    const days = daysUntil(now, FEST.startsAt);
    text = days === 1 ? '1 day to go' : `${days} days to go`;
    label = `${days} ${days === 1 ? 'day' : 'days'} to go until ATMOS 2026.`;
  }

  return (
    <p
      ref={ref}
      key={run}
      aria-label={label}
      data-text={text}
      className={`stencil glitch-text origin-center scale-x-[0.74] whitespace-nowrap text-stone ${run ? 'glitch-run' : ''} ${className}`}
    >
      {text}
    </p>
  );
}
