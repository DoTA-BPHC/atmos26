// Artists are unannounced. Each night is a sealed dossier until the reveal;
// fill in `artist` and `reveal` when the team announces.

export interface Proshow {
  night: string;
  date: string;
  codename: string;
  genre: string;
  venue: string;
  artist: string | null;
  clue: string;
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
