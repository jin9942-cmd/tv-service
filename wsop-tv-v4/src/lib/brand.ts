/** WSOP logo image (public/wsop-logo.webp, 216×80, transparent) — resolved against the deploy base path. */
export const WSOP_LOGO = `${import.meta.env.BASE_URL}wsop-logo.webp`;

/** Home banner photos (public/hero, public/promo): the final table, and Daniel Negreanu at the table. */
export const HERO_IMAGES = {
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
}
const PROMO = `${import.meta.env.BASE_URL}promo/`;
const HERO = `${import.meta.env.BASE_URL}hero/`;
const art = (src: string, pos = '50% 50%'): Art => ({ src, pos });
/** Table, player and trophy shots — for final tables, classics and hand clips. */
export const TABLE_ART: Art[] = [
  art(`${PROMO}final-table-wide.webp`),
  art(`${PROMO}table-candid.png`),
  art(`${PROMO}main-event-stage.png`),
  art(`${PROMO}bracelet-win.png`, '50% 40%'),
  art(`${HERO}negreanu-table.webp`, '30% 30%'),
  art(`${PROMO}champion-belt.png`),
  art(`${PROMO}table-scene.png`),
  art(`${PROMO}champion.png`, '50% 40%'),
  art(`${HERO}negreanu-portrait.png`, '50% 25%'),
  art(`${PROMO}final-table-wide.webp`, '12% 50%'),
  art(`${PROMO}poker-room.png`),
  art(`${PROMO}final-table-wide.webp`, '88% 50%'),
];
/** Venue and room shots — for the earlier tournament days. */
export const VENUE_ART: Art[] = [
  art(`${PROMO}venue-horseshoe.png`),
  art(`${PROMO}poker-room.png`, '20% 50%'),
  art(`${PROMO}venue-grand-casino.png`),
  art(`${PROMO}venue-thunder-valley.png`),
  art(`${PROMO}poker-room.png`, '80% 50%'),
  art(`${PROMO}venue-horseshoe.png`, '15% 50%'),
];
/** Fixed picks for the videos people see first (the rest walk the pools in order). */
export const PROMO_ART: Record<string, Art> = {
  'lv-main-finaltable': TABLE_ART[0],
  'lv-hr-finaltable': TABLE_ART[1],
  'lv-mm-finaltable': TABLE_ART[6],
  'classic-a6-finaltable': TABLE_ART[2],
  'classic-a5-finaltable': TABLE_ART[3],
  'classic-a1-finaltable': TABLE_ART[7],
  'classic-a4-finaltable': TABLE_ART[5],
};
