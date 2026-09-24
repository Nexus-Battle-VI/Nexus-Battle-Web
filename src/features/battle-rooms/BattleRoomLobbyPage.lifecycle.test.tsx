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
      <Route path="/play/rooms/:roomId/battle" element={<p>Pantalla de batalla</p>} />
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

        // `GET /rooms` (listado) y `GET /rooms/:id` (detalle) comparten prefijo:
        // hay que distinguirlos por URL, no responder el mismo cuerpo a los dos.
        // Tras abandonar, la sala sale del listado (HU-15) pero el detalle sigue
        // siendo un unico `BattleRoom` real, nunca un array -- si no se distingue,
        // `detail` (habilitada porque la sala ya no esta en el listado) recibe un
        // array donde espera un objeto y `ownStakeOf`/HU-23 revienta al iterar
        // `.teams`.
        if (url.endsWith(`/rooms/${ROOM_ID}`)) {
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

  /** `GET /rooms` (listado) devuelve `[]`; `GET /rooms/:id` devuelve la sala en el estado dado. */
  const urlOf = (input: RequestInfo | URL): string =>
    typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const fetchWithDetail = (detail: Response): typeof fetch =>
    vi.fn((input: RequestInfo | URL) =>
      Promise.resolve(urlOf(input).endsWith(`/rooms/${ROOM_ID}`) ? detail : jsonResponse(200, [])),
    )

  it('sala llena (PREPARING): el invitado se queda en el lobby (NO navega a /battle) y ve el texto de espera', async () => {
    useSession.setState({ subject: GUEST, accessToken: null, expiresAt: null })
    mockedRealtime.mockReturnValue({ connection: 'disabled', lastRoomStatus: 'PREPARING' })
    vi.stubGlobal('fetch', fetchWithDetail(jsonResponse(200, room({ status: 'PREPARING' }))))

    montar()

    expect(
      await screen.findByText('Esperando a que el creador inicie la partida…'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Pantalla de batalla')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abandonar sala' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Iniciar partida' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar sala' })).not.toBeInTheDocument()
  })

  it('sala llena (PREPARING): el propietario ve "Iniciar partida" (no "Cancelar sala") y lo pide via POST /start', async () => {
    useSession.setState({ subject: OWNER, accessToken: null, expiresAt: null })
    mockedRealtime.mockReturnValue({ connection: 'disabled', lastRoomStatus: 'PREPARING' })
    let started = false
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = urlOf(input)

        if (init?.method === 'POST' && url.endsWith('/start')) {
          started = true
          return Promise.resolve(jsonResponse(200, room({ status: 'IN_BATTLE' })))
        }

        if (url.endsWith(`/rooms/${ROOM_ID}`)) {
          return Promise.resolve(jsonResponse(200, room({ status: 'PREPARING' })))
        }

        return Promise.resolve(jsonResponse(200, []))
      }),
    )

    montar()
    expect(screen.queryByRole('button', { name: 'Cancelar sala' })).not.toBeInTheDocument()
    const button = await screen.findByRole('button', { name: 'Iniciar partida' })
    button.click()

    await waitFor(() => {
      expect(started).toBe(true)
    })
  })

  it('un fallo al iniciar (403 de Combat, con roomId tecnico crudo) muestra un mensaje propio sin exponer el UUID', async () => {
    useSession.setState({ subject: OWNER, accessToken: null, expiresAt: null })
    mockedRealtime.mockReturnValue({ connection: 'disabled', lastRoomStatus: 'PREPARING' })
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = urlOf(input)

        if (init?.method === 'POST' && url.endsWith('/start')) {
          // Forma real de `RoomAccessForbiddenError`: interpola el roomId crudo.
          // El mensaje mostrado NUNCA debe reenviar esto tal cual (ver
          // `describeStartBattleFailure`).
          return Promise.resolve(
            jsonResponse(403, { message: `No eres participante de la sala "${ROOM_ID}".` }),
          )
        }

        if (url.endsWith(`/rooms/${ROOM_ID}`)) {
          return Promise.resolve(jsonResponse(200, room({ status: 'PREPARING' })))
        }

        return Promise.resolve(jsonResponse(200, []))
      }),
    )

    montar()
    const button = await screen.findByRole('button', { name: 'Iniciar partida' })
    button.click()

    const alert = await screen.findByRole('alert')

    expect(alert).toHaveTextContent('Solo quien creó la sala puede iniciar la partida.')
    expect(alert).not.toHaveTextContent(ROOM_ID)
    expect(screen.queryByText('Pantalla de batalla')).not.toBeInTheDocument()
  })

  it('sala ya en batalla (IN_BATTLE): tambien lleva a la pantalla de batalla', async () => {
    useSession.setState({ subject: GUEST, accessToken: null, expiresAt: null })
    vi.stubGlobal('fetch', fetchWithDetail(jsonResponse(200, room({ status: 'IN_BATTLE' }))))

    montar()

    expect(await screen.findByText('Pantalla de batalla')).toBeInTheDocument()
  })

  it('un no participante (403 al leer la sala) NO es llevado a la batalla: sala no disponible', async () => {
    useSession.setState({ subject: 'sujeto-ajeno', accessToken: null, expiresAt: null })
    vi.stubGlobal('fetch', fetchWithDetail(jsonResponse(403, { message: 'No eres participante' })))

    montar()

    expect(await screen.findByText('Esta sala ya no está disponible.')).toBeInTheDocument()
    expect(screen.queryByText('Pantalla de batalla')).not.toBeInTheDocument()
  })

  it('sala cancelada segun el servidor (CANCELLED): mensaje de cancelacion', async () => {
    useSession.setState({ subject: GUEST, accessToken: null, expiresAt: null })
    vi.stubGlobal('fetch', fetchWithDetail(jsonResponse(200, room({ status: 'CANCELLED' }))))

    montar()

    expect(
      await screen.findByText(
        'La sala fue cancelada por su propietario. Selecciona otra sala para continuar.',
      ),
    ).toBeInTheDocument()
  })

  it('sin ningun evento realtime todavia, se mantiene el mensaje generico previo', async () => {
    useSession.setState({ subject: GUEST, accessToken: null, expiresAt: null })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [])))

    montar()

    expect(await screen.findByText('Esta sala ya no está disponible.')).toBeInTheDocument()
  })
})

describe('BattleRoomLobbyPage — chat de la sala (HU-13)', () => {
  // Al llenarse la sala (PREPARING) HU-17 lleva a la persona a la pantalla de batalla; el chat de
  // la sala sigue alli (`BattleWithChat.test.tsx`). Aqui solo queda la sala de espera.
  it('un participante ve el chat de SU sala', async () => {
    useSession.setState({ subject: GUEST, accessToken: null, expiresAt: null })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [room()])))

    montar()

    expect(await screen.findByRole('heading', { name: 'Chat de la sala' })).toBeInTheDocument()
    expect(screen.getByRole('log')).toBeInTheDocument()
  })

  it('quien no es participante NO ve el chat de la sala', async () => {
    useSession.setState({ subject: 'sujeto-ajeno', accessToken: null, expiresAt: null })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [room()])))

    montar()

    await screen.findByText('Equipo A')
    expect(screen.queryByRole('heading', { name: 'Chat de la sala' })).not.toBeInTheDocument()
    expect(screen.queryByRole('log')).not.toBeInTheDocument()
  })

  it('una sala cancelada no ofrece chat: su chat esta cerrado', async () => {
    useSession.setState({ subject: OWNER, accessToken: null, expiresAt: null })
    mockedRealtime.mockReturnValue({ connection: 'open', lastRoomStatus: 'CANCELLED' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [])))

    montar()

    await screen.findByText(
      'La sala fue cancelada por su propietario. Selecciona otra sala para continuar.',
    )
    expect(screen.queryByRole('heading', { name: 'Chat de la sala' })).not.toBeInTheDocument()
  })
})
