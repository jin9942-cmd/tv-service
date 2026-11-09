import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

/**
 * WSOP archive footage (clips and stills cut from the 2025 WSOP broadcasts).
 * The files live once in the deployed root, wsop-tv/public/nas (served at /nas/ on Vercel; vercel.json lets /nas/
 * through). src/data/nas-manifest.json lists them by path; `virtual:nas-media` turns those paths into URLs:
 * the dev server reads them straight from that folder, builds point at /nas/.
 */
const ROOT = path.dirname(fileURLToPath(import.meta.url))
const NAS_DIR = path.resolve(ROOT, '../wsop-tv/public/nas')
const MANIFEST = path.resolve(ROOT, 'src/data/nas-manifest.json')
function nasMedia(): Plugin {
  let serve = false
  const ID = '\0virtual:nas-media'
  return {
    name: 'nas-media',
    configResolved(c) {
      serve = c.command === 'serve'
    },
    resolveId(id) {
      if (id === 'virtual:nas-media') return ID
    },
    load(id) {
      if (id !== ID) return
      if (!fs.existsSync(MANIFEST)) return 'export default null'
      const prefix = serve ? '/@fs/' + NAS_DIR.replace(/\\/g, '/') + '/' : '/nas/'
      const url = (v: unknown): unknown =>
        typeof v === 'string' ? (/^(video|stills)\//.test(v) ? prefix + v : v) : Array.isArray(v) ? v.map(url) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, url(x)])) : v
      return `export default ${JSON.stringify(url(JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))))}`
    },
  }
}

// BASE_PATH is set by the GitHub Pages workflow ("/<repo>/v2/"); local dev stays at "/".
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss(), nasMedia()],
  server: { fs: { allow: ['.', NAS_DIR] } },
})
