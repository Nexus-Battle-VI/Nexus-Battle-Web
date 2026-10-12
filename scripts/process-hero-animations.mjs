#!/usr/bin/env node
/**
 * Animaciones de heroe generadas con PixelLab (EN-031): ataque de los ocho heroes
 * y los reposos/golpes que el pack original no traia. Los PNG originales del
 * export NUNCA se modifican (sus SHA-256 estan en `provenance.json`).
 *
 *   node scripts/process-hero-animations.mjs --source <carpeta>
 *
 * La carpeta de origen tiene `raw/<heroe>/<tipo>-<direccion>/frame-NN.png`, lo
 * que devuelve `animate_image` (el 00 es la pose de partida; se usan los 8
 * siguientes, que ya vuelven a la postura).
 *
 * Por cada heroe se escribe `public/assets/heroes/sprites/<carpeta>/en031-<heroe>.png`:
 * la hoja original con una fila nueva debajo por cada animacion añadida, y
 * `hero-sprites.json` pasa a apuntar a ella con las animaciones nuevas. Es
 * idempotente: siempre parte de la hoja ORIGINAL (la que no empieza por `en031-`)
 * y de las animaciones originales (las que el export declara en su JSON).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { PNG } from 'pngjs'

const args = process.argv.slice(2)
const sourceIndex = args.indexOf('--source')
if (sourceIndex === -1 || args[sourceIndex + 1] === undefined) {
  process.stderr.write('Uso: node scripts/process-hero-animations.mjs --source <carpeta>\n')
  process.exit(1)
}
const RAW = join(resolve(args[sourceIndex + 1]), 'raw')
const MANIFEST = resolve('src/shared/visual-library/heroes/hero-sprites.json')
const PUBLIC = resolve('public')
const PREFIX = 'en031-'
/** Fotogramas que se toman de cada animacion generada (sin la pose de partida). */
const FRAMES = 8

/** @typedef {{ row: number, col: number, count: number }} Sequence */
/** @typedef {{ kind: string, directions: Record<string, Sequence> }} Animation */
/**
 * @typedef {{
 *   name: string,
 *   characterId: string,
 *   image: string,
 *   cell: { width: number, height: number },
 *   sheet: { width: number, height: number },
 *   animations: Animation[],
 * }} HeroSpec
 */

/** @type {unknown} */
const parsedManifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
const manifest = /** @type {Record<string, HeroSpec>} */ (parsedManifest)

for (const [heroId, spec] of Object.entries(manifest)) {
  const folder = dirname(join(PUBLIC, spec.image))
  const original = readdirSync(folder).find(
    (name) => name.endsWith('.png') && !name.startsWith(PREFIX),
  )
  if (original === undefined) throw new Error(`${heroId}: sin hoja original`)

  // Animaciones del export (las del JSON original), sin las añadidas antes.
  /** @type {unknown} */
  const parsedExport = JSON.parse(
    readFileSync(join(folder, original.replace(/\.png$/u, '.json')), 'utf8'),
  )
  const exportJson = /** @type {{ spritesheet: { rows: unknown[] } }} */ (parsedExport)
  const exportRows = exportJson.spritesheet.rows.length
  /** @type {Animation[]} */
  const animations = spec.animations
    .map((animation) => ({
      ...animation,
      directions: Object.fromEntries(
        Object.entries(animation.directions).filter(([, sequence]) => sequence.row < exportRows),
      ),
    }))
    .filter((animation) => Object.keys(animation.directions).length > 0)

  const dir = join(RAW, heroId)
  const added = existsSync(dir) ? readdirSync(dir).sort() : []
  const sheet = PNG.sync.read(readFileSync(join(folder, original)))
  const { width: cw, height: ch } = spec.cell
  const columns = sheet.width / cw
  if (columns < FRAMES) throw new Error(`${heroId}: la hoja tiene ${String(columns)} columnas`)

  const out = new PNG({ width: sheet.width, height: sheet.height + added.length * ch })
  PNG.bitblt(sheet, out, 0, 0, sheet.width, sheet.height, 0, 0)

  added.forEach((entry, index) => {
    const [kind = '', ...rest] = entry.split('-')
    const direction = rest.join('-')
    const frames = readdirSync(join(dir, entry))
      .filter((name) => /^frame-\d+\.png$/u.test(name))
      .sort()
      .slice(1, FRAMES + 1)
    if (frames.length !== FRAMES)
      throw new Error(`${heroId}/${entry}: ${String(frames.length)} fotogramas`)
    const row = exportRows + index
    frames.forEach((name, col) => {
      const frame = PNG.sync.read(readFileSync(join(dir, entry, name)))
      if (frame.width !== cw || frame.height !== ch)
        throw new Error(`${heroId}/${entry}: celda ${String(frame.width)}`)
      PNG.bitblt(frame, out, 0, 0, cw, ch, col * cw, row * ch)
    })
    let animation = animations.find((candidate) => candidate.kind === kind)
    if (animation === undefined) {
      animation = { kind, directions: {} }
      animations.push(animation)
    }
    animation.directions[direction] = { row, col: 0, count: FRAMES }
  })

  const target = added.length === 0 ? original : `${PREFIX}${heroId}.png`
  if (added.length > 0) writeFileSync(join(folder, target), PNG.sync.write(out))
  const imageDir = dirname(spec.image)
  manifest[heroId] = {
    ...spec,
    image: `${imageDir}/${basename(target)}`,
    sheet: { width: out.width, height: added.length === 0 ? sheet.height : out.height },
    animations,
  }
  process.stdout.write(`   ${heroId}: +${String(added.length)} (${added.join(', ')})\n`)
}

writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`)
