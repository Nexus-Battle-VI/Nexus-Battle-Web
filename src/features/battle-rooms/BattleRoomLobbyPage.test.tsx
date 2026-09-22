import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
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
        },
      ],
    },
    { label: 'B', capacity: 2, participants: [] },
  ],
  reward: { amount: 100 },
  createdBy: 'sujeto-ana',
  createdAt: '2026-01-01T00:00:00.000Z',
  version: 0,
  ...overrides,
})

/**
 * Sesion con `subject` (necesario para `isParticipant`) pero SIN
 * `accessToken`: `useBattleRoomRealtime` queda en `disabled` y no intenta
 * abrir un WebSocket real contra un servidor que no existe en el entorno de
 * pruebas. El hook de realtime ya tiene su propia cobertura con un socket
 * inyectado (`useBattleRoomRealtime.test.tsx`); esta pantalla no repite esa
 * cobertura, solo confirma que renderiza lo que la sala real trae.
 */
const AUTHENTICATED_NO_SOCKET = {
  subject: 'sujeto-ana',
  accessToken: null,
  expiresAt: null,
}

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})

const montar = (): ReturnType<typeof renderWithProviders> =>
  renderWithProviders(
    <Routes>
      <Route path="/play/rooms/:roomId" element={<BattleRoomLobbyPage />} />
    </Routes>,
    { route: `/play/rooms/${ROOM_ID}` },
  )

describe('BattleRoomLobbyPage', () => {
  it('muestra el estado de carga', () => {
    useSession.setState(AUTHENTICATED_NO_SOCKET)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Promise<Response>(() => {
          // nunca se resuelve: solo interesa el estado de carga
        }),
      ),
    )

    montar()

    expect(screen.getByRole('status')).toHaveTextContent('Cargando...')
  })

  it('declara la sala como no disponible cuando el roomId no existe en el listado', async () => {
    useSession.setState(AUTHENTICATED_NO_SOCKET)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [])))

    montar()

    expect(await screen.findByText('Esta sala ya no está disponible.')).toBeInTheDocument()
  })

  it('renderiza ambos equipos con slots vacios y estado WAITING_FOR_PLAYERS', async () => {
    useSession.setState(AUTHENTICATED_NO_SOCKET)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [room()])))

    montar()

    expect(await screen.findByText('Esperando jugadores')).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Equipo A')).toBeInTheDocument()
    expect(screen.getByText('Equipo B')).toBeInTheDocument()
    expect(screen.getByText('1/2')).toBeInTheDocument()
    expect(screen.getByText('0/2')).toBeInTheDocument()
    expect(screen.getAllByText('Esperando jugador…').length).toBeGreaterThan(0)
  })

  it('marca visualmente al propietario en la lista de participantes, y a nadie mas (BAJO-01, auditoria HU-15.4)', async () => {
    useSession.setState(AUTHENTICATED_NO_SOCKET)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(200, [
          room({
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
                    joinedAt: '2026-01-01T00:01:00.000Z',
                    displayName: 'Bruno',
                  },
                ],
              },
            ],
          }),
        ]),
      ),
    )

    montar()

    const ownerRow = (await screen.findByText('Ana')).closest('li')
    const guestRow = screen.getByText('Bruno').closest('li')

    expect(ownerRow).not.toBeNull()
    expect(guestRow).not.toBeNull()
    expect(ownerRow).toHaveTextContent('Propietario')
    expect(guestRow).not.toHaveTextContent('Propietario')
  })

  it('traduce el estado PREPARING', async () => {
    useSession.setState(AUTHENTICATED_NO_SOCKET)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(200, [room({ status: 'PREPARING' })])),
    )

    montar()

    expect(await screen.findByText('Preparando batalla')).toBeInTheDocument()
  })

  it('NO muestra el UUID de la sala ni playerId/subject de ningun participante', async () => {
    useSession.setState(AUTHENTICATED_NO_SOCKET)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [room()])))

    const { container } = montar()

    await screen.findByText('Equipo A')

    expect(screen.queryByText(ROOM_ID)).not.toBeInTheDocument()
    expect(screen.queryByText('sujeto-ana')).not.toBeInTheDocument()
    expect(container.innerHTML).not.toContain(ROOM_ID)
  })

  it('no ofrece un boton para iniciar: la batalla comienza cuando la sala se llena y decide Combat (HU-17)', async () => {
    useSession.setState(AUTHENTICATED_NO_SOCKET)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [room()])))

    montar()

    expect(
      await screen.findByText(/La batalla comienza cuando la sala se llena/u),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Empezar partida/u })).not.toBeInTheDocument()
  })

  it('representa un oponente IA sin depender de displayName', async () => {
    useSession.setState(AUTHENTICATED_NO_SOCKET)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(200, [
          room({
            mode: 'PVE',
            teams: [
              { label: 'A', capacity: 1, participants: [] },
              {
                label: 'B',
                capacity: 1,
                participants: [
                  {
                    kind: 'AI',
                    playerId: null,
                    heroId: null,
                    joinedAt: '2026-01-01T00:00:00.000Z',
                  },
                ],
              },
            ],
          }),
        ]),
      ),
    )

    montar()

    expect(await screen.findByText('Oponente IA')).toBeInTheDocument()
  })
})
