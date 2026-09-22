import React, { Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { SmoothScroll } from './components/SmoothScroll';
import { TiltedGallery } from './components/TiltedGallery';
import EventsPage from './components/EventsShowcase';

const HeroScene = lazy(() => import('./components/HeroScene'));
import { 
  Sparkles, 
  Zap, 
  Trophy, 
  Users, 
  Flame,
  Radio,
  Gamepad2,
  Bot,
  Award,
  ChevronRight
} from 'lucide-react';

const galleryImages = [
  '/gallery/actors_guest_talks.jpg',
  '/gallery/ad_astra.jpg',
  '/gallery/comedy_night.jpg',
  '/gallery/dota_events.jpg',
  '/gallery/drone_league.jpg',
  '/gallery/proshow.jpg',
  '/gallery/puzzle_event.jpg',
  '/gallery/robo_soccer.jpg',
  '/gallery/self_plug_crux.jpeg',
  '/gallery/speed_cubing.jpg',
  '/gallery/tech_expo.jpg',
  '/gallery/womenInCode.jpg',
];

const stats = [
  { label: 'Annual Footfall', value: '30,000+', icon: Users, color: 'from-blue-500 to-cyan-400' },
  { label: 'Events & Workshops', value: '40+', icon: Zap, color: 'from-purple-500 to-pink-500' },
  { label: 'Prize Pool', value: '₹12,00,000+', icon: Trophy, color: 'from-amber-400 to-orange-500' },
  { label: 'Participating Colleges', value: '150+', icon: Award, color: 'from-emerald-400 to-teal-500' },
];

const eventCategories = [
  {
    title: 'Robotics & Automation',
    description: 'High-octane battles in Robo Soccer, Drone Racing League, and Autonomous Bot navigation.',
    icon: Bot,
    badge: 'Flagship',
    gradient: 'from-blue-600/20 to-indigo-600/20 border-blue-500/30'
  },
  {
    title: 'Pro Shows & Comedy Nights',
    description: 'Star-studded performances featuring top artists, stand-up comedians, and live music acts.',
    icon: Flame,
    badge: 'Entertainment',
    gradient: 'from-purple-600/20 to-pink-600/20 border-purple-500/30'
  },
  {
    title: 'Esports & Gaming',
    description: 'Intense Dota 2, Valorant, and speed cubing tournaments with massive prize pools.',
    icon: Gamepad2,
    badge: 'Gaming',
    gradient: 'from-emerald-600/20 to-teal-600/20 border-emerald-500/30'
  },
  {
    title: 'Guest Talks & Tech Expo',
    description: 'Keynotes by industry visionaries, actors, founders, and cutting-edge technical exhibitions.',
    icon: Radio,
    badge: 'Knowledge',
    gradient: 'from-amber-600/20 to-orange-600/20 border-amber-500/30'
  }
];

export const App: React.FC = () => {
  return (
    <SmoothScroll>
      <div className="min-h-screen bg-neutral-950 text-neutral-100 overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">
        
        {/* Glowing Background Orbs */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[140px]" />
          <div className="absolute top-1/2 -right-20 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[140px]" />
          <div className="absolute -bottom-20 left-1/3 w-[600px] h-[600px] bg-pink-600/15 rounded-full blur-[140px]" />
        </div>

        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-neutral-950/75 border-b border-neutral-800/60">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center space-x-3 cursor-pointer">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-indigo-500/25">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl tracking-wider text-white">
                  ATMOS <span className="text-indigo-400">2026</span>
                </span>
                <span className="text-[10px] text-neutral-400 tracking-widest uppercase font-mono">BITS Pilani Hyderabad</span>
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-neutral-300">
              <a href="#about" className="hover:text-white transition-colors">About</a>
              <a href="#gallery" className="hover:text-indigo-400 transition-colors flex items-center space-x-1">
                <span>Gallery</span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              </a>
              <a href="#events" className="hover:text-white transition-colors">Events</a>
              <a href="#stats" className="hover:text-white transition-colors">Highlights</a>
            </nav>

            <div className="flex items-center space-x-4">
              <a
                href="#gallery"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:scale-105 transition-all flex items-center space-x-2"
              >
                <span>Explore Gallery</span>
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative h-[calc(100svh-5rem)] min-h-[560px] overflow-hidden">
          {/* Lazy loaded 3D WebGL Canvas */}
          <Suspense fallback={<div className="absolute inset-0 bg-neutral-950" />}>
            {/* TODO: hook onPlay up to the teaser modal in a follow-up PR */}
            <HeroScene />
          </Suspense>

          <div className="absolute bottom-6 inset-x-0 z-10 text-center font-mono uppercase pointer-events-none space-y-1.5">
            <p className="text-[10px] sm:text-xs tracking-[0.35em] text-neutral-300">ATMOS '26 · Augmented Ascension</p>
            <p className="text-[9px] sm:text-[10px] tracking-[0.3em] text-neutral-600">BITS Pilani Hyderabad · @atmos_bitshyd</p>
          </div>
        </section>

        {/* 3D Tilted Image Gallery Section */}
        <section id="gallery" className="py-20 border-t border-neutral-800/40 relative">
          <div className="max-w-7xl mx-auto px-6 mb-10 text-center space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-widest"
            >
              <span>Visual Memories</span>
            </motion.div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
              ATMOS Moments in 3D
            </h2>
            <p className="text-neutral-400 text-base max-w-2xl mx-auto">
              Swipe or watch the continuous 3D tilted horizontal loop featuring guest talks, drone racing, pro shows, robo soccer, and tech expos.
            </p>
          </div>

          {/* 3D Tilted Gallery Component */}
          <TiltedGallery images={galleryImages} duration={32} tiltAngle={16} perspective={1200} />

          <div className="mt-6 text-center">
            <span className="text-xs text-neutral-500 font-mono bg-neutral-900/80 px-4 py-2 rounded-full border border-neutral-800">
              ✨ Interactive 3D Perspective Loop • 12 High-Res Events Featured
            </span>
          </div>
        </section>

        {/* Stats Grid */}
        <section id="stats" className="max-w-7xl mx-auto px-6 py-24 border-t border-neutral-800/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="p-8 rounded-3xl bg-neutral-900/40 border border-neutral-800/80 backdrop-blur-md relative overflow-hidden group hover:border-neutral-700 transition-all"
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${stat.color} p-3 text-white mb-6 shadow-lg`}>
                    <Icon className="w-full h-full" />
                  </div>
                  <div className="text-4xl font-black text-white tracking-tight mb-2 group-hover:scale-105 transition-transform origin-left">
                    {stat.value}
                  </div>
                  <div className="text-neutral-400 text-sm font-medium">{stat.label}</div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Events Showcase */}
        <section id="events" className="max-w-7xl mx-auto px-6 py-24 border-t border-neutral-800/40">
          <EventsPage />
        </section>

        {/* Footer */}
        <footer className="border-t border-neutral-800/60 py-12 px-6 bg-neutral-950">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-sm text-neutral-500 gap-6">
            <div className="flex items-center space-x-3">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <span className="font-bold text-neutral-300">ATMOS 2026 • BITS Pilani Hyderabad Campus</span>
            </div>

            <p className="text-center">© {new Date().getFullYear()} ATMOS Technical Festival. All rights reserved.</p>

            <div className="flex items-center space-x-6">
              <a href="#about" className="hover:text-white transition-colors">About</a>
              <a href="#gallery" className="hover:text-white transition-colors">Gallery</a>
              <a href="#events" className="hover:text-white transition-colors">Events</a>
            </div>
          </div>
        </footer>

      </div>
    </SmoothScroll>
  );
};

export default App;
