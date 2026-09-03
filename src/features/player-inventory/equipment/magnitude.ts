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
