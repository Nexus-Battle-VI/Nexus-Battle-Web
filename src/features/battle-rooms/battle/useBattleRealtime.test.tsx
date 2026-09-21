import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

import { useSession } from '@/shared/session'
import type { SocketFactory, TicketProvider } from '../realtime'
import { battle, battleStarted, ROOM_ID, snapshot, turnAdvanced } from './fixtures'
import { useBattleRealtime } from './useBattleRealtime'

/** Doble minimo de `WebSocket`: suficiente para lo que la conexion usa. */
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

  /** Mensajes enviados por el cliente, ya parseados (sin el `auth`). */
  commands(): Record<string, unknown>[] {
    return this.sent.map((raw) => JSON.parse(raw) as Record<string, unknown>).slice(1)
  }
}

const JWT = 'token-vigente'

const setup = () => {
  const sockets: FakeSocket[] = []
  const factory: SocketFactory = (url) => {
    const socket = new FakeSocket(url)
    sockets.push(socket)
    return socket as unknown as WebSocket
  }
  let issued = 0
  const tickets = vi.fn<TicketProvider>(() => Promise.resolve(`ticket-${String((issued += 1))}`))

  return { sockets, factory, tickets }
}

const socketNumber = async (sockets: FakeSocket[], count: number): Promise<FakeSocket> => {
  await waitFor(() => {
    expect(sockets).toHaveLength(count)
  })
  return sockets[count - 1]!
}

const authenticate = (socket: FakeSocket): void => {
  act(() => {
    socket.open()
    socket.message({ type: 'auth.ok' })
  })
}

const deliver = (socket: FakeSocket, ...messages: Record<string, unknown>[]): void => {
  act(() => {
    for (const message of messages) {
      socket.message(message)
    }
  })
}

beforeEach(() => {
  useSession.setState({ subject: 'sujeto-ana', accessToken: JWT, expiresAt: Date.now() + 900_000 })
})

afterEach(() => {
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
  vi.useRealTimers()
})

describe('useBattleRealtime — ADR-020 + HU-17', () => {
  it('pide ticket, abre el socket sin credenciales en la URL y tras auth.ok pide el estado con resume SIN lastSeq', async () => {
    const { sockets, factory, tickets } = setup()

    renderHook(() => useBattleRealtime(ROOM_ID, factory, tickets))
    const socket = await socketNumber(sockets, 1)

    expect(new URL(socket.url).search).toBe('')
    expect(socket.url).not.toContain(JWT)

    authenticate(socket)

    expect(socket.commands()).toEqual([{ type: 'resume', roomId: ROOM_ID }])
    expect(socket.sent.join('')).not.toContain(JWT)
  })

  it('un snapshot PREPARING deja la sala sin batalla; tras resume.ok queda sincronizada', async () => {
    const { sockets, factory, tickets } = setup()
    const { result } = renderHook(() => useBattleRealtime(ROOM_ID, factory, tickets))
    const socket = await socketNumber(sockets, 1)

    authenticate(socket)
    deliver(socket, snapshot(0, 'PREPARING', null), { type: 'resume.ok', roomId: ROOM_ID, seq: 0 })

    expect(result.current).toMatchObject({
      connection: 'open',
      roomStatus: 'PREPARING',
      battle: null,
      lastSeq: 0,
      synced: true,
      rejected: null,
    })
  })

  it('battleStarted publicado por el servidor entrega la cola y el turno; nada se calcula localmente', async () => {
    const { sockets, factory, tickets } = setup()
    const { result } = renderHook(() => useBattleRealtime(ROOM_ID, factory, tickets))
    const socket = await socketNumber(sockets, 1)

    authenticate(socket)
    deliver(
      socket,
      snapshot(0, 'PREPARING', null),
      { type: 'resume.ok', roomId: ROOM_ID, seq: 0 },
      battleStarted(),
    )

    expect(result.current.roomStatus).toBe('IN_BATTLE')
    expect(result.current.battle?.currentTurn.displayName).toBe('Bruno')
    expect(result.current.lastSeq).toBe(1)
  })

  it('aplica los turnAdvanced en orden de seq e ignora un duplicado', async () => {
    const { sockets, factory, tickets } = setup()
    const { result } = renderHook(() => useBattleRealtime(ROOM_ID, factory, tickets))
    const socket = await socketNumber(sockets, 1)

    authenticate(socket)
    deliver(socket, snapshot(1, 'IN_BATTLE', battle(0)), {
      type: 'resume.ok',
      roomId: ROOM_ID,
      seq: 1,
    })
    deliver(socket, turnAdvanced(1, 2), turnAdvanced(1, 2), turnAdvanced(2, 3))

    expect(result.current.lastSeq).toBe(3)
    expect(result.current.battle?.turnsCompleted).toBe(2)
  })

  it('IGNORA mensajes de OTRA sala (snapshot, evento y resume.ok)', async () => {
    const { sockets, factory, tickets } = setup()
    const { result } = renderHook(() => useBattleRealtime(ROOM_ID, factory, tickets))
    const socket = await socketNumber(sockets, 1)

    authenticate(socket)
    deliver(
      socket,
      { ...snapshot(3, 'IN_BATTLE', battle(2)), roomId: 'otra-sala' },
      { ...battleStarted(), roomId: 'otra-sala' },
      { type: 'resume.ok', roomId: 'otra-sala', seq: 3 },
    )

    expect(result.current).toMatchObject({
      roomStatus: null,
      battle: null,
      lastSeq: 0,
      synced: false,
    })
  })

  it('ignora mensajes malformados sin romper: el estado no cambia', async () => {
    const { sockets, factory, tickets } = setup()
    const { result } = renderHook(() => useBattleRealtime(ROOM_ID, factory, tickets))
    const socket = await socketNumber(sockets, 1)

    authenticate(socket)
    deliver(socket, snapshot(1, 'IN_BATTLE', battle(0)))
    const before = result.current.battle

    deliver(
      socket,
      { type: 'turnAdvanced', seq: 2, roomId: ROOM_ID, battle: { turnOrder: [] } },
      { type: 'snapshot', roomId: ROOM_ID },
      { type: 'algo-desconocido' },
    )
    act(() => {
      socket.dispatchEvent(new MessageEvent('message', { data: 'no-es-json' }))
    })

    expect(result.current.battle).toBe(before)
    expect(result.current.lastSeq).toBe(1)
  })

  it('command.rejected expone el codigo estable (la batalla no es accesible)', async () => {
    const { sockets, factory, tickets } = setup()
    const { result } = renderHook(() => useBattleRealtime(ROOM_ID, factory, tickets))
    const socket = await socketNumber(sockets, 1)

    authenticate(socket)
    deliver(socket, { type: 'command.rejected', code: 'NOT_A_PARTICIPANT' })

    expect(result.current.rejected).toBe('NOT_A_PARTICIPANT')
  })

  it('un salto de seq pide resume con el ultimo seq aplicado, por el mismo socket, una sola vez', async () => {
    const { sockets, factory, tickets } = setup()
    const { result } = renderHook(() => useBattleRealtime(ROOM_ID, factory, tickets))
    const socket = await socketNumber(sockets, 1)

    authenticate(socket)
    deliver(
      socket,
      snapshot(0, 'PREPARING', null),
      { type: 'resume.ok', roomId: ROOM_ID, seq: 0 },
      battleStarted(),
    )
    deliver(socket, turnAdvanced(4, 5))

    await waitFor(() => {
      expect(socket.commands()).toEqual([
        { type: 'resume', roomId: ROOM_ID },
        { type: 'resume', roomId: ROOM_ID, lastSeq: 1 },
      ])
    })
    // No se invento el estado perdido: se conserva lo aplicado hasta el hueco.
    expect(result.current.lastSeq).toBe(1)
    expect(result.current.battle?.turnsCompleted).toBe(0)
    expect(sockets).toHaveLength(1)

    // El servidor responde con los eventos faltantes en orden y el estado converge.
    deliver(
      socket,
      turnAdvanced(1, 2),
      turnAdvanced(2, 3),
      turnAdvanced(3, 4),
      turnAdvanced(4, 5),
      { type: 'resume.ok', roomId: ROOM_ID, seq: 5 },
    )

    expect(result.current.lastSeq).toBe(5)
    expect(result.current.battle?.turnsCompleted).toBe(4)
    expect(result.current.synced).toBe(true)
  })

  it('reconexion: conserva lo ultimo, deja de estar sincronizado, pide ticket NUEVO y reanuda con lastSeq', async () => {
    const { sockets, factory, tickets } = setup()
    const { result } = renderHook(() => useBattleRealtime(ROOM_ID, factory, tickets))
    const first = await socketNumber(sockets, 1)

    authenticate(first)
    deliver(
      first,
      snapshot(0, 'PREPARING', null),
      { type: 'resume.ok', roomId: ROOM_ID, seq: 0 },
      battleStarted(),
      turnAdvanced(1, 2),
    )
    expect(result.current.synced).toBe(true)

    vi.useFakeTimers()
    act(() => {
      first.close()
    })

    expect(result.current.connection).toBe('reconnecting')
    expect(result.current.synced).toBe(false)
    // No hay calculo local mientras esta caida: se sigue viendo lo ultimo del servidor.
    expect(result.current.battle?.turnsCompleted).toBe(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    vi.useRealTimers()

    const second = await socketNumber(sockets, 2)

    act(() => {
      second.open()
    })
    expect(tickets).toHaveBeenCalledTimes(2)
    expect(second.sent[0]).toBe(JSON.stringify({ type: 'auth', ticket: 'ticket-2' }))

    act(() => {
      second.message({ type: 'auth.ok' })
    })
    expect(second.commands()).toEqual([{ type: 'resume', roomId: ROOM_ID, lastSeq: 2 }])

    // Replay ordenado de lo que falto y `resume.ok`.
    deliver(second, turnAdvanced(2, 3), { type: 'resume.ok', roomId: ROOM_ID, seq: 3 })

    expect(result.current).toMatchObject({ connection: 'open', synced: true, lastSeq: 3 })
    expect(result.current.battle?.turnsCompleted).toBe(2)
  })

  it('tras reconectar puede llegar un snapshot en lugar de replay: reemplaza el estado', async () => {
    const { sockets, factory, tickets } = setup()
    const { result } = renderHook(() => useBattleRealtime(ROOM_ID, factory, tickets))
    const first = await socketNumber(sockets, 1)

    authenticate(first)
    deliver(first, snapshot(1, 'IN_BATTLE', battle(0)))

    vi.useFakeTimers()
    act(() => {
      first.close()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    vi.useRealTimers()

    const second = await socketNumber(sockets, 2)

    authenticate(second)
    deliver(second, snapshot(9, 'IN_BATTLE', battle(8)), {
      type: 'resume.ok',
      roomId: ROOM_ID,
      seq: 9,
    })

    expect(result.current.lastSeq).toBe(9)
    expect(result.current.battle?.turnsCompleted).toBe(8)
    expect(result.current.synced).toBe(true)
  })

  it('un 401 al pedir el ticket deshabilita la conexion: sin socket', async () => {
    const { sockets, factory } = setup()
    const { HttpError } = await import('@/lib/http')
    const tickets = vi.fn<TicketProvider>(() =>
      Promise.reject(new HttpError(401, 'Sesion vencida', null)),
    )

    const { result } = renderHook(() => useBattleRealtime(ROOM_ID, factory, tickets))

    await waitFor(() => {
      expect(result.current.connection).toBe('disabled')
    })
    expect(sockets).toHaveLength(0)
  })

  it('sin sala (roomId null) no pide ticket ni abre socket', () => {
    const { factory, tickets } = setup()
    const { result } = renderHook(() => useBattleRealtime(null, factory, tickets))

    expect(tickets).not.toHaveBeenCalled()
    expect(result.current.connection).toBe('disabled')
  })

  it('al desmontar cierra el socket y no reintenta', async () => {
    const { sockets, factory, tickets } = setup()
    const { unmount } = renderHook(() => useBattleRealtime(ROOM_ID, factory, tickets))
    const socket = await socketNumber(sockets, 1)

    authenticate(socket)
    unmount()

    expect(socket.closed).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(sockets).toHaveLength(1)
    expect(tickets).toHaveBeenCalledTimes(1)
  })
})
