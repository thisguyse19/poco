import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const svgPath = join(root, 'public/poco/icons/icon-source.svg')
const svg = readFileSync(svgPath)

const out192 = join(root, 'public/poco/icons/icon-192.png')
const out512 = join(root, 'public/poco/icons/icon-512.png')

await sharp(svg).resize(192, 192).png().toFile(out192)
await sharp(svg).resize(512, 512).png().toFile(out512)

console.log('Wrote', out192, out512)
