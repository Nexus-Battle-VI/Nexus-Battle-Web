import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'

import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'
import type { SocketFactory, TicketProvider } from '../realtime'
import { BattlePage } from './BattlePage'
import { battle, battleStarted, ROOM_ID, snapshot, turnAdvanced } from './fixtures'

class FakeSocket extends EventTarget {
  readonly url: string
  readonly sent: string[] = []
  closed = false

  constructor(url: string) {
    super()
    this.url = url
  }

  send(data: string): void {
    this.sent.push(data)
  }

  close(): void {
    this.closed = true
    this.dispatchEvent(new Event('close'))
  }

  open(): void {
    this.dispatchEvent(new Event('open'))
  }

  message(data: unknown): void {
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(data) }))
  }
}

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const ANA = 'sujeto-ana'
const BRUNO = 'sujeto-bruno'

const setup = () => {
  const sockets: FakeSocket[] = []
  const socketFactory: SocketFactory = (url) => {
    const socket = new FakeSocket(url)
    sockets.push(socket)
    return socket as unknown as WebSocket
  }
  const ticketProvider = vi.fn<TicketProvider>(() => Promise.resolve('ticket-1'))

  return { sockets, socketFactory, ticketProvider }
}

const montar = (subject: string | null = ANA, route = `/play/rooms/${ROOM_ID}/battle`) => {
  const harness = setup()
  useSession.setState({
    subject,
    accessToken: subject === null ? null : 'jwt-vigente',
    expiresAt: subject === null ? null : Date.now() + 900_000,
  })

  renderWithProviders(
    <Routes>
      <Route
        path="/play/rooms/:roomId/battle"
        element={
          <BattlePage
            socketFactory={harness.socketFactory}
            ticketProvider={harness.ticketProvider}
          />
        }
      />
      <Route path="/play/rooms/:roomId" element={<p>Sala</p>} />
      <Route path="/play" element={<p>Listado de salas</p>} />
    </Routes>,
    { route },
  )

  return harness
}

const connect = async (sockets: FakeSocket[]): Promise<FakeSocket> => {
  await waitFor(() => {
    expect(sockets).toHaveLength(1)
  })
  const socket = sockets[0]!

  act(() => {
    socket.open()
    socket.message({ type: 'auth.ok' })
  })
  return socket
}

const deliver = (socket: FakeSocket, ...messages: Record<string, unknown>[]): void => {
  act(() => {
    for (const message of messages) {
      socket.message(message)
    }
  })
}

const ready = (seq: number): Record<string, unknown> => ({
  type: 'resume.ok',
  roomId: ROOM_ID,
  seq,
})

const startCalls = (fetchImpl: ReturnType<typeof vi.fn>): unknown[][] =>
  fetchImpl.mock.calls.filter(([url]) => String(url).endsWith(`/rooms/${ROOM_ID}/start`))

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(jsonResponse(200, { id: ROOM_ID, status: 'IN_BATTLE' })),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})

describe('BattlePage — HU-17: la batalla solo se pinta cuando Combat la publica', () => {
  it('mientras conecta muestra un estado de carga, no una batalla', () => {
    montar()

    expect(screen.getByRole('status')).toHaveTextContent('Conectando con la batalla')
  })

  it('sala llena (PREPARING): pide el inicio UNA vez, sin cuerpo, y no pinta ninguna batalla antes de battleStarted', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { id: ROOM_ID, status: 'IN_BATTLE' }))
    vi.stubGlobal('fetch', fetchImpl)
    const { sockets } = montar()
    const socket = await connect(sockets)

    deliver(socket, snapshot(0, 'PREPARING', null), ready(0))

    expect(await screen.findByText('Preparando la batalla…')).toBeInTheDocument()
    await waitFor(() => {
      expect(startCalls(fetchImpl)).toHaveLength(1)
    })
    const [, init] = startCalls(fetchImpl)[0] as [string, RequestInit]

    expect(init.method).toBe('POST')
    expect(init.body).toBeUndefined()
    // Ningun turno ni heroe hasta que llegue el evento del servidor.
    expect(screen.queryByText(/Turno de/u)).not.toBeInTheDocument()
    expect(screen.queryByText('Tu turno')).not.toBeInTheDocument()
  })

  it('al llegar battleStarted por WebSocket muestra a ambos heroes y de quien es el turno', async () => {
    const { sockets } = montar(ANA)
    const socket = await connect(sockets)

    deliver(socket, snapshot(0, 'PREPARING', null), ready(0), battleStarted())

    expect(await screen.findByText('Turno de Bruno')).toBeInTheDocument()
    expect(await screen.findByRole('img', { name: 'Guerrero Armas' })).toBeInTheDocument()
    expect(await screen.findByRole('img', { name: 'Mago Fuego' })).toBeInTheDocument()
    expect(screen.queryByText('Preparando la batalla…')).not.toBeInTheDocument()
  })

  it('los DOS clientes ven la MISMA cola: quien mira como Bruno lee "Tu turno" y como Ana "Turno de Bruno"', async () => {
    const bruno = montar(BRUNO)
    const socketBruno = await connect(bruno.sockets)

    deliver(socketBruno, snapshot(1, 'IN_BATTLE', battle(0)), ready(1))

    expect(await screen.findByText('Tu turno')).toBeInTheDocument()
  })

  it('una batalla ya en curso (IN_BATTLE, p. ej. tras recargar) se pinta desde el snapshot SIN pedir un nuevo inicio', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, {}))
    vi.stubGlobal('fetch', fetchImpl)
    const { sockets } = montar(ANA)
    const socket = await connect(sockets)

    deliver(socket, snapshot(3, 'IN_BATTLE', battle(2)), ready(3))

    expect(await screen.findByText('Turno de Bruno')).toBeInTheDocument()
    expect(screen.getByText('Ronda 2')).toBeInTheDocument()
    expect(startCalls(fetchImpl)).toHaveLength(0)
  })

  it('el turno avanza SOLO por lo que publica el servidor (turnAdvanced)', async () => {
    const { sockets } = montar(ANA)
    const socket = await connect(sockets)

    deliver(socket, snapshot(1, 'IN_BATTLE', battle(0)), ready(1))
    expect(await screen.findByText('Turno de Bruno')).toBeInTheDocument()

    deliver(socket, turnAdvanced(1, 2))

    expect(await screen.findByText('Tu turno')).toBeInTheDocument()
  })

  it('un fallo al iniciar (422 en la revalidacion de un participante) se explica y permite reintentar', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(422, { message: 'detalle tecnico' }))
      .mockResolvedValue(jsonResponse(200, { id: ROOM_ID, status: 'IN_BATTLE' }))
    vi.stubGlobal('fetch', fetchImpl)
    const { sockets } = montar(ANA)
    const socket = await connect(sockets)

    deliver(socket, snapshot(0, 'PREPARING', null), ready(0))

    expect(await screen.findByText('La batalla no pudo comenzar.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('ya no cumple los requisitos para combatir')
    expect(screen.queryByText(/detalle tecnico/u)).not.toBeInTheDocument()
    expect(startCalls(fetchImpl)).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => {
      expect(startCalls(fetchImpl)).toHaveLength(2)
    })
  })

  it('equipos de distinto tamano (422 UNSUPPORTED_TEAM_COMPOSITION): lo explica y NO pinta ninguna batalla', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(422, {
          statusCode: 422,
          message: 'Los equipos tienen distinto tamano (1 contra 3)',
          code: 'UNSUPPORTED_TEAM_COMPOSITION',
        }),
      ),
    )
    const { sockets } = montar(ANA)
    const socket = await connect(sockets)

    deliver(socket, snapshot(0, 'PREPARING', null), ready(0))

    expect(await screen.findByText('La batalla no pudo comenzar.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('distinto tamaño')
    expect(screen.queryByText(/Turno de/u)).not.toBeInTheDocument()
  })

  it('sala cancelada: mensaje claro y vuelta a Jugar Online', async () => {
    const { sockets } = montar(ANA)
    const socket = await connect(sockets)

    deliver(socket, snapshot(0, 'CANCELLED', null), ready(0))

    expect(await screen.findByRole('alert')).toHaveTextContent('La sala fue cancelada')
    expect(screen.getByRole('link', { name: 'Volver a Jugar Online' })).toHaveAttribute(
      'href',
      '/play',
    )
  })

  it('sala que todavia espera jugadores: enlaza de vuelta a la sala', async () => {
    const { sockets } = montar(ANA)
    const socket = await connect(sockets)

    deliver(socket, snapshot(0, 'WAITING_FOR_PLAYERS', null), ready(0))

    expect(await screen.findByText(/La sala todavía espera jugadores/u)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a la sala' })).toHaveAttribute(
      'href',
      `/play/rooms/${ROOM_ID}`,
    )
  })

  it('un no participante (NOT_A_PARTICIPANT) no ve ninguna batalla', async () => {
    const { sockets } = montar('sujeto-ajeno')
    const socket = await connect(sockets)

    deliver(socket, { type: 'command.rejected', code: 'NOT_A_PARTICIPANT' })

    expect(await screen.findByRole('alert')).toHaveTextContent('No participas en esta batalla.')
    expect(screen.queryByText(/Turno de/u)).not.toBeInTheDocument()
  })

  it('sin sesion vigente: pide volver a iniciar sesion, sin abrir socket', () => {
    const { sockets, ticketProvider } = montar(null)

    expect(screen.getByRole('alert')).toHaveTextContent('Tu sesión expiró')
    expect(ticketProvider).not.toHaveBeenCalled()
    expect(sockets).toHaveLength(0)
  })

  it('mientras reconecta conserva la batalla y avisa con texto', async () => {
    const { sockets } = montar(ANA)
    const socket = await connect(sockets)

    deliver(socket, snapshot(1, 'IN_BATTLE', battle(0)), ready(1))
    expect(await screen.findByText('Turno de Bruno')).toBeInTheDocument()

    act(() => {
      socket.close()
    })

    expect(await screen.findByText(/Reconectando en tiempo real/u)).toBeInTheDocument()
    expect(screen.getByText('Turno de Bruno')).toBeInTheDocument()
  })

  it('la conexion en tiempo real fallida (4401 x3) sin batalla muestra una alerta', async () => {
    const { sockets, ticketProvider } = montar(ANA)

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await waitFor(
        () => {
          expect(sockets).toHaveLength(attempt)
        },
        { timeout: 6_000 },
      )
      const socket = sockets[attempt - 1]!

      act(() => {
        socket.open()
        socket.dispatchEvent(new CloseEvent('close', { code: 4401 }))
      })
    }

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo autenticar la conexión')
    expect(ticketProvider).toHaveBeenCalledTimes(3)
  }, 20_000)
})
