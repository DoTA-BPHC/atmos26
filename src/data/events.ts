// Provisional line-up. Names come from past ATMOS editions and the old mock
// list; prizes and slots stay "TBA" until the events team confirms them.
// When real posters land, drop them in public/events/ and point `image` at them.

export type Category = 'competitions' | 'workshops' | 'talks' | 'games';

export const CATEGORIES: { id: Category; label: string; blurb: string; glyph: string }[] = [
  { id: 'competitions', label: 'Competitions', blurb: 'Build, race, break and defend. Prize-pool events for teams and solo entrants.', glyph: 'gear' },
  { id: 'workshops', label: 'Workshops', blurb: 'Hands-on sessions with people who ship this for a living.', glyph: 'chip' },
  { id: 'talks', label: 'Talks', blurb: 'Founders, researchers and guests on where the convergence goes next.', glyph: 'wave' },
  { id: 'games', label: 'Games', blurb: 'Jams, LAN nights and puzzle hunts that run past midnight.', glyph: 'helix' },
];

export interface FestEvent {
  id: string;
  title: string;
  category: Category;
  summary: string;
  image: string;
  prize: string;
  day: '23' | '24' | '25' | 'TBA';
  team: string;
}

export const EVENTS: FestEvent[] = [
  {
    id: 'robo-soccer',
    title: 'Robo Soccer',
    category: 'competitions',
    summary: 'Wired or wireless bots, a pitch, and ten minutes of controlled chaos. Build to the spec sheet, then outplay the arena.',
    image: '/gallery/robo_soccer.jpg',
    prize: 'TBA',
    day: 'TBA',
    team: '2–4',
  },
  {
    id: 'drone-league',
    title: 'Drone League',
    category: 'competitions',
    summary: 'FPV racing through a gated course on the campus grounds. Fastest clean lap takes it.',
    image: '/gallery/drone_league.jpg',
    prize: 'TBA',
    day: 'TBA',
    team: '1–3',
  },
  {
    id: 'ctf',
    title: 'Capture the Flag',
    category: 'competitions',
    summary: 'Jeopardy-style security challenges: web, crypto, forensics, reversing. Overnight, on the scoreboard.',
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=1200',
    prize: 'TBA',
    day: 'TBA',
    team: '1–4',
  },
  {
    id: 'tech-expo',
    title: 'Tech Expo',
    category: 'talks',
    summary: 'Student and startup builds on the floor: robots, rigs, research demos. Walk in, ask questions, try things.',
    image: '/gallery/tech_expo.jpg',
    prize: '—',
    day: 'TBA',
    team: 'Open',
  },
  {
    id: 'guest-talks',
    title: 'Guest Talks',
    category: 'talks',
    summary: 'Speakers from industry, research and the screen on the edge where people and machines meet.',
    image: '/gallery/actors_guest_talks.jpg',
    prize: '—',
    day: 'TBA',
    team: 'Open',
  },
  {
    id: 'women-in-code',
    title: 'Women in Code',
    category: 'workshops',
    summary: 'A build-along workshop and panel run with the campus coding community.',
    image: '/gallery/womenInCode.jpg',
    prize: '—',
    day: 'TBA',
    team: 'Solo',
  },
  {
    id: 'ui-workshop',
    title: 'Interface Design Workshop',
    category: 'workshops',
    summary: 'From blank canvas to a working prototype in one afternoon. Bring a laptop.',
    image: 'https://images.unsplash.com/photo-1618761714954-0b8cd0026356?auto=format&fit=crop&q=80&w=1200',
    prize: '—',
    day: 'TBA',
    team: 'Solo',
  },
  {
    id: 'game-jam',
    title: 'Game Jam',
    category: 'games',
    summary: 'A theme drops at the opening ceremony. You have until the closing one.',
    image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=1200',
    prize: 'TBA',
    day: 'TBA',
    team: '1–4',
  },
  {
    id: 'puzzle-hunt',
    title: 'Puzzle Hunt',
    category: 'games',
    summary: 'Clues hidden across campus and online. Crack the meta-puzzle before anyone else.',
    image: '/gallery/puzzle_event.jpg',
    prize: 'TBA',
    day: 'TBA',
    team: '2–5',
  },
  {
    id: 'speed-cubing',
    title: 'Speed Cubing',
    category: 'games',
    summary: '3×3, one-handed, blindfolded. WCA-style timing, open to all.',
    image: '/gallery/speed_cubing.jpg',
    prize: 'TBA',
    day: 'TBA',
    team: 'Solo',
  },
];

export const isCategory = (v: string | null): v is Category =>
  v === 'competitions' || v === 'workshops' || v === 'talks' || v === 'games';
