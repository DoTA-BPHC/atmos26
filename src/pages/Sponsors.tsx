import { PageHeader } from '../components/PageHeader';
import { SPONSOR_TIERS } from '../data/sponsors';
import { CONTACT, STATS } from '../data/fest';

export default function Sponsors() {
  const mail = `mailto:${CONTACT.email}?subject=${encodeURIComponent('Sponsoring ATMOS 2026')}`;
  return (
    <>
      <PageHeader floor="steam" title="Sponsors">
        The 2026 partners are being announced. If your company wants to stand where the human hand meets the machine,
        talk to us.
      </PageHeader>

      <section className="px-4 pb-24 sm:px-8" aria-label="Why sponsor">
        <div className="mx-auto grid max-w-[1440px] gap-px bg-stone/12 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="bg-void p-6">
              <p className="display text-[clamp(2rem,2.8vw,2.5rem)] text-stone">
                {'prefix' in s ? s.prefix : ''}
                {s.value.toLocaleString('en-IN')}
                {s.suffix}
              </p>
              <p className="mt-2 text-stone-dim">
                <span className="text-brass-hi">{s.label}</span> {s.note}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-8" aria-label="Sponsor tiers">
        <div className="mx-auto max-w-[1440px] space-y-16">
          {SPONSOR_TIERS.map((t) => (
            <div key={t.tier}>
              <h2 className="display text-[clamp(1.5rem,2vw,1.9rem)] text-stone">{t.tier}</h2>
              <ul className={`mt-6 grid gap-3 ${t.slots === 1 ? '' : t.slots <= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
                {t.sponsors.map((s) => (
                  <li
                    key={s.name}
                    className={`min-w-0 border border-dashed border-stone/20 ${t.slots === 1 ? 'min-h-44' : 'min-h-48'}`}
                  >
                    <a href={s.href} target="_blank" rel="noreferrer" className="flex h-full min-w-0 flex-col items-center justify-center gap-3 p-6 text-center">
                      <div className="flex h-16 w-full min-w-0 items-center justify-center">
                        {s.logo ? (
                          <img src={s.logo} alt={s.name} loading="lazy" className="max-h-16 max-w-full object-contain" />
                        ) : (
                          <span className="display max-w-full break-words text-[clamp(1.5rem,2vw,1.9rem)] text-stone">{s.name}</span>
                        )}
                      </div>
                      {s.logo && <p className="break-words font-semibold text-stone">{s.name}</p>}
                      {s.role && <p className="max-w-full break-words text-sm text-stone-dim">{s.role}</p>}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 pb-28 sm:px-8">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 border-t border-stone/12 pt-10 md:flex-row md:items-end md:justify-between">
          <p className="display max-w-[18ch] text-[clamp(1.8rem,3vw,2.6rem)] text-stone">
            Put your name <span className="text-brass-hi">on the convergence.</span>
          </p>
          <a href={mail} className="inline-flex h-12 items-center justify-center bg-stone px-7 font-semibold text-void transition-colors hover:bg-brass-hi">
            Email the sponsorship team
          </a>
        </div>
      </section>
    </>
  );
}
