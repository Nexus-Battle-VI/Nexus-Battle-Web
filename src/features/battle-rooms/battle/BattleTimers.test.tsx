import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BattleTimers } from './BattleTimers'
import { createServerClock } from './battleClock'
import { battle, withDeadlines } from './fixtures'

/**
 * Temporizadores de SOLO visualizacion (HU-21, contrato §6.4): el reloj monotono
 * se inyecta para que la cuenta atras sea determinista. Llegar a 0:00 no ejecuta
 * nada; la region `polite` anuncia los umbrales UNA vez.
 */
const SERVER = '2026-09-21T10:00:00.000Z'
const TURN_ENDS = '2026-09-21T10:00:30.000Z'
const BATTLE_ENDS = '2026-09-21T10:06:00.000Z'

const view = (): ReturnType<typeof withDeadlines> =>
  withDeadlines({
    ...battle(),
    currentTurn: { ...battle().currentTurn, displayName: 'Bruno' },
  })

describe('BattleTimers (HU-21)', () => {
  let nowMs = 0

  beforeEach(() => {
    vi.useFakeTimers()
    nowMs = 0
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const renderTimers = (isMyTurn = true): void => {
    render(
      <BattleTimers
        battle={view()}
        serverClock={createServerClock(SERVER, 0) ?? { serverAtSyncMs: 0, monotonicAtSyncMs: 0 }}
        isMyTurn={isMyTurn}
        synced
        monotonicNow={() => nowMs}
      />,
    )
  }

  it('muestra «Turno» + «0:30» y «Batalla» + «6:00», sin leer cada segundo', () => {
    renderTimers()

    // 5a pasada (secciones 32-34 del brief): la etiqueta visible ya NO
    // repite el nombre ("Tu turno"/"Bruno") -- siempre dice "Turno" (el
    // nombre ya esta arriba, en "Nexus · Arena"). El `aria-label` real
    // (accesible) SI sigue diciendo de quien es el turno.
    const turnTimer = screen.getByRole('timer', { name: 'Tiempo de tu turno' })
    expect(turnTimer).toHaveTextContent('Turno')
    expect(turnTimer).toHaveTextContent('0:30')
    const battleTimer = screen.getByRole('timer', { name: 'Tiempo de batalla' })
    expect(battleTimer).toHaveTextContent('Batalla')
    expect(battleTimer).toHaveTextContent('6:00')

    for (const timer of screen.getAllByRole('timer')) {
      expect(timer).toHaveAttribute('aria-live', 'off')
    }
  })

  it('la cuenta atras avanza con el reloj monotono', () => {
    renderTimers()

    nowMs = 1_000
    act(() => {
      vi.advanceTimersByTime(250)
    })

    expect(screen.getByRole('timer', { name: 'Tiempo de tu turno' })).toHaveTextContent('0:29')
  })

  it('anuncia los umbrales de 10 s y 5 s UNA sola vez, en una region polite aparte', () => {
    renderTimers()

    nowMs = 20_000
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(screen.getByRole('status')).toHaveTextContent('Quedan 10 segundos de tu turno')

    nowMs = 25_000
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(screen.getByRole('status')).toHaveTextContent('Quedan 5 segundos de tu turno')

    nowMs = 27_000
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(screen.getByRole('status')).toHaveTextContent('Quedan 5 segundos de tu turno')
  })

  it('al llegar a 0:00 deja el texto en 0:00 y «Esperando a Combat…» sin deshabilitar nada', () => {
    renderTimers()

    nowMs = 30_000
    act(() => {
      vi.advanceTimersByTime(250)
    })

    expect(screen.getByRole('timer', { name: 'Tiempo de tu turno' })).toHaveTextContent('0:00')
    expect(screen.getByText('Esperando a Combat…')).toBeInTheDocument()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('no se pinta sin deadlines (Combat anterior a HU-21) ni sin sincronizar', () => {
    const { rerender } = render(
      <BattleTimers
        battle={battle()}
        serverClock={{ serverAtSyncMs: 0, monotonicAtSyncMs: 0 }}
        isMyTurn
        synced
        monotonicNow={() => nowMs}
      />,
    )

    expect(screen.queryAllByRole('timer')).toHaveLength(0)

    rerender(
      <BattleTimers
        battle={view()}
        serverClock={{ serverAtSyncMs: 0, monotonicAtSyncMs: 0 }}
        isMyTurn
        synced={false}
        monotonicNow={() => nowMs}
      />,
    )
    expect(screen.queryAllByRole('timer')).toHaveLength(0)
  })

  it('el aviso critico no introduce animacion: solo color y texto (reduced-motion)', () => {
    renderTimers()

    nowMs = 26_000
    act(() => {
      vi.advanceTimersByTime(250)
    })

    for (const timer of screen.getAllByRole('timer')) {
      expect(timer.className).not.toMatch(/animate-/u)
    }
    expect(screen.getByRole('timer', { name: 'Tiempo de tu turno' }).className).toContain(
      'text-danger',
    )
  })

  it('con el turno del rival, el nombre sigue en el aria-label accesible (visualmente dice "Turno", nunca el nombre)', () => {
    renderTimers(false)

    // 5a pasada (seccion 32 del brief): "de quien le toca" ya NO se nombra
    // visualmente aqui (ya lo dice "Nexus · Arena" arriba) -- el
    // `aria-label` del `role="timer"` SI lo sigue diciendo, para quien usa
    // lector de pantalla.
    const turnTimer = screen.getByRole('timer', { name: 'Tiempo del turno de Bruno' })
    expect(turnTimer).toHaveTextContent('Turno')
    expect(turnTimer).toHaveTextContent('0:30')
    expect(screen.queryByText('Tu turno')).not.toBeInTheDocument()
  })

  it('los deadlines usados son los del contrato (turno 30 s, batalla 6 min)', () => {
    renderTimers()

    const labels = screen.getAllByRole('timer').map((timer) => timer.getAttribute('aria-label'))

    expect(labels).toEqual(['Tiempo de tu turno', 'Tiempo de batalla'])
    expect(TURN_ENDS).toBe('2026-09-21T10:00:30.000Z')
    expect(BATTLE_ENDS).toBe('2026-09-21T10:06:00.000Z')
  })
})
