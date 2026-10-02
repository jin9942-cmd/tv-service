// DEMO ASSUMPTION: access policy for the prototype only.
// Replace this file (or load it from a config/entitlement API) when real plans are defined.
//
// Tiers combine two independent facts:
//   - authentication: GGPass (guest = signed out, every other tier = signed in)
//   - subscription:   WSOP+  (free = no plan, standard / platinum = demo plan names, not final)
// Activity badges (config/badges.ts) are separate and never affect access.

export type Tier = 'guest' | 'free' | 'standard' | 'platinum';

export type AccessLevel =
  | 'highlight' // free highlight clips
  | 'free-vod' // designated free VOD (needs a free account)
  | 'main-live' // main feature-table live stream
  | 'paid-vod' // full replays
  | 'additional-table'; // extra table streams

export const TIER_ORDER: Tier[] = ['guest', 'free', 'standard', 'platinum'];

export const TIER_LABEL: Record<Tier, string> = {
  guest: 'Guest',
  free: 'Free',
  standard: 'Standard',
  platinum: 'Platinum',
};

export const ACCESS_LABEL: Record<AccessLevel, string> = {
  highlight: 'Free highlight',
  'free-vod': 'Free with account',
  'main-live': 'Main live stream',
  'paid-vod': 'Full replay',
  'additional-table': 'Additional table',
};

export const POLICY: Record<Tier, AccessLevel[]> = {
  guest: ['highlight'],
  free: ['highlight', 'free-vod'],
  standard: ['highlight', 'free-vod', 'main-live', 'paid-vod'],
  platinum: ['highlight', 'free-vod', 'main-live', 'paid-vod', 'additional-table'],
};

/** Plan copy shown on the landing page / upgrade modal. Prices are intentionally not real. */
export const PLAN_FEATURES: Record<Exclude<Tier, 'guest'>, string[]> = {
  free: ['Free highlight clips', 'Selected free replays', 'Schedule & player profiles'],
  standard: ['Everything in Free', 'Main feature-table live stream', 'Full replay archive'],
  platinum: ['Everything in Standard', 'Choose additional table streams', 'Switch tables during play'],
};

export function canAccess(tier: Tier, level: AccessLevel): boolean {
  return POLICY[tier].includes(level);
}

export function minimumTier(level: AccessLevel): Tier {
  return TIER_ORDER.find((t) => POLICY[t].includes(level)) ?? 'platinum';
}

export type GateResult = { kind: 'ok' } | { kind: 'login'; required: Tier } | { kind: 'upgrade'; required: Tier };

export function checkAccess(tier: Tier, level: AccessLevel): GateResult {
  if (canAccess(tier, level)) return { kind: 'ok' };
  const required = minimumTier(level);
  return tier === 'guest' ? { kind: 'login', required } : { kind: 'upgrade', required };
}
