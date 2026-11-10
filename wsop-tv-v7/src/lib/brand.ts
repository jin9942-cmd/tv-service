import type { CSSProperties } from 'react';
import NAS from 'virtual:nas-media';
/** WSOP logo image (public/wsop-logo.webp, 216×80, transparent) — resolved against the deploy base path. */
export const WSOP_LOGO = `${import.meta.env.BASE_URL}wsop-logo.webp`;

/** Home banner photos (public/hero, public/promo): the final table, and Daniel Negreanu at the table. */
// With the WSOP archive cut (vite.config.ts): banners and cards use archive stills instead.
export const HERO_IMAGES = NAS ? NAS.hero : {
  table: `${import.meta.env.BASE_URL}hero/negreanu-table.webp`,
  portrait: `${import.meta.env.BASE_URL}hero/negreanu-portrait.png`,
  finalTable: `${import.meta.env.BASE_URL}promo/final-table-wide.webp`,
};

/**
 * Clean artwork for every video card (photos from the design proposal and the banner, no broadcast graphics).
 * Each entry is an image and the crop to show; the wide shots appear at a few crops so they read as different cards.
 */
export interface Art {
  src: string;
  pos: string;
  /** 'contain' shows the whole picture on a dark backdrop (cut-out images such as the bracelet). */
  fit?: 'contain';
}
const PROMO = `${import.meta.env.BASE_URL}promo/`;
const HERO = `${import.meta.env.BASE_URL}hero/`;
const art = (src: string, pos = '50% 50%', fit?: 'contain'): Art => ({ src, pos, fit });

/** Inline style for a thumbnail <img>: its crop, or the whole cut-out on a dark gold backdrop. */
export function artStyle(a: { pos: string; fit?: 'contain' }): CSSProperties {
  if (a.fit !== 'contain') return { objectPosition: a.pos };
  return { objectPosition: a.pos, objectFit: 'contain', padding: '7%', background: 'radial-gradient(ellipse at 50% 45%, #3d2b0f 0%, #140e06 55%, #070707 100%)' };
}
/** Table, player and trophy shots — for final tables, classics and hand clips. */
export const TABLE_ART: Art[] = NAS ? [...NAS.stills.broadcast, ...NAS.stills.hands, ...NAS.stills.people].map((x) => art(x)) : [
  art(`${PROMO}final-table-wide.webp`),
  art(`${PROMO}table-candid.png`),
  art(`${PROMO}main-event-stage.png`),
  art(`${PROMO}bracelet-win.png`, '50% 40%'),
  art(`${HERO}negreanu-table.webp`, '30% 30%'),
  art(`${PROMO}bracelet.webp`, '50% 50%', 'contain'),
  art(`${PROMO}table-scene.png`),
  art(`${PROMO}champion.png`, '50% 40%'),
  art(`${HERO}negreanu-portrait.png`, '50% 25%'),
  art(`${PROMO}final-table-wide.webp`, '12% 50%'),
  art(`${PROMO}poker-room.png`),
  art(`${PROMO}final-table-wide.webp`, '88% 50%'),
  art(`${PROMO}ukipt-table.png`),
  art(`${PROMO}champion-cash.webp`, '50% 35%'),
  art(`${PROMO}player-cap-headphones.jpg`, '55% 30%'),
  art(`${PROMO}player-w-sweater.webp`, '50% 30%'),
  art(`${PROMO}table-crowd.webp`, '50% 35%'),
  art(`${PROMO}player-thinking.jpg`, '50% 30%'),
  art(`${PROMO}player-glasses.jpg`, '50% 35%'),
];
/** Venue and room shots — for the earlier tournament days. */
export const VENUE_ART: Art[] = NAS ? NAS.stills.venue.map((x) => art(x)) : [
  art(`${PROMO}venue-horseshoe.png`),
  art(`${PROMO}poker-room.png`, '20% 50%'),
  art(`${PROMO}venue-grand-casino.png`),
  art(`${PROMO}venue-thunder-valley.png`),
  art(`${PROMO}poker-room.png`, '80% 50%'),
  art(`${PROMO}venue-horseshoe.png`, '15% 50%'),
  art(`${PROMO}tournament-hall.webp`),
];
/** Each 24/7 channel's own picture (the Channel guide's channel cards). */
export const CHANNEL_ART: Record<string, Art> = {
  wsop1: TABLE_ART[0],
  wsop2: TABLE_ART[1],
  hands: TABLE_ART[3],
  classics: NAS ? TABLE_ART[8] : art(`${PROMO}wpc-stage.png`, '50% 35%'),
};

/** Fixed picks for the videos people see first (the rest walk the pools in order). */
export const PROMO_ART: Record<string, Art> = NAS ? {} : {
  'lv-main-finaltable': TABLE_ART[0],
  'lv-hr-finaltable': TABLE_ART[1],
  'lv-ppc-finaltable': TABLE_ART[6],
  'classic-a5-finaltable': TABLE_ART[3],
  'classic-a1-finaltable': TABLE_ART[7],
  'classic-a4-finaltable': TABLE_ART[5],
  // v7: the Main Event's earlier days (Continue watching) show play, not the casino outside.
  'lv-main-day3': art(`${PROMO}player-w-sweater.webp`, '50% 30%'),
  'lv-main-day2abc': art(`${PROMO}tournament-hall.webp`),
  'lv-main-day1b': art(`${PROMO}table-crowd.webp`, '50% 35%'),
  'lv-main-day1a': art(`${PROMO}player-thinking.jpg`, '50% 30%'),
};
/** Casino exteriors: only after every photo of play has been used. */
export const EXTERIOR = new Set([`${PROMO}venue-horseshoe.png`, `${PROMO}venue-grand-casino.png`, `${PROMO}venue-thunder-valley.png`]);

/** Photos of the players the demo has pictures of: their hand clips use these, in turn. */
export const PLAYER_ART: Record<string, Art[]> = NAS ? {} : {
  p04: [art(`${PROMO}negreanu-gg.png`, '50% 35%'), art(`${PROMO}negreanu-bracelet.webp`, '50% 30%'), art(`${PROMO}negreanu-hoodie.webp`, '60% 35%'), art(`${PROMO}negreanu-smile.png`, '45% 30%')],
};

/** The WSOP bracelet, small (bracelet counts). */
export const BRACELET_ICON = `${PROMO}bracelet-small.webp`;
