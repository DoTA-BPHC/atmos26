// Artists are unannounced. Each night is a sealed dossier until the reveal:
// set `artist` (and optionally `image`) when the team announces a night. The
// home teaser, the Proshows page and its share card all follow this file.

export interface Proshow {
  night: string;
  date: string;
  codename: string;
  genre: string;
  venue: string;
  /** the act's name as announced; null keeps the night sealed */
  artist: string | null;
  clue: string;
  /** the act's own photo in public/proshows/ (WebP ≤ 300 KB); the past-proshow photo until then */
  image?: string;
}

export const PROSHOWS: Proshow[] = [
  {
    night: 'Night 01',
    date: 'Fri 23 Oct',
    codename: 'Signal',
    genre: 'Headline act',
    venue: 'Main stage',
    artist: null,
    clue: 'The first transmission lands on opening night.',
  },
  {
    night: 'Night 02',
    date: 'Sat 24 Oct',
    codename: 'Circuit',
    genre: 'Electronic',
    venue: 'Main stage',
    artist: null,
    clue: 'Bring earplugs. Or don’t.',
  },
  {
    night: 'Night 03',
    date: 'Sun 25 Oct',
    codename: 'Ascension',
    genre: 'Closing night',
    venue: 'Main stage',
    artist: null,
    clue: 'The convergence completes.',
  },
];

// true until the first act is announced
export const LINEUP_SEALED = PROSHOWS.every((p) => !p.artist);
