#!/usr/bin/env node
/**
 * Derivados del remaster visual de Misiones (EN-031) a partir de lo que
 * PixelLab entrego. Mismo papel que `extract-auction-asset-kit.ps1` en
 * Subasta: los originales NUNCA se modifican, solo se recortan y se copian a
 * `public/assets/missions/`.
 *
 *   node scripts/process-missions-assets.mjs --source <carpeta>
 *
 * La carpeta de origen tiene:
 *   raw/bg-missions-<pantalla>-<tema>.png   fondos de pagina (688x384)
 *   raw/scene-<mision>-<tema>.png            escenas de cada `imageRef`
 *   raw/ornaments-<tema>.png                 kit de ornamentos (4 esquinas,
 *                                            separador y medallon)
 *   raw/icons-<hoja>-<tema>.png              hojas de iconos 4x4 (celdas 96px)
 *   chars/<slug>/*.json + *.png              hoja de personaje de PixelLab
 *                                            (`/spritesheet`), con su layout
 *
 * Todo es pixel art: ningun paso reescala ni suaviza.
 */
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { PNG } from 'pngjs'

const args = process.argv.slice(2)
const sourceIndex = args.indexOf('--source')
if (sourceIndex === -1 || args[sourceIndex + 1] === undefined) {
  process.stderr.write('Uso: node scripts/process-missions-assets.mjs --source <carpeta>\n')
  process.exit(1)
}
const SOURCE = resolve(args[sourceIndex + 1])
const OUT = resolve('public/assets/missions')
const THEMES = ['dark', 'light']

/**
 * @typedef {{ x: number, y: number, w: number, h: number }} Box
 * @typedef {{ row: number, type: string, frame_count: number, animation?: string, direction?: string }} SheetRow
 * @typedef {{ path: string, cell_size: { width: number, height: number }, rows: SheetRow[] }} SheetLayout
 */

/** @param {string} path @returns {PNG} */
const read = (path) => PNG.sync.read(readFileSync(path))
/** @param {string} path @param {PNG} png */
const write = (path, png) => {
  writeFileSync(path, PNG.sync.write(png))
  process.stdout.write(`   ${path.slice(OUT.length + 1)}\n`)
}
/**
 * @param {PNG} png
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @returns {PNG}
 */
const crop = (png, x, y, width, height) => {
  const out = new PNG({ width, height })
  PNG.bitblt(png, out, x, y, width, height, 0, 0)
  return out
}
/** @param {string} dir @returns {string} */
const ensure = (dir) => {
  mkdirSync(join(OUT, dir), { recursive: true })
  return join(OUT, dir)
}

// --- Fondos y escenas: se copian tal cual -----------------------------------
const raw = join(SOURCE, 'raw')
const rawFiles = readdirSync(raw)
process.stdout.write('fondos y escenas\n')
for (const file of rawFiles.filter((name) => /^bg-missions-.+\.png$/u.test(name))) {
  copyFileSync(join(raw, file), join(ensure('backgrounds'), file))
}
for (const file of rawFiles.filter((name) => /^scene-.+\.png$/u.test(name))) {
  copyFileSync(join(raw, file), join(ensure('scenes'), file))
}

// --- Ornamentos: componentes conexos del canal alfa -------------------------
/**
 * Cajas de las piezas opacas de la imagen (vecindad de 8).
 * @param {PNG} png
 * @returns {Box[]}
 */
const components = (png) => {
  const { width, height, data } = png
  const seen = new Uint8Array(width * height)
  /** @type {Box[]} */
  const boxes = []
  for (let start = 0; start < width * height; start++) {
    if (seen[start] === 1 || data[start * 4 + 3] < 16) continue
    const stack = [start]
    seen[start] = 1
    let [minX, minY, maxX, maxY, count] = [width, height, 0, 0, 0]
    for (let index = stack.pop(); index !== undefined; index = stack.pop()) {
      const x = index % width
      const y = (index - x) / width
      count++
      minX = x < minX ? x : minX
      minY = y < minY ? y : minY
      maxX = x > maxX ? x : maxX
      maxY = y > maxY ? y : maxY
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          const next = ny * width + nx
          if (seen[next] === 0 && data[next * 4 + 3] >= 16) {
            seen[next] = 1
            stack.push(next)
          }
        }
      }
    }
    if (count >= 40) boxes.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 })
  }
  return boxes
}

process.stdout.write('ornamentos\n')
for (const theme of THEMES) {
  const kit = read(join(raw, `ornaments-${theme}.png`))
  const boxes = components(kit)
  const divider = boxes.reduce((wide, box) => (box.w > wide.w ? box : wide))
  const corners = boxes.filter((box) => box !== divider && box.w < kit.width / 3)
  const topLeft = corners.find((box) => box.x < kit.width / 2 && box.y < kit.height / 2)
  const topRight = corners.find((box) => box.x >= kit.width / 2 && box.y < kit.height / 2)
  if (topLeft === undefined || topRight === undefined) {
    throw new Error(`ornaments-${theme}: no se encontraron las esquinas superiores`)
  }
  const dir = ensure('ui')
  write(join(dir, `corner-tl-${theme}.png`), crop(kit, topLeft.x, topLeft.y, topLeft.w, topLeft.h))
  write(
    join(dir, `corner-tr-${theme}.png`),
    crop(kit, topRight.x, topRight.y, topRight.w, topRight.h),
  )
  write(join(dir, `divider-${theme}.png`), crop(kit, divider.x, divider.y, divider.w, divider.h))
}

// --- Iconos: hojas 4x4 de celdas de 96 px -----------------------------------
/** @type {Record<string, (string | null)[]>} */
const ICON_SHEETS = {
  a: [
    'story',
    'challenge',
    'exploration',
    'timer',
    'hero',
    'power',
    'chest',
    'xp',
    null,
    'epic',
    'boss',
    'master',
    'enemy',
    'objective',
    null,
    'difficulty',
  ],
  b: [
    null,
    'victory',
    'defeat',
    'lock',
    'check',
    'report',
    'loot',
    'heal',
    'map',
    'history',
    null,
    'ability',
    null,
    null,
    null,
    null,
  ],
}
const CELL = 96
process.stdout.write('iconos\n')
for (const [sheet, names] of Object.entries(ICON_SHEETS)) {
  for (const theme of THEMES) {
    const file = join(raw, `icons-${sheet}-${theme}.png`)
    if (!rawFiles.includes(`icons-${sheet}-${theme}.png`)) {
      process.stderr.write(`  (falta ${file})\n`)
      continue
    }
    const png = read(file)
    names.forEach((name, index) => {
      if (name === null) return
      const x = (index % 4) * CELL
      const y = ((index - (index % 4)) / 4) * CELL
      write(join(ensure('icons'), `icon-${name}-${theme}.png`), crop(png, x, y, CELL, CELL))
    })
  }
}

// --- Sprites: tiras horizontales por animacion -------------------------------
const DIRECTION = 'south-west'

/**
 * El JSON que acompana a `/spritesheet` de PixelLab.
 * @param {unknown} value
 * @returns {value is { spritesheet: SheetLayout }}
 */
const isExport = (value) =>
  typeof value === 'object' &&
  value !== null &&
  'spritesheet' in value &&
  typeof value.spritesheet === 'object' &&
  value.spritesheet !== null &&
  'rows' in value.spritesheet &&
  Array.isArray(value.spritesheet.rows)
const chars = join(SOURCE, 'chars')
process.stdout.write('sprites\n')
for (const slug of readdirSync(chars)) {
  const dir = join(chars, slug)
  // Criaturas sin plantilla de animacion (una arana): un unico fotograma
  // estatico; el escenario las anima solo con CSS.
  if (readdirSync(dir).includes('still.png')) {
    // La imagen llega recortada a la figura; las celdas de PixelLab dejan
    // margen alrededor. Se centra en una celda 1,5 veces mayor, apoyada abajo,
    // para que su escala en el escenario sea la de los demas.
    const still = read(join(dir, 'still.png'))
    const side = still.width + still.width / 2
    const cell = new PNG({ width: side, height: side })
    PNG.bitblt(still, cell, 0, 0, still.width, still.height, still.width / 4, side - still.height)
    write(join(ensure('sprites'), `${slug}-idle.png`), cell)
    continue
  }
  const layoutFile = readdirSync(dir).find((name) => name.endsWith('.json'))
  if (layoutFile === undefined) continue
  /** @type {unknown} */
  const parsed = JSON.parse(readFileSync(join(dir, layoutFile), 'utf8'))
  if (!isExport(parsed)) throw new Error(`${slug}: ${layoutFile} no es un export de PixelLab`)
  const layout = parsed.spritesheet
  const sheet = read(join(dir, layout.path))
  const { width: cw, height: ch } = layout.cell_size
  for (const kind of ['idle', 'attack']) {
    const row = layout.rows.find(
      (candidate) =>
        candidate.type === 'animation' &&
        candidate.animation === kind &&
        candidate.direction === DIRECTION,
    )
    if (row === undefined) continue
    const strip = new PNG({ width: cw * row.frame_count, height: ch })
    for (let frame = 0; frame < row.frame_count; frame++) {
      PNG.bitblt(sheet, strip, frame * cw, row.row * ch, cw, ch, frame * cw, 0)
    }
    write(join(ensure('sprites'), `${slug}-${kind}.png`), strip)
  }
}
