import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router'

import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'
import type { SocketFactory, TicketProvider } from '../realtime'
import { BattlePage } from './BattlePage'
import {
  battleFinished,
  combatBattle,
  ROOM_ID,
  snapshot,
  turnAdvanced,
  winResult,
} from './fixtures'

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

const ANA = 'sujeto-ana'

const montar = () => {
  const sockets: FakeSocket[] = []
  const socketFactory: SocketFactory = (url) => {
    const socket = new FakeSocket(url)
    sockets.push(socket)
    return socket as unknown as WebSocket
  }
  const ticketProvider = vi.fn<TicketProvider>(() => Promise.resolve('ticket-1'))

  useSession.setState({
    subject: ANA,
    accessToken: 'jwt-vigente',
    expiresAt: Date.now() + 900_000,
  })

  renderWithProviders(
    <Routes>
      <Route
        path="/play/rooms/:roomId/battle"
        element={<BattlePage socketFactory={socketFactory} ticketProvider={ticketProvider} />}
      />
      <Route path="/play" element={<p>Listado de salas</p>} />
    </Routes>,
    { route: `/play/rooms/${ROOM_ID}/battle` },
  )

  return { sockets }
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

beforeEach(() => {
  useSession.setState({ subject: ANA, accessToken: 'jwt-vigente', expiresAt: Date.now() + 900_000 })
})

afterEach(() => {
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})

describe('BattlePage — finalizacion (HU-21)', () => {
  it('del `battleFinished` a la pantalla: resultado visible y acciones inexistentes', async () => {
    const { sockets } = montar()
    const socket = await connect(sockets)

    deliver(
      socket,
      snapshot(1, 'IN_BATTLE', combatBattle(1)),
      { type: 'resume.ok', roomId: ROOM_ID, seq: 1 },
      battleFinished(winResult(), combatBattle(2), 2),
    )

    expect(screen.getByRole('heading', { name: '¡Victoria!' })).toBeInTheDocument()
    expect(screen.getByText('Batalla terminada')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ataque básico/iu })).toBeNull()
  })

  it('refresh: un `snapshot` FINISHED con `result` pinta el resultado', async () => {
    const { sockets } = montar()
    const socket = await connect(sockets)

    deliver(socket, snapshot(3, 'FINISHED', combatBattle(2), winResult()), {
      type: 'resume.ok',
      roomId: ROOM_ID,
      seq: 3,
    })

    expect(screen.getByRole('heading', { name: '¡Victoria!' })).toBeInTheDocument()
  })

  it('una sala FINISHED SIN resultado (Combat anterior) muestra el aviso, sin inventarlo', async () => {
    const { sockets } = montar()
    const socket = await connect(sockets)

    deliver(socket, snapshot(3, 'FINISHED', combatBattle(2)), {
      type: 'resume.ok',
      roomId: ROOM_ID,
      seq: 3,
    })

    expect(screen.getByText('La batalla terminó.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '¡Victoria!' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Volver a Jugar Online' })).toBeInTheDocument()
  })

  it('perder la conexion tras el final NO oculta el resultado', async () => {
    const { sockets } = montar()
    const socket = await connect(sockets)

    deliver(socket, snapshot(3, 'FINISHED', combatBattle(2), winResult()), {
      type: 'resume.ok',
      roomId: ROOM_ID,
      seq: 3,
    })

    act(() => {
      socket.close()
    })

    expect(screen.getByRole('heading', { name: '¡Victoria!' })).toBeInTheDocument()
    expect(screen.getAllByText(/Sin conexión|Reconectando/u).length).toBeGreaterThan(0)
  })

  it('una accion pendiente al llegar el final no queda colgada', async () => {
    const { sockets } = montar()
    const socket = await connect(sockets)

    deliver(socket, snapshot(1, 'IN_BATTLE', combatBattle(1)), {
      type: 'resume.ok',
      roomId: ROOM_ID,
      seq: 1,
    })

    act(() => {
      socket.message(
        JSON.stringify({
          type: 'attack',
          commandId: 'cmd-1',
          roomId: ROOM_ID,
          target: { teamLabel: 'B', seat: 0 },
        }),
      )
    })

    deliver(socket, battleFinished(winResult(), combatBattle(2), 2))

    expect(screen.queryByText(/Atacando/u)).toBeNull()
    expect(screen.getByRole('heading', { name: '¡Victoria!' })).toBeInTheDocument()
  })

  it('un evento posterior al final se ignora (no cambia el resultado)', async () => {
    const { sockets } = montar()
    const socket = await connect(sockets)

    deliver(
      socket,
      snapshot(1, 'IN_BATTLE', combatBattle(1)),
      { type: 'resume.ok', roomId: ROOM_ID, seq: 1 },
      battleFinished(winResult(), combatBattle(2), 2),
      turnAdvanced(3, 3, combatBattle(1)),
    )

    expect(screen.getByRole('heading', { name: '¡Victoria!' })).toBeInTheDocument()
    expect(screen.getByText('Batalla terminada')).toBeInTheDocument()
  })
})
