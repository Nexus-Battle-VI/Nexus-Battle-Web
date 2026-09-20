import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router'

import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'
import { BattleRoomLobbyPage } from './BattleRoomLobbyPage'
import { useBattleRoomRealtime } from './useBattleRoomRealtime'
import type { BattleRoomRealtimeStatus } from './useBattleRoomRealtime'
import type * as UseBattleRoomRealtimeModule from './useBattleRoomRealtime'
import type { BattleRoom } from './types'

/**
 * Ciclo de vida del lobby (cancelar/abandonar/deteccion de cancelacion,
 * ciclo de vida del lobby): estas pruebas se separan de
 * `BattleRoomLobbyPage.test.tsx` porque necesitan controlar directamente
 * `useBattleRoomRealtime` (el `lastRoomStatus` que distingue "cancelada" de
 * "se llenó"), en vez de depender de un WebSocket real inyectado -- ese
 * mecanismo ya tiene su propia cobertura completa en
 * `useBattleRoomRealtime.test.tsx`.
 */
vi.mock('./useBattleRoomRealtime', async (importOriginal) => {
  const actual = await importOriginal<typeof UseBattleRoomRealtimeModule>()
  return { ...actual, useBattleRoomRealtime: vi.fn() }
})

const mockedRealtime = vi.mocked(useBattleRoomRealtime)

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const ROOM_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const OWNER = 'sujeto-ana'
const GUEST = 'sujeto-bruno'

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
          playerId: OWNER,
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
          playerId: GUEST,
          heroId: 'heroe-2',
          joinedAt: '2026-01-01T00:00:00.000Z',
          displayName: 'Bruno',
        },
      ],
    },
  ],
  reward: { amount: 100 },
  createdBy: OWNER,
  createdAt: '2026-01-01T00:00:00.000Z',
  version: 0,
  ...overrides,
})

const DISABLED_REALTIME: BattleRoomRealtimeStatus = { connection: 'disabled', lastRoomStatus: null }

const montar = (): ReturnType<typeof renderWithProviders> =>
  renderWithProviders(
    <Routes>
      <Route path="/play/rooms/:roomId" element={<BattleRoomLobbyPage />} />
      <Route path="/play" element={<p>Listado de salas</p>} />
    </Routes>,
    { route: `/play/rooms/${ROOM_ID}` },
  )

beforeEach(() => {
  mockedRealtime.mockReturnValue(DISABLED_REALTIME)
})

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})

describe('BattleRoomLobbyPage — propietario/invitado', () => {
  it('el propietario ve "Cancelar sala" y NO "Abandonar sala"', async () => {
    useSession.setState({ subject: OWNER, accessToken: null, expiresAt: null })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [room()])))

    montar()

    expect(await screen.findByRole('button', { name: 'Cancelar sala' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abandonar sala' })).not.toBeInTheDocument()
  })

  it('el invitado ve "Abandonar sala" y NO "Cancelar sala"', async () => {
    useSession.setState({ subject: GUEST, accessToken: null, expiresAt: null })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [room()])))

    montar()

    expect(await screen.findByRole('button', { name: 'Abandonar sala' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar sala' })).not.toBeInTheDocument()
  })

  it('quien no es participante no ve ningun control de propietario/invitado', async () => {
    useSession.setState({ subject: 'sujeto-ajeno', accessToken: null, expiresAt: null })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [room()])))

    montar()

    await screen.findByText('Equipo A')
    expect(screen.queryByRole('button', { name: 'Cancelar sala' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abandonar sala' })).not.toBeInTheDocument()
  })

  it('el propietario cancela via API real (POST /cancel), autoridad real es el backend', async () => {
    useSession.setState({ subject: OWNER, accessToken: null, expiresAt: null })
    let cancelled = false
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : String(input)

        if (init?.method === 'POST' && url.includes('/cancel')) {
          cancelled = true
          return Promise.resolve(jsonResponse(200, room({ status: 'CANCELLED' })))
        }

        return Promise.resolve(jsonResponse(200, cancelled ? [] : [room()]))
      }),
    )

    montar()
    const button = await screen.findByRole('button', { name: 'Cancelar sala' })
    button.click()

    await waitFor(() => {
      expect(cancelled).toBe(true)
    })
  })

  it('muestra el mensaje real ante un 403 al cancelar', async () => {
    useSession.setState({ subject: OWNER, accessToken: null, expiresAt: null })
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : String(input)

        if (init?.method === 'POST' && url.includes('/cancel')) {
          return Promise.resolve(
            jsonResponse(403, { message: 'Solo el creador puede cancelarla.' }),
          )
        }

        return Promise.resolve(jsonResponse(200, [room()]))
      }),
    )

    montar()
    const button = await screen.findByRole('button', { name: 'Cancelar sala' })
    button.click()

    expect(await screen.findByRole('alert')).toHaveTextContent('Solo el creador puede cancelarla.')
  })

  it('el invitado abandona via API real (POST /leave) y vuelve al listado', async () => {
    useSession.setState({ subject: GUEST, accessToken: null, expiresAt: null })
    let left = false
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : String(input)

        if (init?.method === 'POST' && url.includes('/leave')) {
          left = true
          return Promise.resolve(jsonResponse(200, room({ status: 'WAITING_FOR_PLAYERS' })))
        }

        return Promise.resolve(jsonResponse(200, left ? [] : [room()]))
      }),
    )

    montar()
    const button = await screen.findByRole('button', { name: 'Abandonar sala' })
    button.click()

    await waitFor(() => {
      expect(left).toBe(true)
    })
    expect(await screen.findByText('Listado de salas')).toBeInTheDocument()
  })

  it('muestra el mensaje real ante un 409 al abandonar (nunca navega)', async () => {
    useSession.setState({ subject: GUEST, accessToken: null, expiresAt: null })
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : String(input)

        if (init?.method === 'POST' && url.includes('/leave')) {
          return Promise.resolve(
            jsonResponse(409, { message: 'El jugador no es participante de la sala.' }),
          )
        }

        return Promise.resolve(jsonResponse(200, [room()]))
      }),
    )

    montar()
    const button = await screen.findByRole('button', { name: 'Abandonar sala' })
    button.click()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El jugador no es participante de la sala.',
    )
    expect(screen.queryByText('Listado de salas')).not.toBeInTheDocument()
  })
})

describe('BattleRoomLobbyPage — deteccion de cancelacion vs. sala llena (HU-15.3)', () => {
  it('sala cancelada (lastRoomStatus CANCELLED via realtime): mensaje especifico, nunca el generico', async () => {
    useSession.setState({ subject: GUEST, accessToken: null, expiresAt: null })
    mockedRealtime.mockReturnValue({ connection: 'disabled', lastRoomStatus: 'CANCELLED' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [])))

    montar()

    expect(
      await screen.findByText(
        'La sala fue cancelada por su propietario. Selecciona otra sala para continuar.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('Esta sala ya no está disponible.')).not.toBeInTheDocument()
  })

  it('sala llena (lastRoomStatus PREPARING via realtime): mensaje distinto del de cancelacion', async () => {
    useSession.setState({ subject: GUEST, accessToken: null, expiresAt: null })
    mockedRealtime.mockReturnValue({ connection: 'disabled', lastRoomStatus: 'PREPARING' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [])))

    montar()

    expect(
      await screen.findByText('La sala se llenó y ya está lista para comenzar.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(
        'La sala fue cancelada por su propietario. Selecciona otra sala para continuar.',
      ),
    ).not.toBeInTheDocument()
  })

  it('sin ningun evento realtime todavia, se mantiene el mensaje generico previo', async () => {
    useSession.setState({ subject: GUEST, accessToken: null, expiresAt: null })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [])))

    montar()

    expect(await screen.findByText('Esta sala ya no está disponible.')).toBeInTheDocument()
  })
})
