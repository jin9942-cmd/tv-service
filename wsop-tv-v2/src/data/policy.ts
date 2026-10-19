// Values that are NOT decided yet (pricing, retention, completion threshold, grace period, travel rights…).
// Kept in one place so they're easy to swap; screens that show them add a "Placeholder" tag.
import type { Platform } from './types';

export const PRICES = {
  monthly: { label: '$X.99', per: '/ month', months: 1 },
  annual: { label: '$XX.99', per: '/ year', months: 12 },
} as const;
export type PlanId = keyof typeof PRICES;

/** Watched share after which a broadcast leaves Continue Watching. */
export const COMPLETE_THRESHOLD = 0.95;

/** Payment-issue grace period, in days from today (demo). */
export const GRACE_DAYS = 7;

/** "Subscription expired" demo state: the subscription ended this many days ago. */
export const EXPIRED_DAYS_AGO = 3;

/** Replay availability window after a broadcast is published, in days. */
export const CATCH_UP_DAYS = 180;

/** Traveling-abroad demo: the viewer's current country, and the events whose rights may not cover it. */
export const TRAVEL_COUNTRY = 'Japan';
export const TRAVEL_UNAVAILABLE_EVENTS = ['lv-hr', 'lv-ladies'];

/** Payment provider shown for in-app purchase, by platform. */
export const STORE_NAME: Record<Platform, string> = {
  web: 'Web browser',
  ios: 'App Store',
  ipados: 'App Store',
  android: 'Google Play',
  androidtablet: 'Google Play',
  appletv: 'App Store',
  androidtv: 'Google Play',
  roku: 'Roku Pay',
  samsung: 'Samsung Checkout',
  lg: 'LG Content Store',
};

const DAY = 86_400_000;
export const daysFromNow = (n: number) => Date.now() + n * DAY;
/** Next renewal for a plan bought today. */
export const renewalDate = (plan: PlanId) => {
  const d = new Date();
  d.setMonth(d.getMonth() + PRICES[plan].months);
  return d.getTime();
};

/** Billing dates always carry the year (an annual renewal is next year). */
export const fmtBillingDate = (at: number) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(at));
