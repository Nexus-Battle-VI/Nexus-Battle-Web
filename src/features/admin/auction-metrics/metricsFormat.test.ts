import { describe, expect, it } from 'vitest'

import {
  DASH,
  formatCredits,
  formatDuration,
  formatPeriodRange,
  formatRate,
  formatRealMoney,
  initialOf,
} from './metricsFormat'

describe('metricsFormat', () => {
  describe('formatRate', () => {
    it('muestra un porcentaje entero', () => {
      expect(formatRate(0.63)).toMatch(/^63\s?%$/u)
      expect(formatRate(1)).toMatch(/^100\s?%$/u)
    })

    it('0 es 0 %, pero sin denominador (null) es "—", nunca 0 %', () => {
      expect(formatRate(0)).toMatch(/^0\s?%$/u)
      expect(formatRate(null)).toBe(DASH)
    })
  })

  describe('formatCredits', () => {
    it.each([
      [1, '1 crédito'],
      [0, '0 créditos'],
      [2, '2 créditos'],
      [142.38, '142,38 créditos'],
      [0.5, '0,5 créditos'],
      [1234.5, '1.234,5 créditos'],
    ])('%s -> %s', (amount, text) => {
      expect(formatCredits(amount)).toBe(text)
      expect(formatCredits({ unit: 'CREDITS', amount })).toBe(text)
    })

    it('un importe ausente es "—"', () => {
      expect(formatCredits(null)).toBe(DASH)
    })
  })

  describe('formatRealMoney', () => {
    it('convierte la unidad minima de SU moneda, sin llamarla credito', () => {
      const cop = formatRealMoney({ unit: 'REAL_MONEY', currency: 'COP', amountMinor: 4500000 })
      const usd = formatRealMoney({ unit: 'REAL_MONEY', currency: 'USD', amountMinor: 990 })

      expect(cop).toMatch(/45\.000,00/u)
      expect(usd).toMatch(/9,90/u)
      expect(`${cop}${usd}`).not.toMatch(/crédito/u)
    })
  })

  describe('formatDuration', () => {
    it.each([
      [172800, '2 d'],
      [118240, '1 d 8 h'],
      [9420, '2 h 37 min'],
      [90, '1 min'],
      [41, '41 s'],
      [0, '0 s'],
      [null, DASH],
    ])('%s -> %s', (seconds, text) => {
      expect(formatDuration(seconds)).toBe(text)
    })
  })

  it('el rango del periodo lleva el año una vez, o ambos si cruza de año', () => {
    expect(formatPeriodRange('2026-09-07T00:00:00.000Z', '2026-10-05T00:00:00.000Z')).toMatch(
      /^7\D+ – 5\D+oct\D*de 2026$/u,
    )
    expect(formatPeriodRange('2025-12-20T00:00:00.000Z', '2026-01-10T00:00:00.000Z')).toMatch(
      /de 2025 – .* de 2026$/u,
    )
  })

  it('la inicial del producto es su primera letra, y vacio no revienta', () => {
    expect(initialOf('espada de hierro')).toBe('E')
    expect(initialOf('  Arco')).toBe('A')
    expect(initialOf('')).toBe('')
  })
})
