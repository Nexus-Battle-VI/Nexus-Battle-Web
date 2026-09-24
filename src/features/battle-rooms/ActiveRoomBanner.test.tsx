import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'
import { ActiveRoomBanner } from './ActiveRoomBanner'
import type { BattleRoom } from './types'

const jsonResponse = (status: number, body: unknown): Response =>
  ({
    status,
    ok: status >= 200 && status < 300,
    text: () => Promise.resolve(JSON.stringify(body)),
  }) as unknown as Response

const ROOM_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

const room = (overrides: Partial<BattleRoom> = {}): BattleRoom => ({
  id: ROOM_ID,
  mode: 'PVP',
  status: 'WAITING_FOR_PLAYERS',
  teams: [
    {
      label: 'A',
      capacity: 2,
      participants: [
        {
          kind: 'HUMAN',
          playerId: 'sujeto-ana',
          heroId: 'heroe-1',
          joinedAt: '2026-09-23T00:00:00.000Z',
          displayName: 'Ana',
        },
      ],
    },
    { label: 'B', capacity: 2, participants: [] },
  ],
  reward: { amount: 0 },
  createdBy: 'sujeto-otro',
  createdAt: '2026-09-23T00:00:00.000Z',
  version: 1,
  ...overrides,
})

const pintarCon = (response: Response) => {
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  renderWithProviders(<ActiveRoomBanner />)

  return fetchMock
}

beforeEach(() => {
  useSession.setState({
    subject: 'sujeto-ana',
    accessToken: 'token',
    expiresAt: Date.now() + 900_000,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})

describe('ActiveRoomBanner — volver a mi sala', () => {
  it('lee las salas del servidor (GET /v1/combat/me/rooms), sin almacenamiento local', async () => {
    const fetchMock = pintarCon(jsonResponse(200, []))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/v1/combat/me/rooms', expect.anything())
    })
  })

  it('WAITING_FOR_PLAYERS: "Tu sala está esperando jugadores" y "Volver a la sala" al lobby', async () => {
    pintarCon(jsonResponse(200, [room()]))

    expect(await screen.findByText('Tu sala está esperando jugadores')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a la sala' })).toHaveAttribute(
      'href',
      `/play/rooms/${ROOM_ID}`,
    )
    expect(screen.getByText('Jugador vs Jugador (JcJ) · 2 vs 2 · Tu equipo: A')).toBeInTheDocument()
  })

  it('PREPARING: "Tu sala está lista para comenzar" y vuelve al lobby', async () => {
    pintarCon(jsonResponse(200, [room({ status: 'PREPARING' })]))

    expect(await screen.findByText('Tu sala está lista para comenzar')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a la sala' })).toHaveAttribute(
      'href',
      `/play/rooms/${ROOM_ID}`,
    )
  })

  it('IN_BATTLE: "Tienes una batalla en curso" y "Continuar batalla" va a la batalla', async () => {
    pintarCon(jsonResponse(200, [room({ status: 'IN_BATTLE' })]))

    expect(await screen.findByText('Tienes una batalla en curso')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continuar batalla' })).toHaveAttribute(
      'href',
      `/play/rooms/${ROOM_ID}/battle`,
    )
  })

  it('indica "Eres el propietario" cuando la sala es propia, aunque aun no se haya unido', async () => {
    pintarCon(
      jsonResponse(200, [
        room({
          createdBy: 'sujeto-ana',
          teams: [
            { label: 'A', capacity: 1, participants: [] },
            { label: 'B', capacity: 1, participants: [] },
          ],
        }),
      ]),
    )

    expect(
      await screen.findByText('Jugador vs Jugador (JcJ) · 1 vs 1 · Eres el propietario'),
    ).toBeInTheDocument()
  })

  it('varias salas: una entrada por sala', async () => {
    pintarCon(
      jsonResponse(200, [
        room({ status: 'IN_BATTLE' }),
        room({ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }),
      ]),
    )

    expect(await screen.findByRole('region', { name: 'Tus partidas en curso' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('sin salas activas no pinta nada', async () => {
    const fetchMock = pintarCon(jsonResponse(200, []))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  it('un error del servicio no pinta alertas ni bloquea (degradacion silenciosa)', async () => {
    const fetchMock = pintarCon(jsonResponse(503, { message: 'no disponible' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  it('nunca muestra el id de la sala', async () => {
    pintarCon(jsonResponse(200, [room()]))

    await screen.findByText('Tu sala está esperando jugadores')
    expect(document.body.textContent).not.toContain(ROOM_ID)
  })

  it('sin sesion no consulta ni pinta', () => {
    useSession.setState({ subject: null, accessToken: null, expiresAt: null })
    const fetchMock = pintarCon(jsonResponse(200, [room()]))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })
})
