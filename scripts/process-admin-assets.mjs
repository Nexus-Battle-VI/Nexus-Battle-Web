#!/usr/bin/env node
/**
 * Derivados de la Consola del Consejo (EN-031): la escena del salon y los
 * iconos de cada seccion de administracion, a partir de lo que PixelLab
 * entrego. Mismo papel que `process-shell-assets.mjs`: los originales NUNCA se
 * modifican.
 *
 *   node scripts/process-admin-assets.mjs --source <carpeta>
 *
 * La carpeta de origen tiene en `raw/`:
 *   council-hall-<tema>.png   escena del salon, opaca (688x384)
 *   admin-icons-<tema>.png    16 placas enmarcadas en 4x4
 *
 * Salidas: `public/assets/admin/scene/` y `public/assets/admin/icons/`.
 */
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { PNG } from 'pngjs'

import { plateInteriors, readPng } from './pixel-assets-lib.mjs'

const args = process.argv.slice(2)
const sourceIndex = args.indexOf('--source')
if (sourceIndex === -1 || args[sourceIndex + 1] === undefined) {
  process.stderr.write('Uso: node scripts/process-admin-assets.mjs --source <carpeta>\n')
  process.exit(1)
}
const RAW = join(resolve(args[sourceIndex + 1]), 'raw')
const PUBLIC = resolve('public/assets/admin')
const THEMES = ['dark', 'light']

/** @param {string} dir @returns {string} */
const ensure = (dir) => {
  mkdirSync(join(PUBLIC, dir), { recursive: true })
  return join(PUBLIC, dir)
}

process.stdout.write('escena\n')
for (const theme of THEMES) {
  copyFileSync(
    join(RAW, `council-hall-${theme}.png`),
    join(ensure('scene'), `council-hall-${theme}.png`),
  )
}

/** Orden de las placas en la hoja, de izquierda a derecha y de arriba abajo. */
const ADMIN_ICONS = [
  'console',
  'missions',
  'products',
  'new-product',
  'inventory',
  'banners',
  'roles',
  'metrics',
  'chatbot-model',
  'chatbot-knowledge',
  'chatbot-analytics',
  'chatbot-tickets',
  'moderation',
  'official-auction',
  'pending',
  'security',
]

process.stdout.write('iconos\n')
for (const theme of THEMES) {
  const sheet = readPng(join(RAW, `admin-icons-${theme}.png`))
  // Placas de ~89 px: un recorte de 60 deja el objeto sin el marco.
  plateInteriors(sheet, ADMIN_ICONS.length, 60).forEach((png, index) => {
    const name = `icon-${ADMIN_ICONS[index] ?? 'sin-nombre'}-${theme}.png`
    writeFileSync(join(ensure('icons'), name), PNG.sync.write(png))
    process.stdout.write(`   icons/${name}\n`)
  })
}
