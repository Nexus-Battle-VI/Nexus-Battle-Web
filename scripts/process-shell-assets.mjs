#!/usr/bin/env node
/**
 * Derivados del armazon comun remasterizado (EN-031): el mundo vivo de fondo
 * y los iconos de la navegacion, a partir de lo que PixelLab entrego. Mismo
 * papel que `process-auth-assets.mjs`: los originales NUNCA se modifican.
 *
 *   node scripts/process-shell-assets.mjs --source <carpeta>
 *
 * La carpeta de origen tiene en `raw/`:
 *   world-sky-<tema>.png      escena de fondo opaca (688x384)
 *   world-mid-dark.png        colinas del primer plano, transparente (688x384)
 *   world-clouds-dark.png     tira de nubes nocturna, transparente (688x192)
 *   nav-icons-<tema>.png      iconos de navegacion: 16 placas enmarcadas en 4x4
 *
 * Las colinas y la tira de nubes de dia NO son otra generacion: se derivan de
 * las nocturnas recoloreando su luminancia (verdes de pradera; blancos y azules).
 *
 * Salidas: `public/assets/shell/world/` y `public/assets/shell/nav/`.
 */
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { PNG } from 'pngjs'

import { components, plateInteriors, readPng } from './pixel-assets-lib.mjs'

const args = process.argv.slice(2)
const sourceIndex = args.indexOf('--source')
if (sourceIndex === -1 || args[sourceIndex + 1] === undefined) {
  process.stderr.write('Uso: node scripts/process-shell-assets.mjs --source <carpeta>\n')
  process.exit(1)
}
const RAW = join(resolve(args[sourceIndex + 1]), 'raw')
const PUBLIC = resolve('public/assets/shell')
const THEMES = ['dark', 'light']

/** @param {string} dir @returns {string} */
const ensure = (dir) => {
  mkdirSync(join(PUBLIC, dir), { recursive: true })
  return join(PUBLIC, dir)
}
/** @param {string} dir @param {string} name @param {PNG} png */
const write = (dir, name, png) => {
  writeFileSync(join(ensure(dir), name), PNG.sync.write(png))
  process.stdout.write(`   ${dir}/${name}\n`)
}

/**
 * Recolorea por luminancia hacia una rampa de colores, conservando la forma,
 * el pixelado y la transparencia. Los pixeles calidos y saturados (llamas de
 * antorcha) se dejan como estan.
 * @param {PNG} png
 * @param {readonly (readonly number[])[]} ramp
 * @param {boolean} keepWarm
 * @returns {PNG}
 */
const recolor = (png, ramp, keepWarm) => {
  const out = PNG.sync.read(PNG.sync.write(png))
  /** @param {number} i @returns {boolean} */
  const skip = (i) => {
    if ((out.data[i + 3] ?? 0) === 0) return true
    const [r, g, b] = [out.data[i] ?? 0, out.data[i + 1] ?? 0, out.data[i + 2] ?? 0]
    return keepWarm && r > g + 40 && r > b + 20
  }
  /** @param {number} i @returns {number} */
  const luma = (i) => ((out.data[i] ?? 0) + (out.data[i + 1] ?? 0) + (out.data[i + 2] ?? 0)) / 3
  let min = 255
  let max = 0
  for (let i = 0; i < out.data.length; i += 4) {
    if (skip(i)) continue
    min = Math.min(min, luma(i))
    max = Math.max(max, luma(i))
  }
  const span = Math.max(1, max - min)
  for (let i = 0; i < out.data.length; i += 4) {
    if (skip(i)) continue
    const t = Math.min(0.999, (luma(i) - min) / span) * (ramp.length - 1)
    const k = Math.floor(t)
    const from = ramp[k] ?? []
    const to = ramp[k + 1] ?? from
    for (let c = 0; c < 3; c++) {
      out.data[i + c] = Math.round((from[c] ?? 0) + ((to[c] ?? 0) - (from[c] ?? 0)) * (t - k))
    }
  }
  return out
}

/** Verdes de pradera al sol, de la sombra al brillo. */
const MEADOW = [
  [38, 74, 52],
  [70, 116, 64],
  [118, 160, 84],
  [176, 200, 120],
]
/** Nubes de dia, de la sombra azulada al blanco. */
const DAY_CLOUD = [
  [176, 196, 226],
  [255, 255, 255],
]

// --- Escena: se copia tal cual; colinas de dia: la nocturna recoloreada ------
process.stdout.write('mundo\n')
for (const theme of THEMES) {
  copyFileSync(join(RAW, `world-sky-${theme}.png`), join(ensure('world'), `world-sky-${theme}.png`))
}
const hills = readPng(join(RAW, 'world-mid-dark.png'))
write('world', 'world-mid-dark.png', hills)
write('world', 'world-mid-light.png', recolor(hills, MEADOW, true))

// --- Nubes: sin las que corta el borde, para que la tira se repita limpia ----
/**
 * Borra las nubes que tocan el borde izquierdo o derecho: al repetir la tira
 * en horizontal quedarian partidas por la mitad.
 * @param {PNG} png
 * @returns {PNG}
 */
const withoutEdgeClouds = (png) => {
  const out = PNG.sync.read(PNG.sync.write(png))
  for (const box of components(png)) {
    if (box.x > 0 && box.x + box.w < png.width) continue
    for (let y = box.y; y < box.y + box.h; y++) {
      for (let x = box.x; x < box.x + box.w; x++) out.data[(y * png.width + x) * 4 + 3] = 0
    }
  }
  return out
}

process.stdout.write('nubes\n')
const clouds = withoutEdgeClouds(readPng(join(RAW, 'world-clouds-dark.png')))
write('world', 'world-clouds-dark.png', clouds)
write('world', 'world-clouds-light.png', recolor(clouds, DAY_CLOUD, false))

// --- Iconos de navegacion (hoja 4x4) -----------------------------------------

const NAV_ICONS = [
  'ecommerce',
  'play',
  'missions',
  'tournament',
  'inventory',
  'auction',
  'console',
  'menu',
  'close',
  'sound-on',
  'sound-off',
  'catalog',
  'community',
  'account',
  'logout',
  'gem',
]
process.stdout.write('iconos\n')
for (const theme of THEMES) {
  plateInteriors(readPng(join(RAW, `nav-icons-${theme}.png`)), NAV_ICONS.length).forEach(
    (png, index) => {
      write('nav', `icon-${NAV_ICONS[index] ?? 'sin-nombre'}-${theme}.png`, png)
    },
  )
}
