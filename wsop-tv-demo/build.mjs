// The internal demo site: v7, v8 and the NAS media it plays, copied from wsop-tv/public at build time
// (no other versions, no root page of their own). Hosted on Vercel (project root: wsop-tv-demo) and on Cloudflare
// Pages (root directory wsop-tv-demo, build `node build.mjs`, output `dist`; _redirects / _headers below are its rules).
import { cpSync, rmSync, writeFileSync } from 'node:fs';
rmSync('dist', { recursive: true, force: true });
cpSync('../wsop-tv/public/v7', 'dist/v7', { recursive: true });
// v8: built straight into this folder from wsop-tv-v8-demo (npm run publish:vercel there).
cpSync('v8', 'dist/v8', { recursive: true });
cpSync('../wsop-tv/public/nas', 'dist/nas', { recursive: true });
cpSync('../wsop-tv/public/favicon.svg', 'dist/favicon.svg');
writeFileSync('dist/robots.txt', 'User-agent: *\nDisallow: /\n');
// Cloudflare Pages: the root opens v7; nothing is indexed.
writeFileSync('dist/_redirects', '/ /v7/ 302\n/v7 /v7/ 302\n/v8 /v8/ 302\n');
writeFileSync('dist/_headers', '/*\n  X-Robots-Tag: noindex, nofollow\n');
