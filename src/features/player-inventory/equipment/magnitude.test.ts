import { describe, expect, it } from 'vitest'

import { describeMagnitudeRange, formatMagnitude } from './magnitude'

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

describe('describeMagnitudeRange — traduccion para personas, sin tirar dados', () => {
  it('1d4: un dado de 4 caras, rango base 1–4 por golpe', () => {
    expect(describeMagnitudeRange({ mode: 'DICE', count: 1, sides: 4 })).toBe(
      '1 dado de 4 caras · Rango base: 1–4 por golpe',
    )
  })

  it('2d6: dos dados de 6 caras, rango base 2–12 por golpe', () => {
    expect(describeMagnitudeRange({ mode: 'DICE', count: 2, sides: 6 })).toBe(
      '2 dados de 6 caras · Rango base: 2–12 por golpe',
    )
  })

  it('un valor fijo se dice como base por golpe, sin rango', () => {
    expect(describeMagnitudeRange({ mode: 'FIXED', amount: 3 })).toBe('Base: 3 por golpe')
  })

  it('la unidad se puede cambiar (sanacion: por uso)', () => {
    expect(describeMagnitudeRange({ mode: 'DICE', count: 1, sides: 6 }, 'use')).toBe(
      '1 dado de 6 caras · Rango base: 1–6 por uso',
    )
  })

  it('un porcentaje no se convierte en un resultado inventado', () => {
    expect(describeMagnitudeRange({ mode: 'PERCENTAGE', basisPoints: 2500 })).toBe(
      '25 % del valor de referencia',
    )
  })

  it('sin magnitud o con un dado mal formado no hay texto', () => {
    expect(describeMagnitudeRange(null)).toBeNull()
    expect(describeMagnitudeRange({ mode: 'DICE', count: 0, sides: 4 })).toBeNull()
  })
})
