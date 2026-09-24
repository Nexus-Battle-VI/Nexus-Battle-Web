import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { countdownLabel, delayUntil, remainingAt, useCountdown } from './countdown'

afterEach(() => {
  vi.useRealTimers()
})

describe('cuentas regresivas', () => {
  it('descuenta solo los segundos enteros que pasaron desde la respuesta', () => {
    expect(remainingAt(600, 1_000, 1_000)).toBe(600)
    expect(remainingAt(600, 1_000, 2_999)).toBe(599)
    expect(remainingAt(600, 1_000, 61_000)).toBe(540)
    // Nunca negativo, y un reloj atrasado respecto de la respuesta no suma tiempo.
    expect(remainingAt(5, 0, 60_000)).toBe(0)
    expect(remainingAt(5, 10_000, 0)).toBe(5)
  })

  it('escribe minutos y segundos, u horas y minutos', () => {
    expect(countdownLabel(598)).toBe('9:58')
    expect(countdownLabel(59)).toBe('0:59')
    expect(countdownLabel(0)).toBe('0:00')
    expect(countdownLabel(-3)).toBe('0:00')
    expect(countdownLabel(7_500)).toBe('2 h 05 min')
  })

  it('acota la espera hasta una fecha entre 1 s y 60 s', () => {
    const now = Date.parse('2026-10-01T15:00:00Z')

    expect(delayUntil(null, now)).toBeNull()
    expect(delayUntil('no es fecha', now)).toBeNull()
    expect(delayUntil('2026-10-01T15:00:10Z', now)).toBe(10_000)
    expect(delayUntil('2026-10-01T14:59:00Z', now)).toBe(1_000)
    expect(delayUntil('2026-10-01T16:00:00Z', now)).toBe(60_000)
  })

  it('la cuenta baja cada segundo sin volver a preguntar', () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.parse('2026-10-01T15:00:00Z'))
    const receivedAt = Date.now()

    const { result } = renderHook(() => useCountdown(120, receivedAt))
    expect(result.current).toBe(120)

    act(() => {
      vi.advanceTimersByTime(3_000)
    })
    expect(result.current).toBe(117)
  })

  it('sin segundos del servidor no hay cuenta', () => {
    const { result } = renderHook(() => useCountdown(null, 0))

    expect(result.current).toBeNull()
  })
})
