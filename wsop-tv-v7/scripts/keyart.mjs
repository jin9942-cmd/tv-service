// Key-art thumbnails for videos with no broadcast still of their own (design mock-up): one SVG per event, type-led
// like the Seasons tiles, with a simple motif for the event. Writes public/keyart/<id>.svg (final table) and
// <id>-hand.svg (its hand clips). Run: node scripts/keyart.mjs
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = new URL('../public/keyart/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const GOLD = '#d4af37';
const W = 1280, H = 720;

// Motifs, drawn in the right half (origin at the motif's centre, about 420px wide).
const card = (x, y, rot, rank, suit, red) => `
  <g transform="translate(${x} ${y}) rotate(${rot})">
    <rect x="-70" y="-100" width="140" height="200" rx="14" fill="#f4f1ea" stroke="${GOLD}" stroke-width="3"/>
    <text x="-48" y="-52" font-size="46" font-weight="700" fill="${red ? '#c0392b' : '#111'}" font-family="Georgia, serif">${rank}</text>
    <text x="0" y="40" font-size="96" text-anchor="middle" fill="${red ? '#c0392b' : '#111'}" font-family="Georgia, serif">${suit}</text>
  </g>`;
const chip = (x, y, r, fill) => `
  <g transform="translate(${x} ${y})">
    <ellipse rx="${r}" ry="${r * 0.32}" fill="${fill}" stroke="${GOLD}" stroke-width="3"/>
  </g>`;
const stack = (x, y, n, fill, r = 70) => Array.from({ length: n }, (_, i) => chip(x, y - i * 16, r, i % 2 ? fill : '#1d1d1d')).join('');
const MOTIF = {
  hu: `${stack(-120, 120, 9, '#8b1e1e')}${stack(120, 120, 9, '#1e3a8b')}<text x="0" y="-150" font-size="64" text-anchor="middle" fill="${GOLD}" font-family="Impact, Arial Narrow, sans-serif" letter-spacing="6">1 v 1</text>`,
  mystery: `<text x="0" y="110" font-size="330" text-anchor="middle" fill="none" stroke="${GOLD}" stroke-width="6" font-family="Georgia, serif">?</text>${stack(150, 170, 4, '#6b21a8', 55)}`,
  monster: `${stack(-100, 190, 18, '#14532d', 64)}${stack(60, 190, 14, '#7c2d12', 64)}${stack(200, 190, 10, '#1e3a8b', 64)}`,
  seniors: `<text x="0" y="90" font-size="260" text-anchor="middle" fill="none" stroke="${GOLD}" stroke-width="6" font-family="Impact, Arial Narrow, sans-serif">50+</text>`,
  mixed: `${card(-150, 20, -12, 'A', '♠')}${card(-50, 0, -4, '7', '♥', true)}${card(50, 0, 4, 'K', '♣')}${card(150, 20, 12, '2', '♦', true)}<text x="0" y="-150" font-size="48" text-anchor="middle" fill="${GOLD}" font-family="Impact, Arial Narrow, sans-serif" letter-spacing="8">8 GAMES</text>`,
  ladies: `${card(-60, 10, -10, 'Q', '♥', true)}${card(60, 10, 10, 'Q', '♦', true)}`,
  plo: `${card(-165, 30, -18, 'A', '♠')}${card(-55, 5, -6, 'A', '♥', true)}${card(55, 5, 6, 'K', '♠')}${card(165, 30, 18, 'K', '♥', true)}`,
  sixmax: `<ellipse rx="210" ry="120" fill="#0f3d24" stroke="${GOLD}" stroke-width="5"/>${[0, 1, 2, 3, 4, 5].map((i) => { const a = (Math.PI * 2 * i) / 6 - Math.PI / 2; return `<circle cx="${Math.cos(a) * 250}" cy="${Math.sin(a) * 160}" r="28" fill="#1d1d1d" stroke="${GOLD}" stroke-width="4"/>`; }).join('')}<text x="0" y="22" font-size="64" text-anchor="middle" fill="${GOLD}" font-family="Impact, Arial Narrow, sans-serif">6</text>`,
  bracelet: `<circle r="170" fill="none" stroke="${GOLD}" stroke-width="22"/><circle r="128" fill="none" stroke="${GOLD}" stroke-width="4" stroke-dasharray="6 10"/><rect x="-80" y="-60" width="160" height="120" rx="18" fill="#1a1712" stroke="${GOLD}" stroke-width="6"/><text x="0" y="20" font-size="48" text-anchor="middle" fill="${GOLD}" font-family="Impact, Arial Narrow, sans-serif">WSOP</text>`,
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
function svg({ kicker, big, name, label, motif, accent }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <radialGradient id="g" cx="0" cy="0" r="1.1"><stop offset="0" stop-color="${accent}" stop-opacity="0.45"/><stop offset="0.6" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    <linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1c1813"/><stop offset="1" stop-color="#090909"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#b)"/>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <g transform="translate(905 360)">${MOTIF[motif]}</g>
  <text x="72" y="104" font-size="30" font-weight="700" letter-spacing="5" fill="${GOLD}" font-family="Arial, Helvetica, sans-serif">${esc(kicker)}</text>
  <text x="66" y="430" font-size="150" font-weight="900" fill="#ffffff" font-family="Impact, Arial Narrow, sans-serif">${esc(big)}</text>
  <text x="72" y="500" font-size="44" font-weight="700" fill="#ffffff" font-family="Arial, Helvetica, sans-serif">${esc(name)}</text>
  <rect x="72" y="560" width="${label.length * 21 + 40}" height="56" rx="28" fill="none" stroke="${GOLD}" stroke-width="3"/>
  <text x="92" y="598" font-size="26" font-weight="700" letter-spacing="4" fill="${GOLD}" font-family="Arial, Helvetica, sans-serif">${esc(label)}</text>
</svg>
`;
}

// 2025 broadcast events with no still of their own, and the classics.
const EVENTS = [
  { id: 'lv-hu', kicker: 'WSOP 2025 · EVENT #7', big: '$25,000', name: 'Heads-Up Championship', motif: 'hu', accent: '#7f1d1d' },
  { id: 'lv-mmm', kicker: 'WSOP 2025 · EVENT #1', big: '$1,000', name: 'Mystery Millions', motif: 'mystery', accent: '#5b21b6' },
  { id: 'lv-ms', kicker: 'WSOP 2025 · EVENT #37', big: '$1,500', name: 'Monster Stack', motif: 'monster', accent: '#14532d' },
  { id: 'lv-seniors', kicker: 'WSOP 2025 · EVENT #48', big: '$1,000', name: 'Seniors Championship', motif: 'seniors', accent: '#1e3a8a' },
  { id: 'lv-ppc', kicker: 'WSOP 2025 · EVENT #66', big: '$50,000', name: 'Poker Players Championship', motif: 'mixed', accent: '#78350f' },
  { id: 'lv-ladies', kicker: 'WSOP 2025 · EVENT #70', big: '$1,000', name: 'Ladies Championship', motif: 'ladies', accent: '#9d174d' },
  { id: 'lv-plo', kicker: 'WSOP 2025 · EVENT #74', big: '$10,000', name: 'Pot-Limit Omaha Championship', motif: 'plo', accent: '#0e7490' },
  { id: 'lv-hr', kicker: 'WSOP 2025 · EVENT #94', big: '$10,000', name: 'No-Limit Hold’em 6-Handed', motif: 'sixmax', accent: '#065f46' },
  { id: 'classic-a1', kicker: 'WSOP CLASSICS', big: '2019', name: 'Main Event', motif: 'bracelet', accent: '#854d0e' },
  { id: 'classic-a2', kicker: 'WSOP CLASSICS', big: '2021', name: 'Poker Players Championship', motif: 'mixed', accent: '#78350f' },
  { id: 'classic-a3', kicker: 'WSOP CLASSICS', big: '2022', name: '$250,000 Super High Roller', motif: 'monster', accent: '#1e3a8a' },
  { id: 'classic-a4', kicker: 'WSOP CLASSICS', big: '2023', name: 'Main Event', motif: 'bracelet', accent: '#854d0e' },
];

for (const e of EVENTS) {
  writeFileSync(new URL(`${e.id}.svg`, OUT), svg({ ...e, label: 'FINAL TABLE' }));
  writeFileSync(new URL(`${e.id}-hand.svg`, OUT), svg({ ...e, label: 'KEY HAND' }));
}
console.log(`wrote ${EVENTS.length * 2} files`);
