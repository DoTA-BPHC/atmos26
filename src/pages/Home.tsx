import { lazy, Suspense, useEffect, useState } from 'react';
import { Hero } from '../components/hero/Hero';
import { Preloader } from '../components/hero/Preloader';
import { Journey } from '../components/home/Journey';
import { Hub } from '../components/home/Hub';
import { shouldShowPreloader } from '../lib/intro';
import { guessTier, PHONE } from '../world/quality';
import { useWorld } from '../world/store';
import { sound } from '../world/sound';

// the ascent's world: the heavy part of the page, fetched after the hero
const World = lazy(() => import('../world/World'));

export default function Home() {
  const [boot] = useState(shouldShowPreloader);
  const { tier } = useWorld();
  const still = (tier ?? guessTier()) === 'still';
  // the score rests under the hero; the ascent takes over as it rises
  useEffect(() => sound.scene('rest'), []);
  return (
    <>
      {boot && <Preloader />}
      <Suspense fallback={null}>
        <World />
      </Suspense>
      <div className="relative z-[1]">
        {still && <Hero />}
        <Journey />
        {/* phones end on the summit; these live on their own pages there */}
        {!PHONE && <Hub />}
      </div>
    </>
  );
}
