import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

/**
 * Local preview with WSOP archive footage (dev server only).
 * Clips and stills cut from the internal NAS live outside the repo, in "Claude outputs/nas-media" (never committed).
 * `npm run dev` exposes their manifest as `virtual:nas-media`; every build (Vercel, GitHub Pages) gets `null`,
 * so published sites keep the Creative Commons media and never reference the archive.
 */
const NAS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../Claude outputs/nas-media')
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
      const file = path.join(NAS_DIR, 'manifest.json')
      if (!serve || !fs.existsSync(file)) return 'export default null'
      return `export default ${fs.readFileSync(file, 'utf8')}`
    },
  }
}

// BASE_PATH is set by the GitHub Pages workflow ("/<repo>/v2/"); local dev stays at "/".
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss(), nasMedia()],
  server: { fs: { allow: ['.', NAS_DIR] } },
})
