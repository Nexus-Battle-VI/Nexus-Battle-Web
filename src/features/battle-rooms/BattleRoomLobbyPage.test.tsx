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

  it('mientras espera jugadores no ofrece "Iniciar partida" (ni al propietario): solo aparece en PREPARING (HU-17)', async () => {
    // `AUTHENTICATED_NO_SOCKET` autentica como 'sujeto-ana', que en `room()`
    // TAMBIEN es `createdBy` -- ni siquiera el propietario ve el boton mientras
    // la sala sigue WAITING_FOR_PLAYERS. Cobertura del boton ya PREPARING (y de
    // quien no es propietario) vive en `BattleRoomLobbyPage.lifecycle.test.tsx`.
    useSession.setState(AUTHENTICATED_NO_SOCKET)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [room()])))

    montar()

    expect(
      await screen.findByText(/La batalla comienza cuando la sala se llena/u),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Iniciar partida' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar sala' })).toBeInTheDocument()
  })

  /**
   * Seccion 12 del prompt maestro de estabilizacion: revisar la propia
   * preparacion sin abandonar la sala (sin llamar a `leave`). El enlace va a
   * Mi Inventario -no a un panel embebido- porque ninguna feature importa
   * componentes de otra en este proyecto.
   */
  it('un participante ve "Revisar mi equipamiento", enlazado a Mi Inventario', async () => {
    useSession.setState(AUTHENTICATED_NO_SOCKET)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [room()])))

    montar()

    expect(await screen.findByRole('link', { name: 'Revisar mi equipamiento' })).toHaveAttribute(
      'href',
      '/inventory',
    )
  })

  it('quien no es participante NO ve "Revisar mi equipamiento"', async () => {
    useSession.setState({ ...AUTHENTICATED_NO_SOCKET, subject: 'sujeto-ajeno' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [room()])))

    montar()

    await screen.findByText('Equipo A')
    expect(screen.queryByRole('link', { name: 'Revisar mi equipamiento' })).not.toBeInTheDocument()
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
  describe('avatar de los participantes (HU-15)', () => {
    const imageResponse = (): Response =>
      new Response(new Blob(['png'], { type: 'image/png' }), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      })

    /** Enruta por URL: la sala para el listado, la imagen/404 para el avatar. */
    const fetchRouting = (avatar: () => Response) =>
      vi.fn((input: RequestInfo | URL) => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

        return Promise.resolve(
          url.includes('/accounts/by-subject/') ? avatar() : jsonResponse(200, [room()]),
        )
      })

    const requestedUrls = (fetchMock: ReturnType<typeof vi.fn>): string[] =>
      fetchMock.mock.calls.map(([input]) =>
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : (input as Request).url,
      )

    it('muestra el avatar REAL de un jugador humano, pedido por su sujeto', async () => {
      useSession.setState(AUTHENTICATED_NO_SOCKET)
      vi.stubGlobal('URL', {
        ...URL,
        createObjectURL: vi.fn().mockReturnValue('blob:avatar-ana'),
        revokeObjectURL: vi.fn(),
      })
      const fetchMock = fetchRouting(imageResponse)
      vi.stubGlobal('fetch', fetchMock)

      montar()

      const image = await screen.findByRole('img', { name: 'Ana' })
      expect(image).toHaveAttribute('src', 'blob:avatar-ana')
      expect(requestedUrls(fetchMock)).toContainEqual(
        expect.stringContaining('/accounts/by-subject/sujeto-ana/avatar'),
      )
    })

    it('cae a la inicial cuando el jugador no tiene avatar (404 legitimo)', async () => {
      useSession.setState(AUTHENTICATED_NO_SOCKET)
      vi.stubGlobal(
        'fetch',
        fetchRouting(() => jsonResponse(404, { message: 'sin avatar' })),
      )

      montar()

      expect(await screen.findByText('Ana')).toBeInTheDocument()
      expect(await screen.findByText('A')).toBeInTheDocument()
      expect(screen.queryByRole('img', { name: 'Ana' })).not.toBeInTheDocument()
    })

    it('un oponente IA no pide avatar', async () => {
      useSession.setState(AUTHENTICATED_NO_SOCKET)
      const fetchMock = vi.fn().mockResolvedValue(
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
      )
      vi.stubGlobal('fetch', fetchMock)

      montar()

      expect(await screen.findByText('Oponente IA')).toBeInTheDocument()
      expect(requestedUrls(fetchMock).some((url) => url.includes('/avatar'))).toBe(false)
    })
  })
})
