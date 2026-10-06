// Derived data: broadcast status, access rules, lookups.
import { useEffect, useState } from 'react';
import type { Member, Schedule, ScheduleStatus, Series, SeriesPhase, Tier } from '../data/types';
import { events, players, series, vods } from '../data/mock';
import { dateKey } from '../lib/time';
import { useStore, type State } from './store';

const MIN = 60_000;

/**
 * Demo clock. "No live broadcasts" moves the clock back to a moment before today's first
 * broadcast, so every screen (home, schedule, CMS) agrees that nothing is on air yet.
 */
export function demoNow(s: Pick<State, 'noLive' | 'schedules'>, real = Date.now()): number {
  if (!s.noLive) return real;
  let t = real;
  for (let i = 0; i < 20; i++) {
    const live = s.schedules.filter((x) => x.visible && Date.parse(x.start) <= t && t < Date.parse(x.end));
    if (!live.length) return t;
    t = Math.min(...live.map((x) => Date.parse(x.start))) - 45 * MIN;
  }
  return t;
}

/** Re-render every `ms` and return the demo clock. */
export function useNow(ms = 1000): number {
  const [real, setReal] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setReal(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  const noLive = useStore((s) => s.noLive);
  const schedules = useStore((s) => s.schedules);
  return demoNow({ noLive, schedules }, real);
}

export function statusOf(s: Schedule, now: number): ScheduleStatus {
  const a = Date.parse(s.start);
  const b = Date.parse(s.end);
  return now < a ? 'upcoming' : now < b ? 'live' : 'ended';
}

/** Simulated concurrent viewers: base ± a slow wobble. */
export function viewersOf(s: Schedule, now: number) {
  const base = s.baseViewers || 2400;
  return Math.round(base * (1 + 0.04 * Math.sin(now / 9000 + base)));
}

export const liveNow = (list: Schedule[], now: number) =>
  list.filter((s) => s.visible && statusOf(s, now) === 'live').sort((a, b) => viewersOf(b, now) - viewersOf(a, now));

export const nextUpcoming = (list: Schedule[], now: number) =>
  list.filter((s) => s.visible && statusOf(s, now) === 'upcoming').sort((a, b) => a.start.localeCompare(b.start))[0];

export const schedulesOnDay = (list: Schedule[], key: string, tz: string) =>
  list.filter((s) => s.visible && dateKey(s.start, tz) === key).sort((a, b) => a.start.localeCompare(b.start) || a.channelId.localeCompare(b.channelId));

// ---- access ---------------------------------------------------------------

const RANK: Record<Member, number> = { guest: 0, free: 1, basic: 2, premium: 3 };

export type Access = 'ok' | 'login' | 'preview';

/** guest → login prompt; insufficient tier → 10s preview then paywall. */
export function accessFor(member: Member, tier: Tier): Access {
  if (member === 'guest') return 'login';
  return RANK[member] >= RANK[tier] ? 'ok' : 'preview';
}

export const MEMBER_LABEL: Record<Member, string> = { guest: 'Guest', free: 'Free', basic: 'Basic', premium: 'Premium' };
export const MEMBER_KO: Record<Member, string> = { guest: '비로그인', free: '무료', basic: '베이직', premium: '프리미엄' };

/** Max quality per plan (example policy). */
export const MAX_QUALITY: Record<Member, string[]> = {
  guest: ['720p'],
  free: ['Auto', '720p', '480p'],
  basic: ['Auto', '1080p', '720p', '480p'],
  premium: ['Auto', '1080p60', '1080p', '720p', '480p'],
};

// ---- lookups ----------------------------------------------------------------

export const seriesById = (id: string) => series.find((x) => x.id === id)!;
export const eventById = (id?: string) => events.find((x) => x.id === id);
export const dayById = (eventId: string, dayId: string) => eventById(eventId)?.days.find((d) => d.id === dayId);
export const vodById = (id?: string) => vods.find((x) => x.id === id);
export const playerById = (id: string) => players.find((x) => x.id === id);

export function phaseOf(se: Series, now: number): SeriesPhase {
  const today = dateKey(now, se.timezone);
  return today < se.start ? 'upcoming' : today > se.end ? 'ended' : 'ongoing';
}

export function eventLabel(s: { eventId?: string; dayId?: string }) {
  const ev = eventById(s.eventId);
  if (!ev) return '';
  const day = s.dayId ? ev.days.find((d) => d.id === s.dayId)?.label : undefined;
  return `Event #${ev.number} ${ev.name}${day ? ` · ${day}` : ''}`;
}
