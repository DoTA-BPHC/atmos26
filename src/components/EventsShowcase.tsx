import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
type Category = 'all' | 'workshops' | 'talks' | 'competitions' | 'games';

interface EventData {
  id: string;
  title: string;
  category: Exclude<Category, 'all'>;
  prizePool: string;
  image: string;
  link: string;
  poc: string;
  deadline: string;
  date: string;
  description: string;
}

// --- Mock Data ---
const EVENTS: EventData[] = [
  {
    id: '1',
    title: 'ENIGMA CTF',
    category: 'competitions',
    prizePool: '₹20,000',
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=800',
    link: '#',
    poc: 'Alex Doe - +91 9876543210',
    deadline: 'December 20, 2025',
    date: 'January 5, 2026',
    description: 'Dive into the world of cybersecurity. Solve intricate puzzles, find vulnerabilities, and capture the flags in this intense 24-hour Capture The Flag competition.'
  },
  {
    id: '2',
    title: 'GAME JAM',
    category: 'games',
    prizePool: '₹20,000',
    image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=800',
    link: '#',
    poc: 'Sarah Smith - +91 9876543211',
    deadline: 'December 22, 2025',
    date: 'January 6-8, 2026',
    description: 'Build a game from scratch in 48 hours based on a secret theme. Work solo or in teams to create the most engaging gaming experience.'
  },
  {
    id: '3',
    title: 'AI REVOLUTION TALK',
    category: 'talks',
    prizePool: 'N/A',
    image: 'https://images.unsplash.com/photo-1591453006520-13ad11d6118d?auto=format&fit=crop&q=80&w=800',
    link: '#',
    poc: 'John Carter - +91 9876543212',
    deadline: 'January 1, 2026',
    date: 'January 10, 2026',
    description: 'Join industry leaders as they discuss the future of Artificial Intelligence, large language models, and how they will shape the next decade of software engineering.'
  },
  {
    id: '4',
    title: 'UI/UX WORKSHOP',
    category: 'workshops',
    prizePool: 'N/A',
    image: 'https://images.unsplash.com/photo-1618761714954-0b8cd0026356?auto=format&fit=crop&q=80&w=800',
    link: '#',
    poc: 'Emma Wilson - +91 9876543213',
    deadline: 'January 2, 2026',
    date: 'January 11, 2026',
    description: 'A hands-on workshop covering the fundamentals of modern UI/UX design. Learn how to craft beautiful interfaces using Figma and design systems.'
  },
  {
    id: '5',
    title: 'DRONE RACING',
    category: 'competitions',
    prizePool: '₹50,000',
    image: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&q=80&w=800',
    link: '#',
    poc: 'Mike Johnson - +91 9876543214',
    deadline: 'December 25, 2025',
    date: 'January 12, 2026',
    description: 'Experience high-speed FPV drone racing. Navigate through complex obstacle courses and compete against top pilots from across the country.'
  },
];

const CATEGORIES: Category[] = ['all', 'workshops', 'talks', 'competitions', 'games'];

export default function EventsPage() {
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredEvents = EVENTS.filter(
    (ev) => activeCategory === 'all' || ev.category === activeCategory
  );

  // Keep selectedIndex in bounds when category changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [activeCategory]);

  const selectedEvent = filteredEvents[selectedIndex] ?? filteredEvents[0];

  const navigate = (direction: 'up' | 'down') => {
    setSelectedIndex((prev) => {
      if (direction === 'down') return prev < filteredEvents.length - 1 ? prev + 1 : 0;
      return prev > 0 ? prev - 1 : filteredEvents.length - 1;
    });
  };

  // The card list: show previous (dimmed), active (full), next (dimmed)
  const prevIndex = selectedIndex > 0 ? selectedIndex - 1 : filteredEvents.length - 1;
  const nextIndex = selectedIndex < filteredEvents.length - 1 ? selectedIndex + 1 : 0;

  return (
    <div className="w-full text-white py-[6vh] px-[3vw] bg-[#050505] relative font-sans overflow-hidden">
      {/* Subtle radial background */}
      <div className="absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_center,rgba(20,20,20,1)_0%,rgba(5,5,5,1)_100%)]" />

      <div className="relative z-10">

        {/* ── Header & Tabs ── */}
        <div className="flex justify-center md:justify-between items-end border-b border-[#1a1a1a] pb-[2.5vh] mb-[3vh]">
          <h1 className="md:text-[3.8vw] text-4xl tracking-[0.06em] font-black uppercase leading-none hidden md:block">
            Events
          </h1>
          <h1 className="md:hidden text-4xl tracking-[0.06em] font-black uppercase mb-1">
            Events
          </h1>

          {/* Category tabs */}
          <div className="flex gap-0 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`relative cursor-pointer px-5 py-2.5 md:text-[1.6vh] text-[1.4vh] font-semibold tracking-[2px] border-l border-[#1a1a1a] transition-colors duration-200 uppercase whitespace-nowrap ${
                  activeCategory === cat
                    ? 'bg-[#0f0f0f] text-white'
                    : 'bg-transparent text-[#4a4a4a] hover:bg-[#0f0f0f] hover:text-[#8a8a8a]'
                }`}
              >
                {cat}
                {activeCategory === cat && (
                  <motion.span
                    layoutId="activeTabIndicator"
                    className="absolute bottom-[-2.5vh] left-0 w-full h-px bg-white"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main Content: Image column (left) + Details column (right) ── */}
        <div className="flex flex-col md:flex-row gap-[3vw] md:h-[64vh]">

          {/* ── LEFT: Image peek stack + arrows ── */}
          <div className="flex flex-row md:flex-[0_0_38%] gap-3 h-[50vw] md:h-full">

            {/* Stacked peek cards */}
            <div className="relative flex-1 overflow-hidden">
              {filteredEvents.length > 0 && (
                <>
                  {/* PREV card – peek at top */}
                  {filteredEvents.length > 1 && (
                    <div
                      className="absolute top-0 left-0 right-0 h-[12%] overflow-hidden cursor-pointer opacity-50 hover:opacity-70 transition-opacity z-10"
                      onClick={() => navigate('up')}
                    >
                      <div className="relative w-full h-[900%]">
                        <img
                          src={filteredEvents[prevIndex].image}
                          alt={filteredEvents[prevIndex].title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/10" />
                        {/* bottom label */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                          <p className="text-white text-xs font-bold uppercase tracking-widest truncate">
                            {filteredEvents[prevIndex].title}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ACTIVE card – fills the remaining height */}
                  <div
                    className="absolute left-0 right-0 overflow-hidden cursor-pointer z-20"
                    style={{
                      top: filteredEvents.length > 1 ? '12%' : '0%',
                      bottom: filteredEvents.length > 1 ? '12%' : '0%',
                    }}
                    onClick={() => {/* already selected */}}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={selectedEvent.id}
                        initial={{ opacity: 0, scale: 1.04 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.4 }}
                        className="relative w-full h-full [clip-path:polygon(0_0,100%_0,100%_calc(100%-18px),calc(100%-18px)_100%,0_100%)]"
                      >
                        <img
                          src={selectedEvent.image}
                          alt={selectedEvent.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        {/* gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                        {/* Active card label */}
                        <div className="absolute bottom-0 left-0 right-0 p-5">
                          <h3 className="text-white font-bold text-lg uppercase tracking-widest drop-shadow mb-1">
                            {selectedEvent.title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-white/70 uppercase tracking-wide">
                            <span>{selectedEvent.category}</span>
                            <span>·</span>
                            <span className="font-semibold text-white/90">{selectedEvent.prizePool}</span>
                          </div>
                        </div>
                        {/* White border glow on active */}
                        <div className="absolute inset-0 border border-white/20 pointer-events-none [clip-path:polygon(0_0,100%_0,100%_calc(100%-18px),calc(100%-18px)_100%,0_100%)]" />
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* NEXT card – peek at bottom */}
                  {filteredEvents.length > 1 && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-[12%] overflow-hidden cursor-pointer opacity-50 hover:opacity-70 transition-opacity z-10"
                      onClick={() => navigate('down')}
                    >
                      <div className="relative w-full h-[900%] -translate-y-[88.89%]">
                        <img
                          src={filteredEvents[nextIndex].image}
                          alt={filteredEvents[nextIndex].title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10" />
                        {/* top label */}
                        <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 to-transparent">
                          <p className="text-white text-xs font-bold uppercase tracking-widest truncate">
                            {filteredEvents[nextIndex].title}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Up / Down Arrows */}
            <div className="hidden md:flex flex-col items-center justify-center gap-4 shrink-0">
              <button
                onClick={() => navigate('up')}
                aria-label="Previous event"
                className="group w-10 h-10 flex items-center justify-center bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-[#3a3a3a] text-white cursor-pointer transition-all duration-300 hover:border-[#8B0000] hover:shadow-[0_0_14px_rgba(139,0,0,0.35)] hover:scale-110 active:scale-95"
              >
                <span className="text-lg transition-transform duration-200 group-hover:-translate-y-0.5">↑</span>
              </button>
              {/* Counter */}
              <span className="text-[#3a3a3a] text-xs font-mono tabular-nums">
                {String(selectedIndex + 1).padStart(2, '0')}/{String(filteredEvents.length).padStart(2, '0')}
              </span>
              <button
                onClick={() => navigate('down')}
                aria-label="Next event"
                className="group w-10 h-10 flex items-center justify-center bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-[#3a3a3a] text-white cursor-pointer transition-all duration-300 hover:border-[#8B0000] hover:shadow-[0_0_14px_rgba(139,0,0,0.35)] hover:scale-110 active:scale-95"
              >
                <span className="text-lg transition-transform duration-200 group-hover:translate-y-0.5">↓</span>
              </button>
            </div>
          </div>

          {/* ── RIGHT: Event Details ── */}
          <div className="flex-1 flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden md:pl-8 py-4 md:py-0 gap-6 md:gap-8 justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedEvent.id}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-6 md:gap-7"
              >
                {/* Mobile: Register button above title */}
                <a
                  href={selectedEvent.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="md:hidden inline-block w-fit group focus:outline-none"
                >
                  <div className="bg-[#680C16] text-white px-8 py-2 text-center transition-all duration-300 group-hover:bg-white group-hover:text-[#6E0216] [clip-path:polygon(5%_0%,100%_0%,95%_100%,0%_100%)] font-bold">
                    <span className="text-sm tracking-widest uppercase">Register Here</span>
                  </div>
                </a>

                {/* Event Title */}
                <h2 className="text-[10vw] md:text-[3.6vw] font-black tracking-[0.05em] uppercase leading-none">
                  {selectedEvent.title}
                </h2>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  <div>
                    <div className="text-[2.8vw] md:text-[0.85vw] font-semibold tracking-[0.08em] uppercase text-[#6a6a6a] mb-1">
                      Contact / POC
                    </div>
                    <div className="text-[3.5vw] md:text-[1.05vw] tracking-wide uppercase text-white font-medium leading-snug">
                      {selectedEvent.poc}
                    </div>
                  </div>

                  <div>
                    <div className="text-[2.8vw] md:text-[0.85vw] font-semibold tracking-[0.08em] uppercase text-[#6a6a6a] mb-1">
                      Prize Pool
                    </div>
                    <div className="text-[3.5vw] md:text-[1.05vw] tracking-wide uppercase text-white font-medium leading-snug">
                      {selectedEvent.prizePool}
                    </div>
                  </div>

                  <div>
                    <div className="text-[2.8vw] md:text-[0.85vw] font-semibold tracking-[0.08em] uppercase text-[#6a6a6a] mb-1">
                      Registration Deadline
                    </div>
                    <div className="text-[3.5vw] md:text-[1.05vw] tracking-wide uppercase text-white font-medium leading-snug">
                      {selectedEvent.deadline}
                    </div>
                  </div>

                  <div>
                    <div className="text-[2.8vw] md:text-[0.85vw] font-semibold tracking-[0.08em] uppercase text-[#6a6a6a] mb-1">
                      Dates / Rounds
                    </div>
                    <div className="text-[3.5vw] md:text-[1.05vw] tracking-wide uppercase text-white font-medium leading-snug">
                      {selectedEvent.date}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <div className="text-[2.8vw] md:text-[0.85vw] font-semibold tracking-[0.08em] uppercase text-[#6a6a6a] mb-2">
                    Description
                  </div>
                  <p className="text-[3.5vw] md:text-[1.05vw] leading-[1.7] text-[#d0d0d0] text-justify md:pr-8">
                    {selectedEvent.description}
                  </p>
                </div>

                {/* Desktop Register Button */}
                <a
                  href={selectedEvent.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden md:inline-block w-fit group focus:outline-none"
                >
                  <div className="bg-[#680C16] text-white px-[3vw] py-3 text-center transition-all duration-300 group-hover:bg-white group-hover:text-[#6E0216] [clip-path:polygon(5%_0%,100%_0%,95%_100%,0%_100%)] font-bold cursor-pointer">
                    <span className="text-[1.1vw] tracking-widest uppercase">Register Here</span>
                  </div>
                </a>

                {/* Mobile counter */}
                <div className="md:hidden text-[#3a3a3a] text-xs font-mono flex items-center gap-3">
                  <button onClick={() => navigate('up')} className="text-white/50 hover:text-white transition-colors">↑</button>
                  <span>{String(selectedIndex + 1).padStart(2, '0')} / {String(filteredEvents.length).padStart(2, '0')}</span>
                  <button onClick={() => navigate('down')} className="text-white/50 hover:text-white transition-colors">↓</button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
}