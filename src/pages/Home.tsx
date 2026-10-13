import { lazy, Suspense, useState } from 'react';
import { Hero } from '../components/hero/Hero';
import { Preloader } from '../components/hero/Preloader';
import { Journey } from '../components/home/Journey';
import { CountdownBand } from '../components/home/CountdownBand';
import { Hub } from '../components/home/Hub';
import { shouldShowPreloader } from '../lib/intro';
import { PHONE } from '../world/quality';

// the ascent's world: the heavy part of the page, fetched after the hero
const World = lazy(() => import('../world/World'));

export default function Home() {
  const [boot] = useState(shouldShowPreloader);
  return (
    <>
      {boot && <Preloader />}
      <Suspense fallback={null}>
        <World />
      </Suspense>
      <div className="relative z-[1]">
        <Hero />
        <CountdownBand />
        <Journey />
        {/* phones end on the summit; these live on their own pages there */}
        {!PHONE && <Hub />}
      </div>
    </>
  );
}
