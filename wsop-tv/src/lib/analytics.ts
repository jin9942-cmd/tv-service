// Local-only analytics. Nothing is sent anywhere: events go to a ring buffer in localStorage
// and to console.debug so they can be inspected in Demo tools / DevTools.
// API INTEGRATION POINT: forward `track` to the real analytics SDK later.
import { createStore } from './storage';

export type AnalyticsEvent =
  | 'playback_started'
  | 'hand_saved'
  | 'player_followed'
  | 'badge_earned'
  | 'glossary_opened'
  | 'return_to_live_clicked';

export interface LoggedEvent {
  name: AnalyticsEvent;
  props: Record<string, string | number | boolean>;
  at: number;
}

const MAX_EVENTS = 50;
export const analyticsLog = createStore<LoggedEvent[]>('analytics', []);

export function track(name: AnalyticsEvent, props: LoggedEvent['props'] = {}): void {
  const event = { name, props, at: Date.now() };
  analyticsLog.set((prev) => [event, ...prev].slice(0, MAX_EVENTS));
  console.debug('[analytics]', name, props);
}
