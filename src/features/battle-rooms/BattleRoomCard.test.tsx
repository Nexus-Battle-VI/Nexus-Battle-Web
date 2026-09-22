import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

import { BattleRoomCard, type BattleRoomCardProps } from './BattleRoomCard'
import type { BattleRoom } from './types'

const room = (overrides: Partial<BattleRoom> = {}): BattleRoom => ({
  id: 'e5f0d655-cd1f-411b-8350-2a5dc6e5ced6',
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

const defaultProps: Omit<BattleRoomCardProps, 'room'> = {
  isOwn: false,
  isParticipant: false,
  cancelling: false,
  onCancel: vi.fn(),
  onJoin: vi.fn(),
  joiningTeam: null,
  joinError: null,
}

const renderCard = (room: BattleRoom, props: Partial<Omit<BattleRoomCardProps, 'room'>> = {}) =>
  render(
    <MemoryRouter>
      <ul>
        <BattleRoomCard room={room} {...defaultProps} {...props} />
      </ul>
    </MemoryRouter>,
  )

describe('BattleRoomCard', () => {
  it('NO renderiza el UUID tecnico como texto visible', () => {
    renderCard(room())

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
    const { container } = renderCard(room())

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
    renderCard(room())

    expect(screen.getByTestId(`battle-room-${room().id}`)).toBeInTheDocument()
  })

  it('conserva modalidad, estado, ocupacion y recompensa reales', () => {
    renderCard(room())

    expect(screen.getByText(/Jugador vs Jugador/u)).toBeInTheDocument()
    expect(screen.getByText('Esperando jugadores')).toBeInTheDocument()
    expect(screen.getByText(/1\/4 jugadores/u)).toBeInTheDocument()
    expect(screen.getByText('2.000')).toBeInTheDocument()
  })

  it('traduce el estado PREPARING (HU-15.3)', () => {
    renderCard(room({ status: 'PREPARING' }))

    expect(screen.getByText('Preparando batalla')).toBeInTheDocument()
  })

  it('usa el id real de la sala al pedir la cancelacion, aunque no se muestre visualmente', () => {
    const onCancel = vi.fn()
    renderCard(room(), { isOwn: true, onCancel })

    screen.getByRole('button', { name: 'Cancelar' }).click()

    expect(onCancel).toHaveBeenCalledWith(room().id)
  })

  it('permite unirse al Equipo A con capacidad disponible', () => {
    const onJoin = vi.fn()
    renderCard(room(), { onJoin })

    screen.getByRole('button', { name: /Equipo A/u }).click()

    expect(onJoin).toHaveBeenCalledWith(room().id, 'A')
  })

  it('permite unirse al Equipo B con capacidad disponible', () => {
    const onJoin = vi.fn()
    renderCard(room(), { onJoin })

    screen.getByRole('button', { name: /Equipo B/u }).click()

    expect(onJoin).toHaveBeenCalledWith(room().id, 'B')
  })

  it('deshabilita visualmente el boton de un equipo lleno', () => {
    renderCard(
      room({
        teams: [
          {
            label: 'A',
            capacity: 1,
            participants: [{ kind: 'HUMAN', playerId: 'p1', heroId: null, joinedAt: '2026-01-01' }],
          },
          { label: 'B', capacity: 2, participants: [] },
        ],
      }),
    )

    expect(screen.getByRole('button', { name: /Equipo A/u })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Equipo B/u })).toBeEnabled()
  })

  it('deshabilita ambos botones de union cuando la sala no admite union (PREPARING)', () => {
    renderCard(room({ status: 'PREPARING' }))

    expect(screen.getByRole('button', { name: /Equipo A/u })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Equipo B/u })).toBeDisabled()
  })

  it('HU-21: una sala FINISHED tampoco se ofrece para unirse', () => {
    renderCard(room({ status: 'FINISHED' }))

    expect(screen.getByRole('button', { name: /Equipo A/u })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Equipo B/u })).toBeDisabled()
  })

  it('muestra el mensaje de union en curso solo en el equipo que se esta uniendo', () => {
    renderCard(room(), { joiningTeam: 'B' })

    expect(screen.getByRole('button', { name: /Equipo A/u })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Procesando...' })).toBeInTheDocument()
  })

  it('muestra el mensaje de error de union cuando existe', () => {
    renderCard(room(), { joinError: { message: 'La sala ya está llena.', action: null } })

    expect(screen.getByRole('alert')).toHaveTextContent('La sala ya está llena.')
  })

  it('muestra la accion correctiva del error de union cuando existe, con una ruta ya existente', () => {
    renderCard(room(), {
      joinError: {
        message: 'El equipamiento de tu héroe ya no es válido.',
        action: { label: 'Revisar inventario', to: '/inventory' },
      },
    })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'El equipamiento de tu héroe ya no es válido.',
    )
    expect(screen.getByRole('link', { name: 'Revisar inventario' })).toHaveAttribute(
      'href',
      '/inventory',
    )
  })

  it('quien ya es participante ve un enlace a la sala en vez de los botones de union', () => {
    renderCard(room(), { isParticipant: true })

    expect(screen.getByRole('link', { name: 'Ver sala' })).toHaveAttribute(
      'href',
      `/play/rooms/${room().id}`,
    )
    expect(screen.queryByRole('button', { name: /Equipo A/u })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Equipo B/u })).not.toBeInTheDocument()
  })
})
