// 2026 sponsors aren't announced. Tiers render open slots until they are.
export interface SponsorTier {
  tier: string;
  slots: number;
  sponsors: { name: string; logo: string; href: string }[];
}

export const SPONSOR_TIERS: SponsorTier[] = [
  { tier: 'Title', slots: 1, sponsors: [] },
  { tier: 'Associate', slots: 3, sponsors: [] },
  { tier: 'Partners', slots: 8, sponsors: [] },
];
