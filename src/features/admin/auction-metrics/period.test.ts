import { describe, expect, it } from 'vitest'

import {
  allowsDailyGranularity,
  presetDraft,
  presetPeriod,
  resolvePeriod,
  spanInDays,
  type PeriodDraft,
} from './period'

const NOW = new Date('2026-10-06T15:20:11.000Z')

const custom = (from: string, to: string): PeriodDraft => ({ preset: 'custom', from, to })

describe('period', () => {
  it('un rango predefinido termina en el instante actual y retrocede N dias', () => {
    expect(presetPeriod('30', NOW)).toEqual({
      from: '2026-09-06T15:20:11.000Z',
      to: '2026-10-06T15:20:11.000Z',
    })
    expect(presetPeriod('7', NOW).from).toBe('2026-09-29T15:20:11.000Z')
    expect(presetPeriod('90', NOW).from).toBe('2026-07-08T15:20:11.000Z')
  })

  it('el borrador predefinido muestra las fechas UTC de ese rango', () => {
    expect(presetDraft('7', NOW)).toEqual({ preset: '7', from: '2026-09-29', to: '2026-10-06' })
  })

  it('un rango personalizado conserva las fechas a las 00:00 UTC (hasta exclusivo)', () => {
    expect(resolvePeriod(custom('2026-09-07', '2026-10-05'), NOW)).toEqual({
      from: '2026-09-07T00:00:00.000Z',
      to: '2026-10-05T00:00:00.000Z',
    })
  })

  it.each([
    ['vacio', '', ''],
    ['fecha imposible', '2026-02-30', '2026-03-05'],
    ['formato distinto', '07/09/2026', '2026-10-05'],
    ['desde = hasta', '2026-09-07', '2026-09-07'],
    ['desde > hasta', '2026-10-05', '2026-09-07'],
    ['mas de 366 dias', '2025-01-01', '2026-10-05'],
  ])('rechaza %s', (_name, from, to) => {
    expect(resolvePeriod(custom(from, to), NOW)).toBeNull()
  })

  it('admite exactamente 366 dias y rechaza 367', () => {
    expect(resolvePeriod(custom('2025-10-05', '2026-10-06'), NOW)).not.toBeNull()
    expect(resolvePeriod(custom('2025-10-04', '2026-10-06'), NOW)).toBeNull()
  })

  it('"Día" solo se admite hasta 92 dias', () => {
    const period = (days: number) => presetPeriod('90', new Date(NOW.getTime() + days * 86_400_000))

    expect(spanInDays(presetPeriod('90', NOW))).toBe(90)
    expect(allowsDailyGranularity(period(0))).toBe(true)
    expect(
      allowsDailyGranularity({ from: '2026-01-01T00:00:00.000Z', to: '2026-04-03T00:00:00.000Z' }),
    ).toBe(true)
    expect(
      allowsDailyGranularity({ from: '2026-01-01T00:00:00.000Z', to: '2026-04-04T00:00:00.000Z' }),
    ).toBe(false)
  })
})
