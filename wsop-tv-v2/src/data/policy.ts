// Values that are NOT decided yet — WSOP+ tier names and prices, which tier includes WSOP TV, what each tier can
// watch, retention, completion threshold, grace period, travel rights. Kept in one place so they're easy to swap;
// screens that show them carry a "Placeholder" / "Pricing to be confirmed" tag.
import type { Access } from './types';

// ---- WSOP+ membership (WSOP TV only reads the tier; joining, billing and cancelling all happen in WSOP+) ----

/** Content requirement / member level. `free` = no sign-in · `wsopFree` = any GGPass account (WSOP+ Free is automatic). */
export type Tier = 'free' | 'wsopFree' | 'basic' | 'premium';
export type PaidTier = 'basic' | 'premium';
export const TIER_RANK: Record<Tier, number> = { free: 0, wsopFree: 1, basic: 2, premium: 3 };
export const atLeast = (have: Tier, need: Tier) => TIER_RANK[have] >= TIER_RANK[need];

/** Badge labels on cards, detail and watch screens. */
export const TIER_BADGE: Record<Tier, string> = { free: 'Free', wsopFree: 'WSOP+ Free', basic: 'Basic', premium: 'Premium' };
/** Membership names ("WSOP+ Basic"). Placeholder names. */
export const TIER_NAME: Record<Exclude<Tier, 'free'>, string> = { wsopFree: 'Free', basic: 'Basic', premium: 'Premium' };
export const tierFull = (t: Exclude<Tier, 'free'>) => `WSOP+ ${TIER_NAME[t]}`;

/** WSOP+ follows its own billing cycle: monthly shown; annual exists but stays hidden until confirmed. */
export const SHOW_ANNUAL = false;
export const MEMBERSHIP_PRICES: Record<Exclude<Tier, 'free'>, { monthly: string; annual: string }> = {
  wsopFree: { monthly: '$0', annual: '$0' },
  basic: { monthly: '$9.99', annual: '$99.99' },
  premium: { monthly: '$49.99', annual: '$499.99' },
};

/** Which WSOP+ tier includes WSOP TV's paid content (decision pending — switch in Demo Controls). */
export type IncludedFrom = 'basic' | 'premium' | 'split';
export const INCLUDED_FROM_LABEL: Record<IncludedFrom, string> = { basic: 'Basic', premium: 'Premium', split: 'Split (example)' };

/**
 * Tier a piece of content needs. Legacy content levels map as: free → free, signin → WSOP+ Free,
 * subscriber → the "WSOP TV included from" setting. Split (example): live/delayed broadcasts need Premium;
 * replays, archive and paid clips need Basic.
 */
export function requiredTier(access: Access, includedFrom: IncludedFrom, live = false): Tier {
  if (access === 'free') return 'free';
  if (access === 'signin') return 'wsopFree';
  if (includedFrom === 'split') return live ? 'premium' : 'basic';
  return includedFrom;
}

/** What each tier gets on WSOP TV, derived from the setting above (for the plan comparison). */
export function tvCoverage(tier: Exclude<Tier, 'free'>, includedFrom: IncludedFrom): string[] {
  if (tier === 'wsopFree') return ['Free highlight clips', 'Selected classics, replays and hands', 'Follow players, reminders, My List'];
  const all = ['Every live table, incl. delayed final tables', 'Full archive of replays', 'Hand-by-hand replays and clips', 'Basic & Pro data overlays, multiview'];
  if (tier === 'premium') return all;
  if (includedFrom === 'basic') return all;
  if (includedFrom === 'split') return ['Full archive of replays', 'Hand-by-hand replays and clips', 'Live tables need Premium'];
  return ['Same WSOP TV access as WSOP+ Free'];
}

/** Next payment shown on the account screen (placeholder). */
export const NEXT_PAYMENT_DAYS = 30;

// ---- other undecided values ----

/** Watched share after which a broadcast leaves Continue Watching. */
export const COMPLETE_THRESHOLD = 0.95;

/** Payment-issue grace period, in days from today (demo). */
export const GRACE_DAYS = 7;

/** "Membership ended" demo state: it ended this many days ago. */
export const EXPIRED_DAYS_AGO = 3;

/** Replay availability window after a broadcast is published, in days. */
export const CATCH_UP_DAYS = 180;

/** Traveling-abroad demo: the viewer's current country, and the events whose rights may not cover it. */
export const TRAVEL_COUNTRY = 'Japan';
export const TRAVEL_UNAVAILABLE_EVENTS = ['lv-hr', 'lv-ladies'];

const DAY = 86_400_000;
export const daysFromNow = (n: number) => Date.now() + n * DAY;

/** Billing dates always carry the year. */
export const fmtBillingDate = (at: number) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(at));
