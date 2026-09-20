import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { createTestQueryClient } from '@/test/render'
import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'
import { useBattleRoomRealtime } from './useBattleRoomRealtime'
import type { SocketFactory } from './realtime'

/** Doble minimo de `WebSocket`: suficiente para lo que el hook usa. */
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

const AUTHENTICATED = {
  subject: 'sujeto-ana',
  accessToken: 'token-vigente',
  expiresAt: Date.now() + 900_000,
}

const setup = () => {
  const queryClient = createTestQueryClient()
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, invalidateSpy, wrapper }
}

beforeEach(() => {
  useSession.setState(AUTHENTICATED)
})

afterEach(() => {
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
  vi.useRealTimers()
})

describe('useBattleRoomRealtime', () => {
  it('autentica y se suscribe a la sala apenas el socket abre', () => {
    const sockets: FakeSocket[] = []
    const factory: SocketFactory = (url) => {
      const socket = new FakeSocket(url)
      sockets.push(socket)
      return socket as unknown as WebSocket
    }
    const { wrapper } = setup()

    renderHook(() => useBattleRoomRealtime('room-1', factory), { wrapper })

    expect(sockets).toHaveLength(1)
    sockets[0]!.open()

    expect(sockets[0]!.sent).toEqual([
      JSON.stringify({ type: 'auth', token: 'token-vigente' }),
      JSON.stringify({ type: 'subscribe', roomId: 'room-1' }),
    ])
  })

  it('invalida el listado de salas al recibir battle-room.updated de la sala vigilada', async () => {
    const sockets: FakeSocket[] = []
    const factory: SocketFactory = (url) => {
      const socket = new FakeSocket(url)
      sockets.push(socket)
      return socket as unknown as WebSocket
    }
    const { wrapper, invalidateSpy } = setup()

    renderHook(() => useBattleRoomRealtime('room-1', factory), { wrapper })
    sockets[0]!.open()
    sockets[0]!.message({
      type: 'battle-room.updated',
      roomId: 'room-1',
      status: 'PREPARING',
      version: 2,
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.battleRooms.list })
    })
  })

  it('IGNORA un battle-room.updated de otra sala', () => {
    const sockets: FakeSocket[] = []
    const factory: SocketFactory = (url) => {
      const socket = new FakeSocket(url)
      sockets.push(socket)
      return socket as unknown as WebSocket
    }
    const { wrapper, invalidateSpy } = setup()

    renderHook(() => useBattleRoomRealtime('room-1', factory), { wrapper })
    sockets[0]!.open()
    sockets[0]!.message({ type: 'battle-room.updated', roomId: 'otra-sala', status: 'PREPARING' })

    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it('ignora un mensaje que no es JSON valido, sin lanzar', () => {
    const sockets: FakeSocket[] = []
    const factory: SocketFactory = (url) => {
      const socket = new FakeSocket(url)
      sockets.push(socket)
      return socket as unknown as WebSocket
    }
    const { wrapper } = setup()

    renderHook(() => useBattleRoomRealtime('room-1', factory), { wrapper })
    sockets[0]!.open()

    expect(() => {
      sockets[0]!.dispatchEvent(new MessageEvent('message', { data: 'no-es-json' }))
    }).not.toThrow()
  })

  it('reconecta con backoff acotado tras un cierre inesperado, sin bucle agresivo', () => {
    vi.useFakeTimers()
    const sockets: FakeSocket[] = []
    const factory: SocketFactory = (url) => {
      const socket = new FakeSocket(url)
      sockets.push(socket)
      return socket as unknown as WebSocket
    }
    const { wrapper } = setup()

    const { result } = renderHook(() => useBattleRoomRealtime('room-1', factory), { wrapper })
    expect(sockets).toHaveLength(1)

    act(() => {
      sockets[0]!.open()
    })
    expect(result.current.connection).toBe('open')

    act(() => {
      sockets[0]!.close()
    })
    expect(result.current.connection).toBe('reconnecting')
    // Todavia no paso el primer retraso: no debe haber intentado un segundo socket.
    expect(sockets).toHaveLength(1)

    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(sockets).toHaveLength(2)
  })

  it('limpia la conexion al desmontar: cierra el socket y cancela la reconexion pendiente', () => {
    vi.useFakeTimers()
    const sockets: FakeSocket[] = []
    const factory: SocketFactory = (url) => {
      const socket = new FakeSocket(url)
      sockets.push(socket)
      return socket as unknown as WebSocket
    }
    const { wrapper } = setup()

    const { unmount } = renderHook(() => useBattleRoomRealtime('room-1', factory), { wrapper })
    sockets[0]!.open()

    unmount()

    expect(sockets[0]!.closed).toBe(true)

    // El `close` disparado arriba en principio programaria una reconexion;
    // tras desmontar, avanzar el reloj NO debe abrir un segundo socket.
    vi.advanceTimersByTime(15_000)
    expect(sockets).toHaveLength(1)
  })

  it('no conecta cuando no hay sala vigilada (roomId null)', () => {
    const factory = vi.fn()
    const { wrapper } = setup()

    const { result } = renderHook(() => useBattleRoomRealtime(null, factory), { wrapper })

    expect(factory).not.toHaveBeenCalled()
    expect(result.current.connection).toBe('disabled')
  })

  it('no conecta sin testimonio vigente', () => {
    useSession.setState({ subject: null, accessToken: null, expiresAt: null })
    const factory = vi.fn()
    const { wrapper } = setup()

    const { result } = renderHook(() => useBattleRoomRealtime('room-1', factory), { wrapper })

    expect(factory).not.toHaveBeenCalled()
    expect(result.current.connection).toBe('disabled')
  })

  it('expone el status del ultimo battle-room.updated de la sala vigilada (HU-15.3: distinguir cancelada de llena)', () => {
    const sockets: FakeSocket[] = []
    const factory: SocketFactory = (url) => {
      const socket = new FakeSocket(url)
      sockets.push(socket)
      return socket as unknown as WebSocket
    }
    const { wrapper } = setup()

    const { result } = renderHook(() => useBattleRoomRealtime('room-1', factory), { wrapper })
    expect(result.current.lastRoomStatus).toBeNull()

    act(() => {
      sockets[0]!.open()
      sockets[0]!.message({
        type: 'battle-room.updated',
        roomId: 'room-1',
        status: 'CANCELLED',
        version: 3,
      })
    })

    expect(result.current.lastRoomStatus).toBe('CANCELLED')
  })

  it('IGNORA para lastRoomStatus un battle-room.updated de otra sala', () => {
    const sockets: FakeSocket[] = []
    const factory: SocketFactory = (url) => {
      const socket = new FakeSocket(url)
      sockets.push(socket)
      return socket as unknown as WebSocket
    }
    const { wrapper } = setup()

    const { result } = renderHook(() => useBattleRoomRealtime('room-1', factory), { wrapper })

    act(() => {
      sockets[0]!.open()
      sockets[0]!.message({ type: 'battle-room.updated', roomId: 'otra-sala', status: 'CANCELLED' })
    })

    expect(result.current.lastRoomStatus).toBeNull()
  })
})
