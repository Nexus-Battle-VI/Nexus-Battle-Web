import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { HttpError } from '@/lib/http'
import type { SocketFactory, TicketProvider } from '@/features/battle-rooms/realtime'
import { FakeWebSocket } from '@/test/fake-websocket'
import { createTestQueryClient } from '@/test/render'
import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'
import { REALTIME_FALLBACK_POLL_MS, useAuctionRealtime } from './useAuctionRealtime'

const JWT = 'token-vigente'

const setup = (ticketProvider?: TicketProvider) => {
  const queryClient = createTestQueryClient()
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const sockets: FakeWebSocket[] = []
  const factory: SocketFactory = (url) => {
    const socket = new FakeWebSocket(url)
    sockets.push(socket)
    return socket as unknown as WebSocket
  }
  let issued = 0
  const tickets =
    ticketProvider ??
    vi.fn<TicketProvider>(() => Promise.resolve(`ticket-${String((issued += 1))}`))

  return { queryClient, invalidateSpy, wrapper, sockets, factory, tickets }
}

/** Espera a que la conexion pida su ticket y abra el socket N-esimo. */
const socketNumber = async (sockets: FakeWebSocket[], count: number): Promise<FakeWebSocket> => {
  await waitFor(() => {
    expect(sockets).toHaveLength(count)
  })
  return sockets[count - 1]!
}

/** Abre el socket y lo autentica (`authenticated`), como haria Auction con un ticket valido. */
const authenticate = (socket: FakeWebSocket): void => {
  act(() => {
    socket.open()
    socket.message({ type: 'authenticated' })
  })
}

const signalMessage = (auctionId: string, revision: number, reason = 'BID_ACCEPTED') => ({
  type: 'signal',
  channel: `auctions/${auctionId}`,
  signal: {
    signalVersion: 1,
    signalId: `auction:${auctionId}:r${String(revision)}`,
    auctionId,
    revision,
    reason,
    occurredAt: '2026-10-07T12:00:00.000Z',
    summary: { status: 'ACTIVE', currentBidCredits: 25, bidCount: revision },
  },
})

const invalidatedKeys = (spy: ReturnType<typeof setup>['invalidateSpy']): unknown[] =>
  spy.mock.calls.map(([filters]) => filters?.queryKey)

beforeEach(() => {
  useSession.setState({
    subject: 'sujeto-ana',
    accessToken: JWT,
    expiresAt: Date.now() + 900_000,
  })
})

afterEach(() => {
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
  vi.useRealTimers()
})

describe('useAuctionRealtime — conexion (ADR-024: ticket de un solo uso, nunca el JWT en el socket)', () => {
  it('pide un ticket, abre /v1/auctions/realtime SIN credenciales en la URL y autentica con el ticket', async () => {
    const { wrapper, sockets, factory, tickets } = setup()

    renderHook(
      () =>
        useAuctionRealtime({ auctionId: 'a1', socketFactory: factory, ticketProvider: tickets }),
      { wrapper },
    )
    const socket = await socketNumber(sockets, 1)

    expect(tickets).toHaveBeenCalledTimes(1)
    expect(new URL(socket.url).pathname).toBe('/api/v1/auctions/realtime')
    expect(new URL(socket.url).search).toBe('')
    expect(socket.url).not.toContain(JWT)
    expect(socket.url).not.toContain('ticket-1')

    act(() => {
      socket.open()
    })

    expect(socket.frames()).toEqual([{ type: 'auth', ticket: 'ticket-1' }])
  })

  it('se suscribe al canal de la subasta SOLO tras authenticated', async () => {
    const { wrapper, sockets, factory, tickets } = setup()

    renderHook(
      () =>
        useAuctionRealtime({ auctionId: 'a1', socketFactory: factory, ticketProvider: tickets }),
      { wrapper },
    )
    const socket = await socketNumber(sockets, 1)

    act(() => {
      socket.open()
    })
    expect(socket.frames()).toHaveLength(1)

    act(() => {
      socket.message({ type: 'authenticated' })
    })

    expect(socket.frames()).toEqual([
      { type: 'auth', ticket: 'ticket-1' },
      { type: 'subscribe', channel: 'auctions/a1' },
    ])
    expect(socket.sent.join('')).not.toContain(JWT)
  })

  it('Marketplace se suscribe al canal agregado; Detalle + Marketplace, a los dos', async () => {
    const market = setup()
    renderHook(
      () =>
        useAuctionRealtime({
          marketplace: true,
          socketFactory: market.factory,
          ticketProvider: market.tickets,
        }),
      { wrapper: market.wrapper },
    )
    const marketSocket = await socketNumber(market.sockets, 1)
    authenticate(marketSocket)
    expect(marketSocket.frames().slice(1)).toEqual([{ type: 'subscribe', channel: 'auctions' }])

    const both = setup()
    renderHook(
      () =>
        useAuctionRealtime({
          auctionId: 'a1',
          marketplace: true,
          socketFactory: both.factory,
          ticketProvider: both.tickets,
        }),
      { wrapper: both.wrapper },
    )
    const bothSocket = await socketNumber(both.sockets, 1)
    authenticate(bothSocket)
    expect(bothSocket.frames().slice(1)).toEqual([
      { type: 'subscribe', channel: 'auctions/a1' },
      { type: 'subscribe', channel: 'auctions' },
    ])
  })

  it('no abre ninguna conexion si la pantalla no observa nada', () => {
    const { wrapper, sockets, factory, tickets } = setup()

    const { result } = renderHook(
      () => useAuctionRealtime({ socketFactory: factory, ticketProvider: tickets }),
      { wrapper },
    )

    expect(tickets).not.toHaveBeenCalled()
    expect(sockets).toHaveLength(0)
    expect(result.current).toEqual({
      connection: 'disabled',
      live: false,
      fallbackRefetchMs: false,
    })
  })

  it('cierra el socket al desmontar', async () => {
    const { wrapper, sockets, factory, tickets } = setup()

    const { unmount } = renderHook(
      () =>
        useAuctionRealtime({ auctionId: 'a1', socketFactory: factory, ticketProvider: tickets }),
      { wrapper },
    )
    const socket = await socketNumber(sockets, 1)
    authenticate(socket)

    unmount()

    expect(socket.closeCalls).toBeGreaterThan(0)
  })
})

describe('useAuctionRealtime — una senal solo INVALIDA (CA-01, CA-02, CA-05, CA-06)', () => {
  it('CA-01: una puja confirmada invalida detalle, historial, listas y saldo de la subasta observada', async () => {
    const { wrapper, invalidateSpy, sockets, factory, tickets } = setup()

    renderHook(
      () =>
        useAuctionRealtime({ auctionId: 'a1', socketFactory: factory, ticketProvider: tickets }),
      { wrapper },
    )
    const socket = await socketNumber(sockets, 1)
    authenticate(socket)

    act(() => {
      socket.message(signalMessage('a1', 1))
    })

    const keys = invalidatedKeys(invalidateSpy)
    expect(keys).toContainEqual(queryKeys.auction.detail('a1'))
    expect(keys).toContainEqual(queryKeys.auction.bidHistoryAll('a1'))
    expect(keys).toContainEqual(queryKeys.auctions.active)
    expect(keys).toContainEqual(queryKeys.wallet.me)
  })

  it('CA-02: una senal de OTRA subasta no toca el detalle ni el saldo de la observada', async () => {
    const { wrapper, invalidateSpy, sockets, factory, tickets } = setup()

    renderHook(
      () =>
        useAuctionRealtime({ auctionId: 'a1', socketFactory: factory, ticketProvider: tickets }),
      { wrapper },
    )
    const socket = await socketNumber(sockets, 1)
    authenticate(socket)

    act(() => {
      socket.message(signalMessage('a2', 1))
    })

    const keys = invalidatedKeys(invalidateSpy)
    expect(keys).toContainEqual(queryKeys.auction.detail('a2'))
    expect(keys).not.toContainEqual(queryKeys.auction.detail('a1'))
    expect(keys).not.toContainEqual(queryKeys.auction.bidHistoryAll('a1'))
    expect(keys).not.toContainEqual(queryKeys.wallet.me)
  })

  it('CA-05: Marketplace invalida el PREFIJO de las listas (todas las paginas y filtros), sin parchear', async () => {
    const { wrapper, invalidateSpy, queryClient, sockets, factory, tickets } = setup()
    const setDataSpy = vi.spyOn(queryClient, 'setQueryData')

    renderHook(
      () =>
        useAuctionRealtime({
          marketplace: true,
          socketFactory: factory,
          ticketProvider: tickets,
        }),
      { wrapper },
    )
    const socket = await socketNumber(sockets, 1)
    authenticate(socket)

    act(() => {
      socket.message(signalMessage('a1', 1))
    })

    expect(invalidatedKeys(invalidateSpy)).toContainEqual(['auctions', 'active'])
    // El socket nunca escribe datos en la cache: solo la marca como vieja.
    expect(setDataSpy).not.toHaveBeenCalled()
    // Marketplace no muestra el saldo de nadie.
    expect(invalidatedKeys(invalidateSpy)).not.toContainEqual(queryKeys.wallet.me)
  })

  it('CA-04: los estados terminales tambien invalidan', async () => {
    const { wrapper, invalidateSpy, sockets, factory, tickets } = setup()

    renderHook(
      () =>
        useAuctionRealtime({ auctionId: 'a1', socketFactory: factory, ticketProvider: tickets }),
      { wrapper },
    )
    const socket = await socketNumber(sockets, 1)
    authenticate(socket)

    act(() => {
      socket.message(signalMessage('a1', 1))
      socket.message(signalMessage('a1', 2, 'BOUGHT_NOW'))
      socket.message(signalMessage('a1', 3, 'CANCELLED'))
    })

    const detailCalls = invalidatedKeys(invalidateSpy).filter(
      (key) => JSON.stringify(key) === JSON.stringify(queryKeys.auction.detail('a1')),
    )
    expect(detailCalls).toHaveLength(3)
  })

  it('CA-06: una senal repetida o anterior se descarta; una posterior se acepta', async () => {
    const { wrapper, invalidateSpy, sockets, factory, tickets } = setup()

    renderHook(
      () =>
        useAuctionRealtime({ auctionId: 'a1', socketFactory: factory, ticketProvider: tickets }),
      { wrapper },
    )
    const socket = await socketNumber(sockets, 1)
    authenticate(socket)
    const detailCount = (): number =>
      invalidatedKeys(invalidateSpy).filter(
        (key) => JSON.stringify(key) === JSON.stringify(queryKeys.auction.detail('a1')),
      ).length

    act(() => {
      socket.message(signalMessage('a1', 5))
    })
    expect(detailCount()).toBe(1)

    act(() => {
      socket.message(signalMessage('a1', 5)) // duplicada
      socket.message(signalMessage('a1', 4)) // tardia
    })
    expect(detailCount()).toBe(1)

    act(() => {
      socket.message(signalMessage('a1', 6))
    })
    expect(detailCount()).toBe(2)
  })

  it('ignora una senal mal formada, un tipo desconocido y un mensaje que no es JSON, sin lanzar', async () => {
    const { wrapper, invalidateSpy, sockets, factory, tickets } = setup()

    renderHook(
      () =>
        useAuctionRealtime({ auctionId: 'a1', socketFactory: factory, ticketProvider: tickets }),
      { wrapper },
    )
    const socket = await socketNumber(sockets, 1)
    authenticate(socket)

    expect(() => {
      act(() => {
        socket.message({ type: 'signal', signal: { auctionId: 'a1', revision: 'x' } })
        socket.message({ type: 'signal' })
        socket.message({ type: 'error', code: 'INVALID_CHANNEL' })
        socket.message({ type: 'subscribed', channel: 'auctions/a1' })
        socket.message('no-es-json')
      })
    }).not.toThrow()

    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})

describe('useAuctionRealtime — reconexion y recuperacion (CA-03)', () => {
  it('la primera conexion NO invalida nada: no hay nada que recuperar', async () => {
    const { wrapper, invalidateSpy, sockets, factory, tickets } = setup()

    renderHook(
      () =>
        useAuctionRealtime({ auctionId: 'a1', socketFactory: factory, ticketProvider: tickets }),
      { wrapper },
    )
    authenticate(await socketNumber(sockets, 1))

    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it('un resync del servidor relee lo observado', async () => {
    const { wrapper, invalidateSpy, sockets, factory, tickets } = setup()

    renderHook(
      () =>
        useAuctionRealtime({ auctionId: 'a1', socketFactory: factory, ticketProvider: tickets }),
      { wrapper },
    )
    const socket = await socketNumber(sockets, 1)
    authenticate(socket)

    act(() => {
      socket.message({ type: 'resync' })
    })

    const keys = invalidatedKeys(invalidateSpy)
    expect(keys).toContainEqual(queryKeys.auction.detail('a1'))
    expect(keys).toContainEqual(queryKeys.auction.bidHistoryAll('a1'))
    expect(keys).toContainEqual(queryKeys.auctions.active)
  })

  it('tras una caida: deja de decir "en vivo", reconecta con un ticket NUEVO y relee al reautenticar', async () => {
    const { wrapper, invalidateSpy, sockets, factory, tickets } = setup()

    const { result } = renderHook(
      () =>
        useAuctionRealtime({ auctionId: 'a1', socketFactory: factory, ticketProvider: tickets }),
      { wrapper },
    )
    const first = await socketNumber(sockets, 1)
    authenticate(first)
    expect(result.current.live).toBe(true)
    expect(result.current.fallbackRefetchMs).toBe(false)

    vi.useFakeTimers()
    act(() => {
      first.close(1006)
    })

    // Mientras no hay conexion nunca se presenta como actual (CA-03) y hay sondeo de recuperacion.
    expect(result.current.live).toBe(false)
    expect(result.current.connection).toBe('reconnecting')
    expect(result.current.fallbackRefetchMs).toBe(REALTIME_FALLBACK_POLL_MS)
    expect(invalidateSpy).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    vi.useRealTimers()
    const second = await socketNumber(sockets, 2)

    expect(tickets).toHaveBeenCalledTimes(2)
    act(() => {
      second.open()
    })
    expect(second.frames()[0]).toEqual({ type: 'auth', ticket: 'ticket-2' })

    act(() => {
      second.message({ type: 'authenticated' })
    })

    expect(second.frames().slice(1)).toEqual([{ type: 'subscribe', channel: 'auctions/a1' }])
    expect(invalidatedKeys(invalidateSpy)).toContainEqual(queryKeys.auction.detail('a1'))
    expect(result.current.live).toBe(true)
    expect(result.current.fallbackRefetchMs).toBe(false)
  })

  it('tres rechazos 4401 seguidos dejan la conexion en failed, con sondeo HTTP de recuperacion', async () => {
    const { wrapper, sockets, factory, tickets } = setup()

    const { result } = renderHook(
      () =>
        useAuctionRealtime({ auctionId: 'a1', socketFactory: factory, ticketProvider: tickets }),
      { wrapper },
    )

    vi.useFakeTimers()
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(attempt === 1 ? 0 : 10_000)
      })
      const socket = sockets[attempt - 1]!
      act(() => {
        socket.open()
        socket.close(4401)
      })
    }

    expect(result.current.connection).toBe('failed')
    expect(result.current.live).toBe(false)
    expect(result.current.fallbackRefetchMs).toBe(REALTIME_FALLBACK_POLL_MS)
  })
})

describe('useAuctionRealtime — reversion: el realtime apagado en el servidor (ADR-024)', () => {
  it('un 404 al pedir el ticket deja la conexion en disabled: no reintenta ni sondea', async () => {
    const tickets = vi.fn<TicketProvider>(() =>
      Promise.reject(new HttpError(404, 'Not Found', null)),
    )
    const { wrapper, sockets, factory } = setup(tickets)

    const { result } = renderHook(
      () =>
        useAuctionRealtime({ auctionId: 'a1', socketFactory: factory, ticketProvider: tickets }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.connection).toBe('disabled')
    })
    vi.useFakeTimers()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })

    expect(tickets).toHaveBeenCalledTimes(1)
    expect(sockets).toHaveLength(0)
    expect(result.current).toEqual({
      connection: 'disabled',
      live: false,
      fallbackRefetchMs: false,
    })
  })

  it('un fallo de red al pedir el ticket SI se reintenta (no es lo mismo que "apagado")', async () => {
    let attempts = 0
    const tickets = vi.fn<TicketProvider>(() => {
      attempts += 1
      return attempts === 1
        ? Promise.reject(new HttpError(503, 'Service Unavailable', null))
        : Promise.resolve('ticket-ok')
    })
    const { wrapper, sockets, factory } = setup(tickets)

    const { result } = renderHook(
      () =>
        useAuctionRealtime({ auctionId: 'a1', socketFactory: factory, ticketProvider: tickets }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.connection).toBe('reconnecting')
    })
    vi.useFakeTimers()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    vi.useRealTimers()

    await socketNumber(sockets, 1)
    expect(tickets).toHaveBeenCalledTimes(2)
  })

  it('sin sesion no se pide ningun ticket', async () => {
    useSession.setState({ subject: null, accessToken: null, expiresAt: null })
    const { wrapper, sockets, factory, tickets } = setup()

    const { result } = renderHook(
      () =>
        useAuctionRealtime({ auctionId: 'a1', socketFactory: factory, ticketProvider: tickets }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.connection).toBe('disabled')
    })
    expect(tickets).not.toHaveBeenCalled()
    expect(sockets).toHaveLength(0)
  })
})
