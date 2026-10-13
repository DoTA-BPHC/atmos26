import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { CONTACT } from '../data/fest';

// kept alive for links already shared; the line-up itself is TBA
export default function Proshows() {
  return (
    <>
      <PageHeader floor="intelligence" title="Proshows">
        The line-up is revealed soon. Follow{' '}
        <a href={CONTACT.instagramHref} target="_blank" rel="noreferrer" className="text-stone underline decoration-brass/60">
          {CONTACT.instagram}
        </a>{' '}
        for the announcement.
      </PageHeader>

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
