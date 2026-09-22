import { describe, expect, it } from 'vitest'

import {
  createServerClock,
  formatRemaining,
  remainingMs,
  timeWarning,
  type ServerClock,
} from './battleClock'

const clockAt = (iso: string, monotonic: number): ServerClock => {
  const clock = createServerClock(iso, monotonic)

  if (clock === null) {
    throw new Error('reloj invalido')
  }

  return clock
}

/**
 * Reloj de visualizacion (HU-21, contrato §6.4): convierte `deadlines` a tiempo
 * restante con el instante del servidor y un reloj monotono, sin `Date.now()` y
 * sin ser autoridad. Llegar a 0 solo deja el texto en 0:00.
 */
const SERVER = '2026-09-21T10:00:00.000Z'
const DEADLINE = '2026-09-21T10:00:30.000Z'

describe('createServerClock', () => {
  it('acepta un ISO valido y rechaza uno invalido', () => {
    expect(createServerClock(SERVER, 100)).toEqual({
      serverAtSyncMs: Date.parse(SERVER),
      monotonicAtSyncMs: 100,
    })
    expect(createServerClock('luego', 100)).toBeNull()
  })
})

describe('remainingMs', () => {
  it('calcula el restante con el reloj proyectado', () => {
    const clock = clockAt(SERVER, 1_000)

    expect(remainingMs(DEADLINE, clock, 1_000)).toBe(30_000)
    expect(remainingMs(DEADLINE, clock, 11_000)).toBe(20_000)
  })

  it('nunca es negativo, aunque el monotono avance de mas', () => {
    const clock = clockAt(SERVER, 1_000)

    expect(remainingMs(DEADLINE, clock, 999_999)).toBe(0)
  })

  it('un deadline invalido se trata como vencido', () => {
    const clock = clockAt(SERVER, 0)

    expect(remainingMs('luego', clock, 0)).toBe(0)
  })
})

describe('formatRemaining', () => {
  it.each([
    [0, '0:00'],
    [1, '0:01'],
    [24_000, '0:24'],
    [59_999, '1:00'],
    [359_000, '5:59'],
    [360_000, '6:00'],
  ])('formatea %i ms como %s', (ms, expected) => {
    expect(formatRemaining(ms)).toBe(expected)
  })
})

describe('timeWarning', () => {
  it.each([
    [10_001, 'none'],
    [10_000, 'low'],
    [5_001, 'low'],
    [5_000, 'critical'],
    [0, 'critical'],
  ] as const)('con %i ms devuelve %s', (ms, expected) => {
    expect(timeWarning(ms)).toBe(expected)
  })
})
