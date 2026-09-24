import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { PageHeader } from '../components/PageHeader';
import { PassesButton } from '../components/PassesButton';
import { CATEGORIES, EVENTS, isCategory, type Category } from '../data/events';

const EXPO = [0.16, 1, 0.3, 1] as const;

export default function Events() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('c');
  const active: Category | 'all' = isCategory(raw) ? raw : 'all';
  const list = useMemo(() => (active === 'all' ? EVENTS : EVENTS.filter((e) => e.category === active)), [active]);
  const blurb = CATEGORIES.find((c) => c.id === active)?.blurb;

  const pick = (c: Category | 'all') => {
    const next = new URLSearchParams(params);
    if (c === 'all') next.delete('c');
    else next.set('c', c);
    setParams(next, { replace: true, preventScrollReset: true });
  };

  return (
    <>
      <PageHeader title="Events">
        Competitions, workshops, talks and games across three days on campus. This is the provisional line-up:
        prizes, slots and rules are announced as each event opens.
      </PageHeader>

      <section className="px-4 pb-24 sm:px-8" aria-label="Events">
        <div className="mx-auto max-w-[1440px]">
          {/* filter */}
          <LayoutGroup>
            <div role="tablist" aria-label="Category" className="flex flex-wrap gap-2 border-b border-stone/12 pb-6">
              {(['all', ...CATEGORIES.map((c) => c.id)] as const).map((c) => {
                const on = c === active;
                const label = c === 'all' ? 'All' : CATEGORIES.find((x) => x.id === c)!.label;
                const n = c === 'all' ? EVENTS.length : EVENTS.filter((e) => e.category === c).length;
                return (
                  <button
                    key={c}
                    role="tab"
                    aria-selected={on}
                    onClick={() => pick(c)}
                    className={`relative h-11 px-5 text-[0.95rem] font-medium transition-colors ${on ? 'text-void' : 'text-stone-dim hover:text-stone'}`}
                  >
                    {on && <motion.span layoutId="evt-pill" className="absolute inset-0 bg-stone" transition={{ duration: 0.5, ease: EXPO }} />}
                    <span className="relative">
                      {label} <span className={on ? 'text-void/60' : 'text-stone-mute'}>{n}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
          {blurb && <p className="mt-6 max-w-[60ch] text-stone-dim">{blurb}</p>}

          <motion.ul layout className="mt-10 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {list.map((e, i) => (
                <motion.li
                  key={e.id}
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.6, ease: EXPO, delay: Math.min(i, 6) * 0.04 }}
                  className="group"
                >
                  <article>
                    <div className="relative aspect-[4/3] overflow-hidden bg-soot">
                      <img
                        src={e.image}
                        alt=""
                        loading="lazy"
                        className="duotone size-full object-cover transition-[filter] duration-700 ease-out-expo group-hover:[filter:none]"
                      />
                      <span className="absolute left-3 top-3 bg-void/80 px-2.5 py-1 text-sm capitalize text-stone-dim backdrop-blur">
                        {e.category}
                      </span>
                    </div>
                    <h2 className="display mt-5 text-[clamp(1.6rem,2.4vw,2.2rem)] text-stone">{e.title}</h2>
                    <p className="mt-3 text-stone-dim text-pretty">{e.summary}</p>
                    <dl className="mt-5 grid grid-cols-3 border-t border-stone/12 pt-4 text-sm">
                      <div>
                        <dt className="text-stone-mute">Team</dt>
                        <dd className="text-stone">{e.team}</dd>
                      </div>
                      <div>
                        <dt className="text-stone-mute">Prize</dt>
                        <dd className="text-stone">{e.prize}</dd>
                      </div>
                      <div>
                        <dt className="text-stone-mute">Day</dt>
                        <dd className="text-stone">{e.day}</dd>
                      </div>
                    </dl>
                  </article>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>

          <div className="mt-24 flex flex-col items-start gap-6 border-t border-stone/12 pt-10 md:flex-row md:items-center md:justify-between">
            <p className="display max-w-[20ch] text-[clamp(1.8rem,3.4vw,3rem)] text-stone">
              One pass. <span className="text-brass-hi">Every arena.</span>
            </p>
            <PassesButton />
          </div>
        </div>
      </section>
    </>
  );
}
