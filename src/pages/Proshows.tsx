import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { CONTACT } from '../data/fest';
import { EVENTS } from '../data/events';

// Kept alive for shared links; announced nights use the event catalogue's details.
const NIGHTS = [
  ['nishant-suri', 'lumina'],
  ['amit-mishra', 'dual-vibez'],
].map((ids) => ids.map((id) => EVENTS.find((event) => event.id === id)).filter((event) => event !== undefined));

export default function Proshows() {
  return (
    <>
      <PageHeader floor="intelligence" title="Proshows">
        The nights of ATMOS ’26. Follow{' '}
        <a href={CONTACT.instagramHref} target="_blank" rel="noreferrer" className="text-stone underline decoration-brass/60">
          {CONTACT.instagram}
        </a>{' '}
        for updates.
      </PageHeader>

      <section className="px-4 pb-24 sm:px-8" aria-label="Line-up by night">
        <div className="mx-auto max-w-[1440px] space-y-16">
          {NIGHTS.map((night) => (
            <div key={night[0]?.id}>
              <h2 className="display text-[clamp(2rem,3.6vw,3.4rem)] text-brass-hi">
                {night[0]?.when?.split(',')[0].replace(/^Fri /, 'Friday ').replace(/^Sat /, 'Saturday ')}
              </h2>
              <ul className="mt-6 divide-y divide-stone/15 border-y border-stone/15">
                {night.map((event) => (
                  <li key={event.id}>
                    <Link
                      to={`/events/${event.id}`}
                      className="group flex min-w-0 flex-col gap-3 py-6 md:flex-row md:items-center md:justify-between md:gap-8 md:py-8"
                    >
                      <h3 className="stencil min-w-0 break-words text-[clamp(1.75rem,4.6vw,4.25rem)] text-stone transition-colors group-hover:text-brass-hi group-focus-visible:text-brass-hi">
                        {event.title}
                      </h3>
                      <p className="shrink-0 text-stone-dim md:text-right">
                        {event.when?.split(', ')[1] ?? 'Time TBA'} · {event.venue ?? 'Venue TBA'}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 pb-28 sm:px-8" aria-label="More">
        <div className="mx-auto max-w-[1440px]">
          <Link
            to="/events"
            className="inline-flex items-center gap-2 text-stone-dim underline-offset-4 transition-colors hover:text-stone hover:underline"
          >
            <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />
            See the events
          </Link>
        </div>
      </section>
    </>
  );
}
