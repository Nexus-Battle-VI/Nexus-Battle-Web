import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AuctionCountdown } from './AuctionCountdown'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(Date.parse('2026-10-01T12:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('AuctionCountdown', () => {
  it('decrementa cada segundo sin tiempo negativo y termina en Finalizada', () => {
    render(<AuctionCountdown closesAt="2026-10-01T12:00:02.000Z" />)
    expect(screen.getByText('02s')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(screen.getByText('01s')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(screen.getByText('Finalizada')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(screen.getByText('Finalizada')).toBeInTheDocument()
    expect(screen.queryByText(/-/u)).not.toBeInTheDocument()
  })

  it('al desmontar libera el interval del reloj compartido', () => {
    const { unmount } = render(<AuctionCountdown closesAt="2026-10-02T12:00:00.000Z" />)
    expect(vi.getTimerCount()).toBe(1)

    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('varias cuentas comparten un unico interval', () => {
    render(
      <>
        <AuctionCountdown closesAt="2026-10-01T13:00:00.000Z" />
        <AuctionCountdown closesAt="2026-10-01T12:00:30.000Z" />
      </>,
    )

    expect(vi.getTimerCount()).toBe(1)
    expect(screen.getByText('01h 00m 00s')).toBeInTheDocument()
    expect(screen.getByText('30s')).toBeInTheDocument()
  })
})
