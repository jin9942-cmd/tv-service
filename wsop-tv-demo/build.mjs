// The internal demo site: only v7 and the NAS media it plays, copied from wsop-tv/public at build time
// (no other versions, no root page of their own). Vercel project root: wsop-tv-demo.
import { cpSync, rmSync, writeFileSync } from 'node:fs';
rmSync('dist', { recursive: true, force: true });
cpSync('../wsop-tv/public/v7', 'dist/v7', { recursive: true });
cpSync('../wsop-tv/public/nas', 'dist/nas', { recursive: true });
cpSync('../wsop-tv/public/favicon.svg', 'dist/favicon.svg');
writeFileSync('dist/robots.txt', 'User-agent: *\nDisallow: /\n');
