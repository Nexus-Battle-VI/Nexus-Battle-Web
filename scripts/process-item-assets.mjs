#!/usr/bin/env node
/**
 * Sprites animados de productos, habilidades y epicas (EN-031). Mismo papel que
 * `process-shell-assets.mjs`: los originales NUNCA se modifican.
 *
 *   node scripts/process-item-assets.mjs --source <carpeta>
 *
 * La carpeta de origen tiene:
 *   zip/nexus-ecommerce-items/assets/ecommerce/items/<heroe>/<slug>/
 *       <slug>.png       hoja de PixelLab: fila 0 = pose base (1 celda), fila 1 =
 *                        la animacion (9 o 17 celdas de 64x64)
 *       frames/frame-NN.png  (solo "mano-del-desterrado") fotogramas sueltos de 64x64
 *   raw/<slug>/frame-NN.png  generados con PixelLab (`animate_image`): el 00 es la
 *                        imagen de partida y los demas la animacion
 *
 * El nombre de la carpeta es la CLAVE del arte: `slug(nombre)`, que coincide con
 * el prefijo del `sku` de Catalog (`<slug>-<8 hex>`). Algunos productos se
 * crearon con un nombre distinto al del ZIP; `ALIASES` los une.
 *
 * Salidas: `public/assets/items/<slug>.png` (tira horizontal de N x 64x64) y
 * `src/shared/visual-library/items/item-sprites.json` (slug -> imagen y fotogramas).
 */
import { mkdirSync, readdirSync, existsSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { PNG } from 'pngjs'

import { readPng } from './pixel-assets-lib.mjs'

const args = process.argv.slice(2)
const sourceIndex = args.indexOf('--source')
if (sourceIndex === -1 || args[sourceIndex + 1] === undefined) {
  process.stderr.write('Uso: node scripts/process-item-assets.mjs --source <carpeta>\n')
  process.exit(1)
}
const SOURCE = resolve(args[sourceIndex + 1])
const ZIP = join(SOURCE, 'zip/nexus-ecommerce-items/assets/ecommerce/items')
const RAW = join(SOURCE, 'raw')
const PUBLIC = resolve('public/assets/items')
const MANIFEST = resolve('src/shared/visual-library/items/item-sprites.json')
const CELL = 64

/** Producto con otro nombre en Catalog -> carpeta con su arte. */
/** @type {Record<string, string>} */
const ALIASES = {}

/** @param {readonly PNG[]} frames @returns {PNG} */
const strip = (frames) => {
  const out = new PNG({ width: CELL * frames.length, height: CELL })
  frames.forEach((frame, index) => {
    if (frame.width !== CELL || frame.height !== CELL) {
      throw new Error(
        `fotograma de ${String(frame.width)}x${String(frame.height)}, se esperaba 64x64`,
      )
    }
    PNG.bitblt(frame, out, 0, 0, CELL, CELL, index * CELL, 0)
  })
  return out
}

/** Fila 1 de una hoja de PixelLab: la animacion. @param {PNG} sheet */
const animationRow = (sheet) => {
  const count = sheet.width / CELL
  if (!Number.isInteger(count) || sheet.height !== CELL * 2) {
    throw new Error(`hoja de ${String(sheet.width)}x${String(sheet.height)} inesperada`)
  }
  return Array.from({ length: count }, (_, index) => {
    const frame = new PNG({ width: CELL, height: CELL })
    PNG.bitblt(sheet, frame, index * CELL, CELL, CELL, CELL, 0, 0)
    return frame
  })
}

/** @param {string} dir */
const framesIn = (dir) =>
  readdirSync(dir)
    .filter((name) => /^frame-\d+\.png$/u.test(name))
    .sort()
    .map((name) => readPng(join(dir, name)))

/** @type {Record<string, { image: string, frames: number }>} */
const manifest = {}
mkdirSync(PUBLIC, { recursive: true })

/** @param {string} slug @param {readonly PNG[]} frames @param {string} origin */
const publish = (slug, frames, origin) => {
  if (manifest[slug] !== undefined) throw new Error(`arte duplicado para ${slug}`)
  writeFileSync(join(PUBLIC, `${slug}.png`), PNG.sync.write(strip(frames)))
  manifest[slug] = { image: `/assets/items/${slug}.png`, frames: frames.length }
  process.stdout.write(`   ${origin.padEnd(4)} ${slug} (${String(frames.length)})\n`)
}

for (const hero of readdirSync(ZIP).sort()) {
  for (const slug of readdirSync(join(ZIP, hero)).sort()) {
    const dir = join(ZIP, hero, slug)
    const sheet = join(dir, `${slug}.png`)
    publish(
      slug,
      existsSync(sheet) ? animationRow(readPng(sheet)) : framesIn(join(dir, 'frames')),
      'zip',
    )
  }
}

if (existsSync(RAW)) {
  for (const slug of readdirSync(RAW).sort()) {
    publish(slug, framesIn(join(RAW, slug)), 'gen')
  }
}

for (const [alias, slug] of Object.entries(ALIASES)) {
  const target = manifest[slug]
  if (target === undefined) throw new Error(`alias ${alias} -> ${slug} sin arte`)
  manifest[alias] = target
}

const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)))
mkdirSync(resolve('src/shared/visual-library/items'), { recursive: true })
writeFileSync(MANIFEST, `${JSON.stringify(sorted, null, 2)}\n`)
process.stdout.write(`${String(Object.keys(sorted).length)} sprites -> ${MANIFEST}\n`)
