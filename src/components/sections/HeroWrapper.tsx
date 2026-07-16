// src/components/sections/HeroWrapper.tsx
// Server Component that fetches Hero data from WordPress and passes it to the client Hero component

import { getHeroData } from '@/api/wordpressApi';
import HeroConfig from './HeroConfig';

interface HeroWrapperProps {
  position: 'home' | 'page' | 'archive' | 'custom';
  lang?: string;
  heroData?: Awaited<ReturnType<typeof import('@/api/wordpressApi').getHeroData>>;
}

/**
 * Server Component wrapper for Hero
 * Fetches data from WordPress API and renders Hero with that data
 * Falls back to hardcoded HeroConfig if WordPress data is unavailable
 */
export default async function HeroWrapper({ position, lang, heroData }: HeroWrapperProps) {
  const data = heroData ?? await getHeroData(position, lang);
  
  if (!data || !data.active || !data.slides || data.slides.length === 0) {
    return null;
  }
  
  return <HeroConfig heroData={data} />;
}
