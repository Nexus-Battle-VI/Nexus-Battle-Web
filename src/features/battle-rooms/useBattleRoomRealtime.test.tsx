import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { HttpError } from '@/lib/http'
import { createTestQueryClient } from '@/test/render'
import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'
import { useBattleRoomRealtime } from './useBattleRoomRealtime'
import type { SocketFactory, TicketProvider } from './realtime'

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

  /** Cierre iniciado por el servidor con un codigo (p. ej. 4401). */
  remoteClose(code: number): void {
    this.dispatchEvent(new CloseEvent('close', { code }))
  }

  open(): void {
    this.dispatchEvent(new Event('open'))
  }

  message(data: unknown): void {
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(data) }))
  }
}

const JWT = 'token-vigente'

const AUTHENTICATED = {
  subject: 'sujeto-ana',
  accessToken: JWT,
  expiresAt: Date.now() + 900_000,
}

const setup = () => {
  const queryClient = createTestQueryClient()
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const sockets: FakeSocket[] = []
  const factory: SocketFactory = (url) => {
    const socket = new FakeSocket(url)
    sockets.push(socket)
    return socket as unknown as WebSocket
  }
  let issued = 0
  const tickets = vi.fn<TicketProvider>(() => Promise.resolve(`ticket-${String((issued += 1))}`))

  return { queryClient, invalidateSpy, wrapper, sockets, factory, tickets }
}

/** Espera a que la conexion pida su ticket y abra el socket N-esimo. */
const socketNumber = async (sockets: FakeSocket[], count: number): Promise<FakeSocket> => {
  await waitFor(() => {
    expect(sockets).toHaveLength(count)
  })
  return sockets[count - 1]!
}

/** Abre el socket y lo autentica (`auth.ok`), como haria Combat con un ticket valido. */
const authenticate = (socket: FakeSocket): void => {
  act(() => {
    socket.open()
    socket.message({ type: 'auth.ok' })
  })
}

beforeEach(() => {
  useSession.setState(AUTHENTICATED)
})

afterEach(() => {
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
  vi.useRealTimers()
})

describe('useBattleRoomRealtime — ADR-020: ticket de un solo uso, nunca el JWT en el socket', () => {
  it('pide un ticket, abre el socket SIN credenciales en la URL y autentica con el ticket como primer mensaje', async () => {
    const { wrapper, sockets, factory, tickets } = setup()

    renderHook(() => useBattleRoomRealtime('room-1', factory, tickets), { wrapper })
    const socket = await socketNumber(sockets, 1)

    expect(tickets).toHaveBeenCalledTimes(1)
    expect(new URL(socket.url).search).toBe('')
    expect(socket.url).not.toContain(JWT)
    expect(socket.url).not.toContain('ticket')

    act(() => {
      socket.open()
    })

    expect(socket.sent).toEqual([JSON.stringify({ type: 'auth', ticket: 'ticket-1' })])
  })

  it('se suscribe a la sala SOLO tras auth.ok, y el JWT nunca viaja por el socket', async () => {
    const { wrapper, sockets, factory, tickets } = setup()

    renderHook(() => useBattleRoomRealtime('room-1', factory, tickets), { wrapper })
    const socket = await socketNumber(sockets, 1)

    act(() => {
      socket.open()
    })
    expect(socket.sent).toHaveLength(1)

    act(() => {
      socket.message({ type: 'auth.ok' })
    })

    expect(socket.sent).toEqual([
      JSON.stringify({ type: 'auth', ticket: 'ticket-1' }),
      JSON.stringify({ type: 'subscribe', roomId: 'room-1' }),
    ])
    expect(socket.sent.join('')).not.toContain(JWT)
  })

  it('invalida el listado, "mis salas" y la sala al recibir battle-room.updated de la sala vigilada', async () => {
    const { wrapper, invalidateSpy, sockets, factory, tickets } = setup()

    renderHook(() => useBattleRoomRealtime('room-1', factory, tickets), { wrapper })
    const socket = await socketNumber(sockets, 1)

    authenticate(socket)
    act(() => {
      socket.message({
        type: 'battle-room.updated',
        roomId: 'room-1',
        status: 'PREPARING',
        version: 2,
      })
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.battleRooms.list })
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.battleRooms.detail('room-1') })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.battleRooms.mine })
  })

  it('IGNORA un battle-room.updated de otra sala', async () => {
    const { wrapper, invalidateSpy, sockets, factory, tickets } = setup()

    renderHook(() => useBattleRoomRealtime('room-1', factory, tickets), { wrapper })
    const socket = await socketNumber(sockets, 1)

    authenticate(socket)
    act(() => {
      socket.message({ type: 'battle-room.updated', roomId: 'otra-sala', status: 'PREPARING' })
    })

    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it('ignora un mensaje que no es JSON valido, sin lanzar', async () => {
    const { wrapper, sockets, factory, tickets } = setup()

    renderHook(() => useBattleRoomRealtime('room-1', factory, tickets), { wrapper })
    const socket = await socketNumber(sockets, 1)

    authenticate(socket)

    expect(() => {
      socket.dispatchEvent(new MessageEvent('message', { data: 'no-es-json' }))
    }).not.toThrow()
  })

  it('reconecta con backoff acotado y un ticket NUEVO cada vez (un ticket es de un solo uso)', async () => {
    const { wrapper, sockets, factory, tickets } = setup()

    const { result } = renderHook(() => useBattleRoomRealtime('room-1', factory, tickets), {
      wrapper,
    })
    const first = await socketNumber(sockets, 1)

    authenticate(first)
    expect(result.current.connection).toBe('open')

    vi.useFakeTimers()
    act(() => {
      first.close()
    })
    expect(result.current.connection).toBe('reconnecting')
    // Todavia no paso el primer retraso: no debe haber intentado un segundo ticket.
    expect(tickets).toHaveBeenCalledTimes(1)

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
  })

  it('tres rechazos 4401 consecutivos detienen los intentos (failed) en lugar de reintentar sin fin', async () => {
    const { wrapper, sockets, factory, tickets } = setup()

    const { result } = renderHook(() => useBattleRoomRealtime('room-1', factory, tickets), {
      wrapper,
    })

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const socket = await socketNumber(sockets, attempt)

      act(() => {
        socket.open()
        socket.remoteClose(4401)
      })

      if (attempt < 3) {
        await waitFor(
          () => {
            expect(sockets).toHaveLength(attempt + 1)
          },
          { timeout: 5_000 },
        )
      }
    }

    expect(result.current.connection).toBe('failed')
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(sockets).toHaveLength(3)
  }, 15_000)

  it('un 401 al pedir el ticket (sesion vencida) deshabilita la conexion, sin socket', async () => {
    const { wrapper, sockets, factory } = setup()
    const tickets = vi.fn<TicketProvider>(() =>
      Promise.reject(new HttpError(401, 'Sesion vencida', null)),
    )

    const { result } = renderHook(() => useBattleRoomRealtime('room-1', factory, tickets), {
      wrapper,
    })

    await waitFor(() => {
      expect(result.current.connection).toBe('disabled')
    })
    expect(sockets).toHaveLength(0)
  })

  it('limpia la conexion al desmontar: cierra el socket y cancela la reconexion pendiente', async () => {
    const { wrapper, sockets, factory, tickets } = setup()

    const { unmount } = renderHook(() => useBattleRoomRealtime('room-1', factory, tickets), {
      wrapper,
    })
    const socket = await socketNumber(sockets, 1)

    authenticate(socket)
    unmount()

    expect(socket.closed).toBe(true)

    // Tras desmontar, ninguna reconexion pendiente debe abrir otro socket.
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(sockets).toHaveLength(1)
    expect(tickets).toHaveBeenCalledTimes(1)
  })

  it('no conecta cuando no hay sala vigilada (roomId null)', () => {
    const { wrapper, factory, tickets } = setup()

    const { result } = renderHook(() => useBattleRoomRealtime(null, factory, tickets), { wrapper })

    expect(tickets).not.toHaveBeenCalled()
    expect(result.current.connection).toBe('disabled')
  })

  it('no conecta sin testimonio vigente: ni pide ticket ni abre socket', () => {
    useSession.setState({ subject: null, accessToken: null, expiresAt: null })
    const { wrapper, factory, tickets } = setup()

    const { result } = renderHook(() => useBattleRoomRealtime('room-1', factory, tickets), {
      wrapper,
    })

    expect(tickets).not.toHaveBeenCalled()
    expect(result.current.connection).toBe('disabled')
  })

  it('expone el status del ultimo battle-room.updated de la sala vigilada (HU-15.3: distinguir cancelada de llena)', async () => {
    const { wrapper, sockets, factory, tickets } = setup()

    const { result } = renderHook(() => useBattleRoomRealtime('room-1', factory, tickets), {
      wrapper,
    })
    expect(result.current.lastRoomStatus).toBeNull()
    const socket = await socketNumber(sockets, 1)

    authenticate(socket)
    act(() => {
      socket.message({
        type: 'battle-room.updated',
        roomId: 'room-1',
        status: 'CANCELLED',
        version: 3,
      })
    })

    expect(result.current.lastRoomStatus).toBe('CANCELLED')
  })

  it('IGNORA para lastRoomStatus un battle-room.updated de otra sala', async () => {
    const { wrapper, sockets, factory, tickets } = setup()

    const { result } = renderHook(() => useBattleRoomRealtime('room-1', factory, tickets), {
      wrapper,
    })
    const socket = await socketNumber(sockets, 1)

    authenticate(socket)
    act(() => {
      socket.message({ type: 'battle-room.updated', roomId: 'otra-sala', status: 'CANCELLED' })
    })

    expect(result.current.lastRoomStatus).toBeNull()
  })
})
