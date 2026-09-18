import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { BattleRoomCard } from './BattleRoomCard'
import type { BattleRoom } from './types'

const room = (overrides: Partial<BattleRoom> = {}): BattleRoom => ({
  id: 'e5f0d655-cd1f-411b-8350-2a5dc6e5ced6',
  mode: 'PVP',
  status: 'WAITING_FOR_PLAYERS',
  teams: [
    { label: 'A', capacity: 2, participants: [{ kind: 'HUMAN', playerId: 'p1', heroId: null, joinedAt: '2026-01-01' }] },
    { label: 'B', capacity: 2, participants: [] },
  ],
  reward: { amount: 2_000 },
  createdBy: 'sujeto-ana',
  createdAt: '2026-01-01T00:00:00.000Z',
  version: 0,
  ...overrides,
})

describe('BattleRoomCard', () => {
  it('NO renderiza el UUID tecnico como texto visible', () => {
    render(
      <ul>
        <BattleRoomCard room={room()} isOwn={false} cancelling={false} onCancel={vi.fn()} />
      </ul>,
    )

    expect(screen.queryByText(room().id, { exact: false })).not.toBeInTheDocument()
    expect(screen.queryByText(/^Sala /u)).not.toBeInTheDocument()
  })

  /**
   * Refinamiento final (segunda vuelta): un `title` HTML tambien es visible
   * -aparece como tooltip nativo al pasar el mouse-, asi que dejarlo ahi
   * habria violado la misma regla que retirar el texto. Se comprueba
   * explicitamente que NINGUN elemento de la tarjeta expone el UUID via
   * `title`/tooltip, ademas de por texto.
   */
  it('NO expone el UUID como tooltip/title en ningun elemento de la tarjeta', () => {
    const { container } = render(
      <ul>
        <BattleRoomCard room={room()} isOwn={false} cancelling={false} onCancel={vi.fn()} />
      </ul>,
    )

    expect(screen.queryByTitle(room().id)).not.toBeInTheDocument()

    const elementsWithTitle = container.querySelectorAll('[title]')
    for (const element of elementsWithTitle) {
      expect(element.getAttribute('title')).not.toBe(room().id)
    }
  })

  /**
   * El id sigue en el DOM, pero exclusivamente en `data-testid`: un atributo
   * que ninguna persona ve al usar la pantalla (no es texto, no es tooltip),
   * presente solo para que las pruebas localicen una tarjeta concreta sin
   * depender de contenido visible que puede repetirse entre salas distintas.
   */
  it('conserva el id tecnico en data-testid, invisible para quien usa la pantalla', () => {
    render(
      <ul>
        <BattleRoomCard room={room()} isOwn={false} cancelling={false} onCancel={vi.fn()} />
      </ul>,
    )

    expect(screen.getByTestId(`battle-room-${room().id}`)).toBeInTheDocument()
  })

  it('conserva modalidad, estado, ocupacion y recompensa reales', () => {
    render(
      <ul>
        <BattleRoomCard room={room()} isOwn={false} cancelling={false} onCancel={vi.fn()} />
      </ul>,
    )

    expect(screen.getByText(/Jugador vs Jugador/u)).toBeInTheDocument()
    expect(screen.getByText('Esperando jugadores')).toBeInTheDocument()
    expect(screen.getByText(/1\/4 jugadores/u)).toBeInTheDocument()
    expect(screen.getByText('2.000')).toBeInTheDocument()
  })

  it('usa el id real de la sala al pedir la cancelacion, aunque no se muestre visualmente', () => {
    const onCancel = vi.fn()
    render(
      <ul>
        <BattleRoomCard room={room()} isOwn onCancel={onCancel} cancelling={false} />
      </ul>,
    )

    screen.getByRole('button', { name: 'Cancelar' }).click()

    expect(onCancel).toHaveBeenCalledWith(room().id)
  })

  it('"Unirse" permanece deshabilitado (HU-15 fuera de alcance)', () => {
    render(
      <ul>
        <BattleRoomCard room={room()} isOwn={false} cancelling={false} onCancel={vi.fn()} />
      </ul>,
    )

    expect(screen.getByRole('button', { name: /Unirse/u })).toBeDisabled()
  })
})
