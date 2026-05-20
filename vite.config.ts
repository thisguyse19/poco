import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

function readPocoVersionCode(): number {
  const file = resolve(__dirname, 'src/version.ts')
  const src = readFileSync(file, 'utf8')
  const m = src.match(/export const POCO_VERSION_CODE = (\d+)/)
  if (!m) throw new Error('vite: could not parse POCO_VERSION_CODE from src/version.ts')
  return Number(m[1])
}

/** Rewrite dist/sw.js so each release changes bytes + cache name (service worker update detection). */
function pocoSwVersionPlugin() {
  return {
    name: 'poco-sw-version',
    closeBundle() {
      const code = readPocoVersionCode()
      const swPath = resolve(__dirname, 'dist/sw.js')
      let body = readFileSync(swPath, 'utf8')
      body = body.replace(/poco-shell-v\d+/g, `poco-shell-v${code}`)
      body += `\n/* POCO_VERSION_CODE=${code} */\n`
      writeFileSync(swPath, body)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), pocoSwVersionPlugin()],
  base: '/poco/',
  build: { outDir: 'dist', sourcemap: false },
})
