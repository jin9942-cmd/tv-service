import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

/**
 * Footage and stills from the 2025 WSOP broadcasts live once in wsop-tv/public/nas (served at /nas/ on Vercel).
 * The dev server reads them straight from that folder; builds point at /nas/.
 */
const ROOT = path.dirname(fileURLToPath(import.meta.url))
const NAS_DIR = path.resolve(ROOT, '../wsop-tv/public/nas')

export default defineConfig(({ command }) => ({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  define: { __NAS__: JSON.stringify(command === 'serve' ? '/@fs/' + NAS_DIR.replace(/\\/g, '/') + '/' : '/nas/') },
  server: { fs: { allow: ['.', NAS_DIR] } },
}))
