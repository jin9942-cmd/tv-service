/** WSOP logo image (public/wsop-logo.webp, 216×80, transparent) — resolved against the deploy base path. */
export const WSOP_LOGO = `${import.meta.env.BASE_URL}wsop-logo.webp`;

/** Home banner photos (public/hero, public/promo): the final table, and Daniel Negreanu at the table. */
export const HERO_IMAGES = {
  table: `${import.meta.env.BASE_URL}hero/negreanu-table.webp`,
  portrait: `${import.meta.env.BASE_URL}hero/negreanu-portrait.png`,
  finalTable: `${import.meta.env.BASE_URL}promo/final-table-wide.webp`,
};

/**
 * Thumbnails from the design proposal (public/promo) for the videos people see first; everything else keeps a still
 * from the CC footage. Keyed by video id (broadcast day id).
 */
const PROMO = `${import.meta.env.BASE_URL}promo/`;
export const PROMO_THUMBS: Record<string, string> = {
  'lv-main-finaltable': `${PROMO}final-table-wide.webp`,
  'lv-hr-finaltable': `${PROMO}table-candid.png`,
  'lv-mm-finaltable': `${PROMO}table-scene.png`,
  'classic-a6-finaltable': `${PROMO}main-event-stage.png`,
  'classic-a5-finaltable': `${PROMO}bracelet-win.png`,
  'classic-a1-finaltable': `${PROMO}champion.png`,
};
