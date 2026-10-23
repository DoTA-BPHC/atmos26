import { useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { cardSrcSet, posterFallback } from '../data/eventEdits';
import { CATEGORIES, CLUBS, formatPrize, type FestEvent as Event } from '../data/events';
import { endsAt, isLive, nextOccurrence, startsAt, timeLabel } from '../data/eventTime';

const EXPO = [0.16, 1, 0.3, 1] as const;
const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

function dateKey(ms: number): string {
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatDayHeading(key: string): string {
  const [yStr, mStr, dStr] = key.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10) - 1;
  const d = parseInt(dStr, 10);
  const dt = new Date(Date.UTC(y, m, d, 12, 0, 0));
  const weekday = WEEKDAYS[dt.getUTCDay()];
  const month = MONTH_NAMES[dt.getUTCMonth()];
  return `${weekday} ${d} ${month}`;
}

function isMultiDay(when: string | null | undefined): boolean {
  if (!when) return false;
  if (when.includes('·')) return true;
  if (/(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?\s*(?:\d{1,2})?\s*[-–]\s*(?:mon|tue|wed|thu|fri|sat|sun)/i.test(when)) {
    return true;
  }
  if (/\b\d{1,2}(?:st|nd|rd|th)?\s*[-–]\s*\d{1,2}(?:st|nd|rd|th)?\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(when)) {
    return true;
  }
  if (/\b\d{1,2}\s*\/\s*\d{1,2}\s*[-–]\s*\d{1,2}\s*\/\s*\d{1,2}\b/.test(when)) {
    return true;
  }
  return false;
}

function TimelinePosterFallback({ title, category }: { title: string; category: string }) {
  return (
    <div
      aria-hidden="true"
      className="flex size-full flex-col justify-between border border-brass-line bg-soot p-2 transition-[filter] duration-700 ease-out-expo group-hover:brightness-125 motion-reduce:transition-none"
    >
      <p className="display line-clamp-2 break-words text-[0.8rem] leading-tight text-stone">{title}</p>
      <p className="truncate text-[0.65rem] text-brass-hi">{category}</p>
    </div>
  );
}

interface DayGroup {
  key: string;
  heading: string;
  events: { event: Event; start: number | null; time: string | null }[];
}

export default function EventTimeline({ events }: { events: Event[] }) {
  const still = useReducedMotion();
  const [now, setNow] = useState(Date.now);
  const [showEarlier, setShowEarlier] = useState(false);
  const earlierId = useId();

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, DayGroup['events']>();
    const live: DayGroup['events'] = [];
    const earlier: DayGroup['events'] = [];
    const today = dateKey(now);
    const tomorrow = dateKey(now + DAY_MS);

    for (const event of events) {
      const end = endsAt(event.when);
      const item = { event, start: startsAt(event.when), time: timeLabel(event.when) };
      if (end !== null && end <= now) {
        earlier.push(item);
        continue;
      }
      if (isLive(event.when, now)) {
        live.push(item);
        continue;
      }

      const next = nextOccurrence(event.when, now);
      const key = next ? dateKey(Math.max(next.start, now)) : 'tba';
      const upcoming = next ? { event, start: next.start, time: timeLabel(next.when) } : item;
      const list = map.get(key);
      if (list) {
        list.push(upcoming);
      } else {
        map.set(key, [upcoming]);
      }
    }

    const byStartThenTitle = (a: DayGroup['events'][number], b: DayGroup['events'][number]) =>
      (a.start ?? Infinity) - (b.start ?? Infinity) || a.event.title.localeCompare(b.event.title);

    // All-day events go after timed sessions within each upcoming day.
    const byStartsAtThenTitle = (a: DayGroup['events'][number], b: DayGroup['events'][number]) => {
      const allDay = Number(!a.time) - Number(!b.time);
      if (allDay) return allDay;
      return byStartThenTitle(a, b);
    };

    const dateKeys = Array.from(map.keys())
      .filter((k) => k !== 'tba')
      .sort();

    const result: DayGroup[] = [];

    if (live.length) {
      result.push({ key: 'live', heading: 'Happening now', events: live.sort(byStartThenTitle) });
    }

    for (const key of dateKeys) {
      const items = map.get(key)!;
      result.push({
        key,
        heading: `${key === today ? 'Today · ' : key === tomorrow ? 'Tomorrow · ' : ''}${formatDayHeading(key)}`,
        events: [...items].sort(byStartsAtThenTitle),
      });
    }

    if (map.has('tba')) {
      const items = map.get('tba')!;
      result.push({
        key: 'tba',
        heading: 'Day to be announced',
        events: [...items].sort(byStartsAtThenTitle),
      });
    }

    if (earlier.length) {
      result.push({
        key: 'earlier',
        heading: `Earlier events (${earlier.length})`,
        events: earlier.sort((a, b) =>
          (endsAt(b.event.when) ?? 0) - (endsAt(a.event.when) ?? 0) || byStartThenTitle(b, a),
        ),
      });
    }

    return result;
  }, [events, now]);

  return (
    <div className="mt-6 w-full space-y-10" aria-label="Timeline of events">
      {groups.map((group) => (
        <section key={group.key} aria-label={group.heading} className="w-full">
          <div className="mb-4">
            {group.key === 'earlier' ? (
              <button
                type="button"
                aria-expanded={showEarlier}
                aria-controls={earlierId}
                onClick={() => setShowEarlier((shown) => !shown)}
                className="min-h-11 text-sm text-stone-mute underline decoration-stone/25 underline-offset-4 transition-colors duration-500 ease-out-expo hover:text-stone motion-reduce:transition-none"
              >
                {group.heading}
              </button>
            ) : (
              <h3 className="display text-[clamp(1.5rem,2.4vw,2.2rem)] text-stone">
                {group.heading} <span className="text-stone-mute">{group.events.length}</span>
              </h3>
            )}
          </div>

          <ol
            id={group.key === 'earlier' ? earlierId : undefined}
            className={group.key === 'earlier' && !showEarlier ? 'hidden' : 'relative flex flex-col'}
          >
            {group.events.map(({ event: e, time: sessionTime }, idx) => {
              const isTba = group.key === 'tba';
              const live = group.key === 'live';
              const time = live ? 'Now' : isTba ? 'TBA' : (sessionTime ?? 'All day');
              const multi = isMultiDay(e.when);
              const categoryLabel = CATEGORIES.find((c) => c.id === e.category)?.label ?? e.category;
              const fallback = <TimelinePosterFallback title={e.title} category={categoryLabel} />;

              return (
                <motion.li
                  key={e.id}
                  className="relative flex items-stretch"
                  initial={still ? { opacity: 0 } : { opacity: 0, y: 16, filter: 'blur(6px)' }}
                  animate={{ opacity: group.key === 'earlier' ? 0.6 : 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.6, ease: EXPO, delay: Math.min(idx, 8) * 0.03 }}
                >
                  {/* Time label column on the left */}
                  <div className="w-[56px] shrink-0 pr-2.5 pt-3.5 text-right sm:w-28 sm:pr-4">
                    <span className={`block break-words text-[0.72rem] font-medium leading-tight sm:text-[0.85rem] ${live ? 'text-brass-hi' : 'text-stone-dim'}`}>
                      {time}
                    </span>
                  </div>

                  {/* Vertical line with small brass dot */}
                  <div className="relative flex w-3 shrink-0 flex-col items-center sm:w-4">
                    <div
                      className={`absolute w-px bg-stone/12 ${
                        group.events.length === 1
                          ? 'hidden'
                          : idx === 0
                            ? 'bottom-0 top-4'
                            : idx === group.events.length - 1
                              ? 'top-0 h-4'
                              : 'inset-y-0'
                      }`}
                      aria-hidden
                    />
                    <span
                      className="relative z-10 mt-3.5 size-2 shrink-0 rounded-full bg-brass ring-2 ring-void"
                      aria-hidden
                    />
                  </div>

                  {/* Compact card */}
                  <div className="min-w-0 flex-1 pb-3 pl-2 sm:pb-4 sm:pl-3">
                    <Link
                      to={`/events/${e.id}`}
                      className="group flex flex-1 items-start gap-3 border border-stone/12 p-3 transition-colors duration-500 ease-out-expo hover:border-stone/25 hover:bg-soot sm:gap-4 sm:p-4"
                    >
                      {/* 96px-wide 4:3 poster thumbnail */}
                      <div className="relative aspect-[4/3] w-24 shrink-0 overflow-hidden bg-soot">
                        {e.image ? (
                          <>
                            <img
                              key={e.image}
                              src={e.image}
                              srcSet={cardSrcSet(e.image)}
                              sizes="96px"
                              alt=""
                              width={900}
                              height={675}
                              loading="lazy"
                              decoding="async"
                              onError={posterFallback(e.id, true)}
                              className="peer duotone size-full object-cover object-top transition-[filter] duration-700 ease-out-expo group-hover:[filter:none]"
                            />
                            <div className="hidden size-full peer-[[hidden]]:block">{fallback}</div>
                          </>
                        ) : (
                          fallback
                        )}
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="display min-w-0 break-words text-[clamp(1.15rem,1.5vw,1.4rem)] leading-tight text-stone transition-colors duration-500 ease-out-expo group-hover:text-brass-hi">
                            {e.title}
                            {live && (
                              <span className="ml-2 inline-block rounded-full border border-brass px-1.5 py-0.5 align-middle font-sans text-[0.6rem] font-medium uppercase leading-none text-brass-hi">
                                Live
                              </span>
                            )}
                          </h4>
                          <ArrowUpRight
                            className="size-4 shrink-0 text-stone-mute transition-[color,transform] duration-500 ease-out-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brass-hi"
                            strokeWidth={1.5}
                            aria-hidden
                          />
                        </div>

                        {/* Multi-day full when text */}
                        {multi && e.when && (
                          <p className="mt-1 text-[0.82rem] leading-snug text-stone-dim">{e.when}</p>
                        )}

                        {/* Club name(s) */}
                        {e.clubs && e.clubs.length > 0 && (
                          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[0.82rem] text-stone-dim">
                            {e.clubs.some((slug) => CLUBS[slug]?.logo) && (
                              <span className="flex shrink-0 -space-x-1">
                                {e.clubs.map(
                                  (slug) =>
                                    CLUBS[slug]?.logo && (
                                      <img
                                        key={slug}
                                        src={CLUBS[slug].logo}
                                        alt=""
                                        width={16}
                                        height={16}
                                        loading="lazy"
                                        className="duotone size-4 rounded-full ring-1 ring-void transition-[filter] duration-700 ease-out-expo group-hover:[filter:none]"
                                      />
                                    ),
                                )}
                              </span>
                            )}
                            <span className="truncate">{e.clubs.map((slug) => CLUBS[slug]?.name ?? slug).join(' × ')}</span>
                          </div>
                        )}

                        {/* Venue & Prize */}
                        {(e.venue || e.prize !== null) && (
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.82rem]">
                            {e.venue && (
                              <span className="max-w-full truncate text-stone-mute">{e.venue}</span>
                            )}
                            {e.prize !== null && (
                              <span className="stencil text-[0.95rem] leading-none text-brass-hi">
                                {formatPrize(e.prize)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </Link>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
