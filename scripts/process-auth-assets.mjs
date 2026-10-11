#!/usr/bin/env node
/**
 * Derivados del remaster de Autenticacion, notificaciones y correos (EN-031) a
 * partir de lo que PixelLab entrego. Mismo papel que
 * `process-missions-assets.mjs`: los originales NUNCA se modifican, solo se
 * recortan y se copian.
 *
 *   node scripts/process-auth-assets.mjs --source <carpeta>
 *
 * La carpeta de origen tiene en `raw/`:
 *   bg-auth-<escena>-<tema>.png   escenas de Login/Recuperacion (gate) y Registro (oath)
 *   seals-<tema>.png              cuatro sellos de pasos y el marco del avatar
 *   icons-a-<tema>.png            iconos de las pantallas (hoja 4x4, celdas de 96 px)
 *   icons-b-<tema>.png            iconos de notificaciones (hoja 4x4, celdas de 96 px)
 *   email-header-light.png        cabecera de los correos (fondo claro)
 *
 * Las esquinas de los paneles se reutilizan del kit de Misiones (mismo arte),
 * leidas de `public/assets/missions/ui/`.
 *
 * Salidas: `public/assets/auth/`, `public/assets/notifications/` y
 * `public/assets/email/`. Los correos usan solo la variante clara: el modo
 * oscuro de los clientes de correo no es fiable.
 */
import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { PNG } from 'pngjs'

import { components, crop, cropGrid, readPng } from './pixel-assets-lib.mjs'

const args = process.argv.slice(2)
const sourceIndex = args.indexOf('--source')
if (sourceIndex === -1 || args[sourceIndex + 1] === undefined) {
  process.stderr.write('Uso: node scripts/process-auth-assets.mjs --source <carpeta>\n')
  process.exit(1)
}
const RAW = join(resolve(args[sourceIndex + 1]), 'raw')
const PUBLIC = resolve('public/assets')
const THEMES = ['dark', 'light']
const CELL = 96

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

// --- Escenas: se copian tal cual --------------------------------------------
process.stdout.write('escenas\n')
for (const file of readdirSync(RAW).filter((name) => /^bg-auth-.+\.png$/u.test(name))) {
  copyFileSync(join(RAW, file), join(ensure('auth/backgrounds'), file))
}

// --- Esquinas de panel: las del kit de Misiones ------------------------------
process.stdout.write('esquinas\n')
for (const theme of THEMES) {
  for (const corner of ['corner-tl', 'corner-tr']) {
    copyFileSync(
      join(PUBLIC, 'missions/ui', `${corner}-${theme}.png`),
      join(ensure('auth/ui'), `${corner}-${theme}.png`),
    )
  }
}

// --- Sellos del asistente y marco del avatar ---------------------------------
const SEALS = ['personal', 'avatar', 'security', 'terms']
process.stdout.write('sellos\n')
for (const theme of THEMES) {
  const sheet = readPng(join(RAW, `seals-${theme}.png`))
  const boxes = components(sheet)
  // El marco es la pieza mas alta; los sellos, las cuatro mayores restantes en
  // la fila superior, de izquierda a derecha.
  const frame = boxes.reduce((tall, box) => (box.h > tall.h ? box : tall))
  const seals = boxes
    .filter((box) => box !== frame)
    .sort((a, b) => b.w * b.h - a.w * a.h)
    .slice(0, SEALS.length)
    .sort((a, b) => a.x - b.x)
  if (seals.length !== SEALS.length) {
    throw new Error(`seals-${theme}: se esperaban ${String(SEALS.length)} sellos`)
  }
  seals.forEach((box, index) => {
    write(
      'auth/ui',
      `seal-${SEALS[index] ?? ''}-${theme}.png`,
      crop(sheet, box.x, box.y, box.w, box.h),
    )
  })
  write('auth/ui', `avatar-frame-${theme}.png`, crop(sheet, frame.x, frame.y, frame.w, frame.h))
}

// --- Iconos de las pantallas (hoja A) ----------------------------------------
/** @type {(string | null)[]} */
const AUTH_ICONS = [
  'user',
  'mail',
  'lock',
  'key',
  'shield',
  'eye',
  'eye-off',
  'scroll',
  'portrait',
  'question',
  'check',
  'alert',
  'hourglass',
  'authenticator',
  'exit',
  'bell',
]
// --- Iconos de notificaciones (hoja B) ---------------------------------------
/** @type {(string | null)[]} */
const NOTIFICATION_ICONS = [
  'catalog',
  'auction',
  'loot',
  'system',
  'credits',
  null,
  'battle',
  'victory',
  null,
  'expiring',
  null,
  'sanction',
  'confirmed',
  'banner',
  'new',
  null,
]
process.stdout.write('iconos\n')
for (const theme of THEMES) {
  for (const { name, png } of cropGrid(
    readPng(join(RAW, `icons-a-${theme}.png`)),
    AUTH_ICONS,
    CELL,
  )) {
    write('auth/icons', `icon-${name}-${theme}.png`, png)
  }
  for (const { name, png } of cropGrid(
    readPng(join(RAW, `icons-b-${theme}.png`)),
    NOTIFICATION_ICONS,
    CELL,
  )) {
    write('notifications/icons', `icon-${name}-${theme}.png`, png)
  }
}

// --- Correos: cabecera e iconos claros ---------------------------------------
const EMAIL_ICONS_A = ['user', 'mail', 'lock', 'key', 'shield', 'check', 'alert']
const EMAIL_ICONS_B = ['catalog', 'auction', 'loot', 'credits', 'sanction', 'confirmed']
process.stdout.write('correos\n')
copyFileSync(join(RAW, 'email-header-light.png'), join(ensure('email'), 'header.png'))
for (const { name, png } of cropGrid(readPng(join(RAW, 'icons-a-light.png')), AUTH_ICONS, CELL)) {
  if (EMAIL_ICONS_A.includes(name)) write('email', `icon-${name}.png`, png)
}
for (const { name, png } of cropGrid(
  readPng(join(RAW, 'icons-b-light.png')),
  NOTIFICATION_ICONS,
  CELL,
)) {
  if (EMAIL_ICONS_B.includes(name)) write('email', `icon-${name}.png`, png)
}
