// The ATMOS '26 line-up, from the events team's brochure sheet. Prize pools and
// fees are as the sheet lists them; where it gives separate prices, BITSians
// and outside participants are shown apart. Days, team sizes and details stay
// "TBA" until each event opens. No club names or contacts here (team decision).

export type Category = 'competitions' | 'workshops' | 'experiences';

export const CATEGORIES: { id: Category; label: string; blurb: string }[] = [
  { id: 'competitions', label: 'Competitions', blurb: 'Prize-pool events for teams and solo entrants.' },
  { id: 'workshops', label: 'Workshops', blurb: 'Hands-on sessions: AI, quantum, rocketry, PCBs and more.' },
  { id: 'experiences', label: 'Experiences', blurb: 'Escape rooms, stargazing, sim rigs and a rage room. Walk in and play.' },
];

export interface FestEvent {
  id: string;
  title: string;
  category: Category;
  /** rupees; null when there is none or it isn't announced */
  prize: number | null;
  /** 'Free', '₹399', 'BITSian ₹199 · Others ₹249', 'TBA' … */
  fee: string;
  team?: string;
  note?: string;
}

const split = (bitsian: number | 'Free', others: number) =>
  `BITSian ${bitsian === 'Free' ? 'free' : `₹${bitsian}`} · Others ₹${others}`;

const LIST: FestEvent[] = [
  // competitions
  { id: 'break-the-case', title: 'Break The Case', category: 'competitions', prize: 400000, fee: 'Free', note: 'Consulting case competition' },
  { id: 'robowars', title: 'Robowars', category: 'competitions', prize: 215000, fee: split('Free', 900), note: 'With Robo Soccer and Robo Sumo' },
  { id: 'wall-street-business', title: 'Wall Street Business Challenge', category: 'competitions', prize: 60000, fee: 'TBA', note: 'Case competition' },
  { id: 'astro-datathon', title: 'Astro ML Datathon', category: 'competitions', prize: 50000, fee: split(99, 125) },
  { id: 'analytics-datathon', title: 'Datathon: Data Analytics', category: 'competitions', prize: 50000, fee: split(100, 150) },
  { id: 'pit-trading', title: 'Pit Trading Competition', category: 'competitions', prize: 50000, fee: split(199, 249) },
  { id: 'hackathon', title: 'Hackathon', category: 'competitions', prize: 50000, fee: 'Free' },
  { id: 'mech-ideathon', title: 'Mechanical Ideathon', category: 'competitions', prize: 35000, fee: '₹200' },
  { id: 'wall-street-analytics', title: 'Wall Street Analytics Challenge', category: 'competitions', prize: 35000, fee: 'TBA' },
  { id: 'anatomy-of-murder', title: 'Anatomy of Murder', category: 'competitions', prize: 35000, fee: 'Free' },
  { id: 'trick-of-trade', title: 'Trick of Trade', category: 'competitions', prize: 30000, fee: '₹49' },
  { id: 'cruxipher', title: 'cruXipher', category: 'competitions', prize: 30000, fee: 'Free' },
  { id: 'coinquest', title: 'Coinquest', category: 'competitions', prize: 25000, fee: '₹99' },
  { id: 'arthasastra', title: 'Arthasastra', category: 'competitions', prize: 25000, fee: 'Free' },
  { id: 'coding-contest', title: 'Coding Contest', category: 'competitions', prize: 25000, fee: 'Free' },
  { id: 'enigma', title: 'Enigma', category: 'competitions', prize: 20000, fee: '₹400–800 per team', team: '1–4' },
  { id: 'bulls-and-brains', title: 'Bulls & Brains', category: 'competitions', prize: 20000, fee: split(149, 199) },
  { id: 'blitz-cup', title: 'Blitz Cup', category: 'competitions', prize: 20000, fee: 'Free' },
  { id: 'defuse-the-bomb', title: 'Defuse the Bomb', category: 'competitions', prize: 10000, fee: '₹180 per team', team: '2–4', note: 'Maths-themed game room · Two-day event' },
  { id: 'agent-competition', title: 'Agent Competition', category: 'competitions', prize: 9000, fee: '₹100' },
  { id: 'fifa-auction', title: 'FIFA Auction', category: 'competitions', prize: 8000, fee: split(149, 179) },
  { id: 'concrete-bowling', title: 'Concrete Bowling', category: 'competitions', prize: 6000, fee: '₹200' },
  { id: 'escape-room', title: 'Escape Room', category: 'competitions', prize: 5000, fee: `${split(50, 80)} per head`, team: '4–7' },
  { id: 'ecosnap', title: 'EcoSnap Contest', category: 'competitions', prize: 5000, fee: '₹60' },
  { id: 'ai-slop-slayer', title: 'AI Slop Slayer', category: 'competitions', prize: 5000, fee: '₹400' },
  { id: 'last-autopsy', title: 'The Last Autopsy', category: 'competitions', prize: 5000, fee: '₹250' },
  { id: 'arg', title: 'ARG', category: 'competitions', prize: 5000, fee: '₹50 per person', team: '3' },
  { id: 'cubing', title: 'CubingATMOS 2026', category: 'competitions', prize: null, fee: split(450, 900), note: 'Two-day event' },

  // workshops
  { id: 'prompt-lab', title: 'Prompt Lab: AI Workshop', category: 'workshops', prize: 8000, fee: split(599, 799) },
  { id: 'card-counting', title: 'Card Counting Workshop & Showdown', category: 'workshops', prize: 6000, fee: '₹170', note: 'One-day event' },
  { id: 'ti-workshop', title: 'TI Workshop', category: 'workshops', prize: null, fee: '₹1499' },
  { id: 'model-rocketry', title: 'Model Rocketry Workshop', category: 'workshops', prize: null, fee: '₹1499' },
  { id: 'pcb-workshop', title: 'PCB Workshop', category: 'workshops', prize: null, fee: '₹1499' },
  { id: 'quantum-computing', title: 'Quantum Computing Workshop', category: 'workshops', prize: null, fee: '₹399' },
  { id: 'machine-learning', title: 'Machine Learning Workshop', category: 'workshops', prize: null, fee: '₹399' },
  { id: 'analog-electronics', title: 'Analog Electronics Workshop', category: 'workshops', prize: null, fee: '₹399' },
  { id: 'digital-design', title: 'Digital Design Workshop', category: 'workshops', prize: null, fee: '₹299' },
  { id: 'exoplanet-detection', title: 'Exoplanet Detection Workshop', category: 'workshops', prize: null, fee: split(199, 249) },
  { id: 'etch-a-sketch', title: 'Etch-A-Sketch Workshop', category: 'workshops', prize: null, fee: split(500, 600) },
  { id: 'aroma-workshop', title: 'Aroma Workshop', category: 'workshops', prize: null, fee: '₹350', note: 'Candles and perfumes' },
  { id: 'semiconductor', title: 'Semiconductor Workshop', category: 'workshops', prize: null, fee: 'TBA' },
  { id: 'perfume', title: 'Make Your Own Perfume', category: 'workshops', prize: null, fee: 'TBA' },

  // experiences
  { id: 'stargazing', title: 'Stargazing', category: 'experiences', prize: null, fee: split(99, 149) },
  { id: 'solar-gazing', title: 'Solar Gazing', category: 'experiences', prize: null, fee: split(75, 99) },
  { id: 'f1-simrig', title: 'F1 SimRig', category: 'experiences', prize: null, fee: '₹250 per 10 min' },
  { id: 'rage-room', title: 'Rage Room', category: 'experiences', prize: null, fee: '₹250' },
  { id: 'arcade-machine', title: 'Arcade Machine', category: 'experiences', prize: null, fee: '₹150' },
  { id: 'period-pain-simulator', title: 'Period Pain Simulator', category: 'experiences', prize: null, fee: '₹100' },
  { id: 'chemistry-casino', title: 'Chemistry Casino', category: 'experiences', prize: null, fee: 'TBA' },
  { id: 'tech-tiranga', title: 'Tech Tiranga', category: 'experiences', prize: null, fee: 'TBA' },
  { id: 'auto-expo', title: 'Auto Expo', category: 'experiences', prize: null, fee: 'TBA' },
];

// by category, then biggest prize first; events without a prize keep list order
const order = CATEGORIES.map((c) => c.id);
export const EVENTS: FestEvent[] = [...LIST].sort(
  (a, b) => order.indexOf(a.category) - order.indexOf(b.category) || (b.prize ?? -1) - (a.prize ?? -1),
);

export const formatPrize = (p: number | null) => (p === null ? '—' : `₹${p.toLocaleString('en-IN')}`);

export const isCategory = (v: string | null): v is Category =>
  v === 'competitions' || v === 'workshops' || v === 'experiences';
