// Data model: Tour > Series > Event > Day(Flight) > Schedule(편성) → Live → VOD. Players ↔ VOD is N:M.

export type Tier = 'free' | 'basic' | 'premium';
export type Member = 'guest' | Tier;
export type TourId = 'BRACELETS' | 'SUPER CIRCUIT' | 'CIRCUIT';
export type Lang = 'EN' | 'ES' | 'PT';
export type BroadcastType = 'Feature Table' | 'Final Table' | 'Highlight Show';
export type VodType = 'Full Replay' | 'Highlight' | 'Clip' | 'Hand' | 'Interview' | 'Shorts';
export type ScheduleStatus = 'upcoming' | 'live' | 'ended';
export type SeriesPhase = 'ongoing' | 'upcoming' | 'ended';

export interface Series {
  id: string;
  tour: TourId;
  name: string;
  start: string; // ISO date (local to series tz)
  end: string;
  venue: string;
  city: string;
  timezone: string;
  hue: number; // placeholder art colour
}

export interface EventDay {
  id: string;
  label: 'Day 1A' | 'Day 1B' | 'Day 2' | 'Day 3' | 'Final Table';
  date: string; // YYYY-MM-DD series-local
}

export interface TourEvent {
  id: string;
  seriesId: string;
  number: number;
  name: string;
  buyIn: string;
  days: EventDay[];
}

export interface Channel {
  id: 'CH-01' | 'CH-02' | 'CH-03' | 'CH-04';
  name: string;
  signal: 'ok' | 'no-signal' | 'error';
}

/** 편성: one broadcast = time slot × output channel. A live stream is created from it automatically. */
export interface Schedule {
  id: string;
  title: string;
  seriesId: string;
  eventId: string;
  dayId: string;
  type: BroadcastType;
  channelId: Channel['id'];
  lang: Lang;
  tier: Tier;
  start: string; // ISO UTC
  end: string;
  visible: boolean;
  /** Set when the slot was moved after publication → "Changed" label. */
  originalStart?: string;
  /** Replay VOD created once the broadcast ends. */
  vodId?: string;
  baseViewers: number;
}

export interface Vod {
  id: string;
  title: string;
  type: VodType;
  seriesId: string;
  eventId?: string;
  tier: Tier;
  durationSec: number;
  views: number;
  publishedAt: string;
  playerIds: string[];
  description: string;
  scheduleId?: string;
}

export interface Player {
  id: string;
  name: string;
  country: string;
  flag: string;
  bracelets: number;
  rings: number;
  earnings: number;
  hue: number;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  audiences: Member[];
  link: AppRoute;
  hue: number;
}

export interface StripBanner {
  id: string;
  audience: Member;
  title: string;
  cta: string;
  link: AppRoute;
}

export interface Notice {
  id: string;
  title: string;
  date: string;
}

export interface Curation {
  id: string;
  title: string;
  vodIds: string[];
}

export type HomeSectionId =
  | 'banner'
  | 'liveNow'
  | 'todaySchedule'
  | 'tournaments'
  | 'strip'
  | 'curation'
  | 'popular'
  | 'continue'
  | 'shorts'
  | 'players'
  | 'notice';

export interface HomeSection {
  id: HomeSectionId;
  visible: boolean;
  audiences: Member[];
}

export type AppRoute =
  | { name: 'tab'; tab: AppTab }
  | { name: 'live'; scheduleId: string }
  | { name: 'vod'; vodId: string }
  | { name: 'series'; seriesId: string }
  | { name: 'player'; playerId: string }
  | { name: 'search' }
  | { name: 'paywall' }
  | { name: 'inbox' };

export type AppTab = 'home' | 'schedule' | 'vod' | 'tournaments' | 'my';
