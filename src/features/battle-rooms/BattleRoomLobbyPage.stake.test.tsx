import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router'

import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'
import { BattleRoomLobbyPage } from './BattleRoomLobbyPage'
import type { BattleRoom } from './types'

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const ROOM_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

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
          joinedAt: '2026-01-01T00:00:00.000Z',
          displayName: 'Ana',
          stake: { amount: 10, status: 'ACTIVE' },
        },
      ],
    },
    { label: 'B', capacity: 2, participants: [] },
  ],
  reward: { amount: 100 },
  createdBy: 'sujeto-ana',
  createdAt: '2026-01-01T00:00:00.000Z',
  version: 0,
  stakePool: { total: 10 },
  ...overrides,
})

/** Sesion sin `accessToken`: el WebSocket queda deshabilitado (mismo patron que el resto de la suite). */
const AUTHENTICATED_NO_SOCKET = {
  subject: 'sujeto-ana',
  accessToken: null,
  expiresAt: null,
}

const montar = (): ReturnType<typeof renderWithProviders> =>
  renderWithProviders(
    <Routes>
      <Route path="/play/rooms/:roomId" element={<BattleRoomLobbyPage />} />
    </Routes>,
    { route: `/play/rooms/${ROOM_ID}` },
  )

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})

describe('BattleRoomLobbyPage — apuesta propia (HU-23)', () => {
  it('muestra el monto y el estado de la apuesta propia que publica Combat', async () => {
    useSession.setState(AUTHENTICATED_NO_SOCKET)
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation((url: string) =>
          Promise.resolve(jsonResponse(200, url.includes('/wallet/me') ? {} : [room()])),
        ),
    )

    montar()

    expect(await screen.findByText('Apuesta reservada: 10 créditos')).toBeInTheDocument()
  })

  it('sin apuesta propia no muestra ninguna linea de apuesta', async () => {
    useSession.setState(AUTHENTICATED_NO_SOCKET)
    const withoutStake = room({
      teams: [
        {
          label: 'A',
          capacity: 2,
          participants: [
            {
              kind: 'HUMAN',
              playerId: 'sujeto-ana',
              heroId: 'heroe-1',
              joinedAt: '2026-01-01T00:00:00.000Z',
              displayName: 'Ana',
            },
          ],
        },
        { label: 'B', capacity: 2, participants: [] },
      ],
      stakePool: { total: 0 },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [withoutStake])))

    montar()

    await screen.findByRole('heading', { name: 'Sala de batalla' })
    expect(screen.queryByText(/Apuesta reservada|Tu apuesta/u)).not.toBeInTheDocument()
  })

  it('tras cancelar muestra el estado real de la apuesta, sin decir "recuperado" antes de tiempo', async () => {
    useSession.setState(AUTHENTICATED_NO_SOCKET)
    const cancelled = room({ status: 'CANCELLED', version: 1 })
    const fetchImpl = vi.fn((url: string) => {
      if (url.includes(`/rooms/${ROOM_ID}`)) {
        return Promise.resolve(jsonResponse(200, cancelled))
      }

      return Promise.resolve(jsonResponse(200, []))
    })
    vi.stubGlobal('fetch', fetchImpl)

    montar()

    expect(
      await screen.findByText(
        'La sala fue cancelada por su propietario. Selecciona otra sala para continuar.',
      ),
    ).toBeInTheDocument()
    // La apuesta sigue ACTIVE en Combat (Wallet aun no confirmo la liberacion):
    // el texto dice exactamente eso, no "recuperado".
    expect(await screen.findByText('Apuesta reservada: 10 créditos')).toBeInTheDocument()
    expect(screen.queryByText(/liberó/iu)).not.toBeInTheDocument()
  })

  it('cuando Combat confirma la liberacion, el lobby lo refleja', async () => {
    useSession.setState(AUTHENTICATED_NO_SOCKET)
    const released = room({
      status: 'CANCELLED',
      version: 2,
      teams: [
        {
          label: 'A',
          capacity: 2,
          participants: [
            {
              kind: 'HUMAN',
              playerId: 'sujeto-ana',
              heroId: 'heroe-1',
              joinedAt: '2026-01-01T00:00:00.000Z',
              displayName: 'Ana',
              stake: { amount: 10, status: 'RELEASED' },
            },
          ],
        },
        { label: 'B', capacity: 2, participants: [] },
      ],
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes(`/rooms/${ROOM_ID}`)) {
          return Promise.resolve(jsonResponse(200, released))
        }

        return Promise.resolve(jsonResponse(200, []))
      }),
    )

    montar()

    expect(await screen.findByText('Se liberó tu apuesta de 10 créditos')).toBeInTheDocument()
  })

  it('la apuesta de un rival nunca se muestra: el DTO no la trae y la pantalla no la inventa', async () => {
    useSession.setState(AUTHENTICATED_NO_SOCKET)
    const rivalRoom = room({
      createdBy: 'sujeto-bruno',
      teams: [
        {
          label: 'A',
          capacity: 2,
          participants: [
            {
              kind: 'HUMAN',
              playerId: 'sujeto-ana',
              heroId: 'heroe-1',
              joinedAt: '2026-01-01T00:00:00.000Z',
              displayName: 'Ana',
            },
          ],
        },
        {
          label: 'B',
          capacity: 2,
          participants: [
            {
              kind: 'HUMAN',
              playerId: 'sujeto-bruno',
              heroId: 'heroe-2',
              joinedAt: '2026-01-01T00:00:00.000Z',
              displayName: 'Bruno',
            },
          ],
        },
      ],
      stakePool: { total: 30 },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [rivalRoom])))

    montar()

    await screen.findByRole('heading', { name: 'Sala de batalla' })
    await waitFor(() => {
      expect(screen.queryByText(/Apuesta reservada/u)).not.toBeInTheDocument()
    })
  })
})
