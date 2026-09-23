import type { Magnitude } from './api'

/**
 * Representa una magnitud canónica SIN colapsarla a un número: un dado sigue
 * siendo "1d6". HU-28 no ejecuta combate y la interfaz no debe fingir un
 * resultado numérico donde el backend entrega una tirada.
 */
export const formatMagnitude = (magnitude: Magnitude | null | undefined): string => {
  if (magnitude == null) return '—'
  if (magnitude.mode === 'FIXED') return String(magnitude.amount ?? 0)
  if (magnitude.mode === 'DICE') {
    return `${String(magnitude.count ?? 0)}d${String(magnitude.sides ?? 0)}`
  }
  return `${String((magnitude.basisPoints ?? 0) / 100)}%`
}

/**
 * Traduccion para personas de una magnitud BASE, sin tirar dados ni calcular
 * un resultado: un dado sigue siendo un rango ("1–4"), nunca un numero
 * inventado. `per` es la unidad ("por golpe", "por uso").
 *
 * - DICE `1d4` → "1 dado de 4 caras · Rango base: 1–4 por golpe"
 * - DICE `2d6` → "2 dados de 6 caras · Rango base: 2–12 por golpe"
 * - FIXED `3`  → "Base: 3 por golpe"
 * - PERCENTAGE → "25 % del valor de referencia"
 *
 * El minimo y el maximo son la aritmetica de la magnitud publicada
 * (`count` y `count × sides`), no una simulacion del combate.
 */
export const describeMagnitudeRange = (
  magnitude: Magnitude | null | undefined,
  per = 'por golpe',
): string | null => {
  if (magnitude == null) return null

  if (magnitude.mode === 'DICE') {
    const count = magnitude.count ?? 0
    const sides = magnitude.sides ?? 0

    if (count <= 0 || sides <= 0) return null

    const dice = count === 1 ? '1 dado' : `${String(count)} dados`

    return `${dice} de ${String(sides)} caras · Rango base: ${String(count)}–${String(count * sides)} ${per}`
  }

  if (magnitude.mode === 'FIXED') {
    return `Base: ${String(magnitude.amount ?? 0)} ${per}`
  }

  return `${String((magnitude.basisPoints ?? 0) / 100)} % del valor de referencia`
}
