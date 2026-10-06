// EXAMPLE POLICY — not final. Single source for the home "Plans" section and the paywall.
import type { Tier } from './types';

export const PLAN_ORDER: Tier[] = ['free', 'basic', 'premium'];

export const PLANS: Record<Tier, { name: string; tagline: string; highlights: string[]; price: string }> = {
  free: { name: 'Free', tagline: 'Start watching', highlights: ['Free content only', 'Ads shown', 'Up to 720p'], price: '$0' },
  basic: { name: 'Basic', tagline: 'Feature tables', highlights: ['Up to Basic content', 'Pre-roll ads only', 'Up to 1080p'], price: 'TBD' },
  premium: { name: 'Premium', tagline: 'Every table, every final', highlights: ['All content', 'No ads', '1080p and above'], price: 'TBD' },
};

/** Paywall comparison rows. */
export const PLAN_ROWS: { label: string; values: Record<Tier, string> }[] = [
  { label: 'Content', values: { free: 'Free content only', basic: 'Up to Basic content', premium: 'All content' } },
  { label: 'Ads', values: { free: 'Ads shown', basic: 'Pre-roll only', premium: 'No ads' } },
  { label: 'Max quality', values: { free: '720p', basic: '1080p', premium: '1080p+' } },
  { label: 'Price', values: { free: '$0', basic: 'TBD', premium: 'TBD' } },
];
