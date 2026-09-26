import { formatInteger } from '@/shared/i18n/format'
import { i18n } from '@/shared/i18n/i18n'

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

/** Unidad de la magnitud: el daño se da «por golpe», la sanación «por uso». */
export type MagnitudeUnit = 'hit' | 'use'

const UNIT_KEYS: Readonly<Record<MagnitudeUnit, string>> = {
  hit: 'inventory:magnitude.perHit',
  use: 'inventory:magnitude.perUse',
}

/**
 * Traduccion para personas de una magnitud BASE, sin tirar dados ni calcular
 * un resultado: un dado sigue siendo un rango ("1–4"), nunca un numero
 * inventado. `unit` es la unidad ("por golpe", "por uso").
 *
 * El texto sale del idioma activo; los numeros son exactamente los del
 * backend (`count`, `sides`, `amount`), el rango es su lectura directa.
 */
export const describeMagnitudeRange = (
  magnitude: Magnitude | null | undefined,
  unit: MagnitudeUnit = 'hit',
): string | null => {
  if (magnitude == null) return null

  const per = i18n.t(UNIT_KEYS[unit])

  if (magnitude.mode === 'DICE') {
    const count = magnitude.count ?? 0
    const sides = magnitude.sides ?? 0

    if (count <= 0 || sides <= 0) return null

    const dice = i18n.t('inventory:magnitude.dice', {
      count,
      value: formatInteger(count),
      sides: String(sides),
    })

    return i18n.t('inventory:magnitude.diceRange', {
      dice,
      min: String(count),
      max: String(count * sides),
      per,
    })
  }

  if (magnitude.mode === 'FIXED') {
    return i18n.t('inventory:magnitude.fixed', { amount: String(magnitude.amount ?? 0), per })
  }

  return i18n.t('inventory:magnitude.percent', {
    percent: String((magnitude.basisPoints ?? 0) / 100),
  })
}
