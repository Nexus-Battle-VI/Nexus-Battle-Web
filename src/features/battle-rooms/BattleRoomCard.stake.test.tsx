import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'

import { BattleRoomCard, type BattleRoomCardProps } from './BattleRoomCard'
import type { BattleRoom } from './types'

const ROOM_ID = 'e5f0d655-cd1f-411b-8350-2a5dc6e5ced6'

const room = (overrides: Partial<BattleRoom> = {}): BattleRoom => ({
  id: ROOM_ID,
  mode: 'PVP',
  status: 'WAITING_FOR_PLAYERS',
  teams: [
    {
      label: 'A',
      capacity: 2,
      participants: [
        { kind: 'HUMAN', playerId: 'p1', heroId: null, joinedAt: '2026-01-01', displayName: 'Ana' },
      ],
    },
    { label: 'B', capacity: 2, participants: [] },
  ],
  reward: { amount: 2_000 },
  createdBy: 'sujeto-ana',
  createdAt: '2026-01-01T00:00:00.000Z',
  version: 0,
  ...overrides,
})

const renderCard = (roomValue: BattleRoom, onJoin = vi.fn()) => {
  const props: Omit<BattleRoomCardProps, 'room'> = {
    isOwn: false,
    isParticipant: false,
    cancelling: false,
    onCancel: vi.fn(),
    onJoin,
    joiningTeam: null,
    joinError: null,
  }

  render(
    <MemoryRouter>
      <ul>
        <BattleRoomCard room={roomValue} {...props} />
      </ul>
    </MemoryRouter>,
  )

  return onJoin
}

describe('BattleRoomCard — apuesta (HU-23)', () => {
  it('sin apuesta el boton une DIRECTAMENTE, como antes de HU-23 (regresion)', async () => {
    const onJoin = renderCard(room())
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /Unirse — Equipo A/u }))

    expect(onJoin).toHaveBeenCalledWith(ROOM_ID, 'A', null)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('con monto pide confirmacion antes de reservar y no une todavia', async () => {
    const onJoin = renderCard(room())
    const user = userEvent.setup()

    await user.clear(screen.getByLabelText('Apostar créditos (opcional)'))
    await user.type(screen.getByLabelText('Apostar créditos (opcional)'), '10')
    await user.click(screen.getByRole('button', { name: /Unirse — Equipo A/u }))

    expect(onJoin).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Vas a apostar 10 créditos; se reservarán de tu saldo al confirmar.',
    )

    await user.click(screen.getByRole('button', { name: 'Confirmar y unirse al equipo A' }))

    expect(onJoin).toHaveBeenCalledWith(ROOM_ID, 'A', 10)
  })

  it('un monto invalido se avisa y no une ni pide confirmacion', async () => {
    const onJoin = renderCard(room())
    const user = userEvent.setup()

    await user.clear(screen.getByLabelText('Apostar créditos (opcional)'))
    await user.type(screen.getByLabelText('Apostar créditos (opcional)'), '1.5')
    await user.click(screen.getByRole('button', { name: /Unirse — Equipo A/u }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/número entero/u)
    expect(onJoin).not.toHaveBeenCalled()
  })

  it('anuncia las apuestas activas con el total agregado, nunca el monto de un rival', () => {
    renderCard(room({ stakePool: { total: 20 } }))

    expect(screen.getByText('Apuestas activas: 20 créditos')).toBeInTheDocument()
  })

  it('sin apuestas en la sala (o con un Combat anterior a HU-23) no anuncia nada', () => {
    renderCard(room({ stakePool: { total: 0 } }))
    expect(screen.queryByText(/Apuestas activas/u)).not.toBeInTheDocument()

    renderCard(room())
    expect(screen.queryByText(/Apuestas activas/u)).not.toBeInTheDocument()
  })
})
