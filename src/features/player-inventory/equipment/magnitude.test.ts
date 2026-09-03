import { describe, expect, it } from 'vitest'

import { formatMagnitude } from './magnitude'

describe('formatMagnitude', () => {
  it('no colapsa un dado a un número: 1d6 sigue siendo 1d6', () => {
    expect(formatMagnitude({ mode: 'DICE', count: 1, sides: 6 })).toBe('1d6')
  })

  it('muestra un valor fijo como número', () => {
    expect(formatMagnitude({ mode: 'FIXED', amount: 3 })).toBe('3')
  })

  it('muestra un porcentaje a partir de puntos básicos', () => {
    expect(formatMagnitude({ mode: 'PERCENTAGE', basisPoints: 2500 })).toBe('25%')
  })

  it('devuelve un guion cuando no hay magnitud', () => {
    expect(formatMagnitude(null)).toBe('—')
    expect(formatMagnitude(undefined)).toBe('—')
  })
})
