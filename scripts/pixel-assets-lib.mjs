/**
 * Utilidades compartidas por los scripts que derivan los assets de PixelLab de
 * cada remaster (`process-missions-assets.mjs`, `process-auth-assets.mjs`).
 * Todo es pixel art: ningun paso reescala ni suaviza.
 */
import { readFileSync } from 'node:fs'
import { PNG } from 'pngjs'

/** @typedef {{ x: number, y: number, w: number, h: number }} Box */

/** @param {string} path @returns {PNG} */
export const readPng = (path) => PNG.sync.read(readFileSync(path))

/**
 * @param {PNG} png
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @returns {PNG}
 */
export const crop = (png, x, y, width, height) => {
  const out = new PNG({ width, height })
  PNG.bitblt(png, out, x, y, width, height, 0, 0)
  return out
}

/**
 * Cajas de las piezas opacas de la imagen (vecindad de 8). Las piezas de menos
 * de 40 pixeles (motas sueltas) se descartan.
 * @param {PNG} png
 * @returns {Box[]}
 */
export const components = (png) => {
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

/**
 * Recorta una hoja en cuadricula de 4 columnas: devuelve cada celda con su
 * nombre, saltando las celdas sin nombre (`null`).
 * @param {PNG} sheet
 * @param {(string | null)[]} names
 * @param {number} cell
 * @returns {{ name: string, png: PNG }[]}
 */
export const cropGrid = (sheet, names, cell) =>
  names.flatMap((name, index) => {
    if (name === null) return []
    const x = (index % 4) * cell
    const y = ((index - (index % 4)) / 4) * cell
    return [{ name, png: crop(sheet, x, y, cell, cell) }]
  })
