import { describe, expect, it } from 'vitest'

import { describePower, type HeroPower } from './power'

describe('describePower (HU-11)', () => {
  it.each([
    [6, 10, 60, '6/10', '6 de 10'],
    [10, 10, 100, '10/10', '10 de 10'],
    [0, 10, 0, '0/10', '0 de 10'],
    [3, 8, 37.5, '3/8', '3 de 8'],
    [12, 12, 100, '12/12', '12 de 12'],
  ])('con %i de %i muestra %s%% y el texto %s', (current, max, percent, text, spoken) => {
    expect(describePower({ current, max })).toEqual({
      valid: true,
      current,
      max,
      percent,
      text,
      spoken,
    })
  })

  it('un héroe con Poder máximo 0 es válido y la barra queda vacía, sin dividir entre cero', () => {
    expect(describePower({ current: 0, max: 0 })).toEqual({
      valid: true,
      current: 0,
      max: 0,
      percent: 0,
      text: '0/0',
      spoken: '0 de 0',
    })
  })

  it.each([
    ['actual mayor que el máximo', { current: 11, max: 10 }],
    ['actual negativo', { current: -1, max: 10 }],
    ['máximo negativo', { current: 0, max: -1 }],
    ['actual decimal', { current: 1.5, max: 10 }],
    ['máximo decimal', { current: 1, max: 10.5 }],
    ['actual no finito', { current: Number.NaN, max: 10 }],
    ['máximo infinito', { current: 1, max: Number.POSITIVE_INFINITY }],
    ['actual como texto', { current: '6', max: 10 }],
    ['actual nulo', { current: null, max: 10 }],
    ['máximo ausente', { current: 3 }],
  ])('no presenta un dato roto (%s): dice que no está disponible', (_case, raw) => {
    expect(describePower(raw as unknown as HeroPower)).toEqual({ valid: false })
  })
})
