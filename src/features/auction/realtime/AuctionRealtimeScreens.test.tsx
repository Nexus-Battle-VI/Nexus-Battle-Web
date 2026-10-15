import { act, screen, waitFor, within } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as catalogApi from '@/features/catalog/api'
import { useSession } from '@/shared/session'
import { FakeWebSocket } from '@/test/fake-websocket'
import { renderWithProviders } from '@/test/render'
import * as auctionApi from '../api'
import { AuctionDetailPage } from '../AuctionDetailPage'
import { AuctionMarketplace } from '../AuctionMarketplace'
import * as detailApi from '../detail-api'
import { issueAuctionRealtimeTicket } from './api'

/**
 * EN-034 a nivel de pantalla: lo que VE la persona cuando llegan senales. Complementa
 * `useAuctionRealtime.test.tsx` (que prueba las invalidaciones) comprobando que el Detalle y
 * Marketplace vuelven a leer del backend y se actualizan, y que dejan de ofrecer acciones
 * incompatibles (CA-01, CA-03, CA-04, CA-05, CA-06).
 */

const AUCTION_ID = 'auction-123'

const detail = (
  patch: Partial<detailApi.PlayerAuctionDetail> = {},
): detailApi.PlayerAuctionDetail => ({
  id: AUCTION_ID,
  sellerId: 'seller-1',
  sellerDisplayName: 'Ana Ramirez',
  sellerAvatarUrl: null,
  productId: 'product-1',
  publisherType: 'PLAYER',
  priceKind: 'CREDITS',
  durationHours: 24,
  publicationFeeCredits: 1,
  minimumBidCredits: 10,
  buyNowCredits: 2500,
  currency: null,
  minimumBidAmountMinor: null,
  buyNowAmountMinor: null,
  officialMark: null,
  status: 'ACTIVE',
  publishedAt: '2026-09-20T12:00:00.000Z',
  closesAt: '2099-09-22T12:00:00.000Z',
  currentBid: null,
  bidCount: 0,
  ...patch,
})

const product = {
  productId: 'product-1',
  sku: 'product-1',
  name: 'Espada Legendaria Nexus',
  type: 'ARMA',
  imageUrl: '',
  description: '',
  lifecycleStatus: 'ACTIVE',
  creditsPrice: 10,
  premium: false,
  realMoneyPrice: null,
  averageRating: null,
  reviewCount: 0,
}

const signal = (revision: number, reason: string, auctionId = AUCTION_ID) => ({
  type: 'signal',
  channel: `auctions/${auctionId}`,
  signal: {
    signalVersion: 1,
    signalId: `auction:${auctionId}:r${String(revision)}`,
    auctionId,
    revision,
    reason,
    occurredAt: '2026-10-07T12:00:00.000Z',
  },
})

/** Sustituye el `WebSocket` global (el que usa `defaultSocketFactory`) por el doble. */
const stubSockets = (): FakeWebSocket[] => {
  const sockets: FakeWebSocket[] = []
  class CapturedSocket extends FakeWebSocket {
    constructor(url: string) {
      super(url)
      sockets.push(this)
    }
  }
  vi.stubGlobal('WebSocket', CapturedSocket)
  return sockets
}

const authenticate = (socket: FakeWebSocket): void => {
  act(() => {
    socket.open()
    socket.message({ type: 'authenticated' })
  })
}

beforeEach(() => {
  useSession.setState({ subject: 'buyer-1', accessToken: 'token', expiresAt: null })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  useSession.setState({ roles: [], subject: null, accessToken: null })
})

describe('Detalle de subasta con senales en vivo', () => {
  const mount = (): void => {
    renderWithProviders(
      <Routes>
        <Route path="/auction/:auctionId" element={<AuctionDetailPage />} />
      </Routes>,
      { route: `/auction/${AUCTION_ID}` },
    )
  }

  beforeEach(() => {
    vi.mocked(issueAuctionRealtimeTicket).mockResolvedValue('ticket-1')
    vi.spyOn(auctionApi, 'fetchWatchlist').mockResolvedValue({ items: [] })
    vi.spyOn(catalogApi, 'fetchCanonicalProduct').mockResolvedValue(product)
    vi.spyOn(detailApi, 'fetchBuyerCredits').mockResolvedValue({ balance: 5000 })
    vi.spyOn(detailApi, 'fetchAuctionBidHistory').mockResolvedValue({
      page: 1,
      pageSize: 10,
      total: 0,
      items: [],
    })
  })

  it('CA-04: al cancelarse la subasta desde otra sesion, vuelve a leer y deja de ofrecer comprar', async () => {
    const sockets = stubSockets()
    const fetchDetail = vi
      .spyOn(detailApi, 'fetchAuctionDetail')
      .mockResolvedValueOnce(detail())
      .mockResolvedValue(detail({ status: 'CANCELLED' }))

    mount()
    expect(await screen.findByRole('button', { name: 'Comprar ahora' })).toBeInTheDocument()
    await waitFor(() => {
      expect(sockets).toHaveLength(1)
    })
    authenticate(sockets[0]!)
    expect(await screen.findByTestId('auction-live-indicator')).toHaveTextContent('En vivo')
    expect(fetchDetail).toHaveBeenCalledTimes(1)

    // La senal NO trae el estado: solo avisa. Lo que decide la pantalla es lo que devuelve el backend.
    act(() => {
      sockets[0]!.message(signal(1, 'CANCELLED'))
    })

    await waitFor(() => {
      expect(fetchDetail).toHaveBeenCalledTimes(2)
    })
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Comprar ahora' })).not.toBeInTheDocument()
    })
  })

  it('CA-06: una senal repetida o tardia no provoca otra lectura', async () => {
    const sockets = stubSockets()
    const fetchDetail = vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(detail())

    mount()
    await screen.findByRole('button', { name: 'Comprar ahora' })
    await waitFor(() => {
      expect(sockets).toHaveLength(1)
    })
    authenticate(sockets[0]!)

    act(() => {
      sockets[0]!.message(signal(5, 'BID_ACCEPTED'))
    })
    await waitFor(() => {
      expect(fetchDetail).toHaveBeenCalledTimes(2)
    })

    act(() => {
      sockets[0]!.message(signal(5, 'BID_ACCEPTED'))
      sockets[0]!.message(signal(4, 'BID_ACCEPTED'))
    })
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(fetchDetail).toHaveBeenCalledTimes(2)
  })

  it('CA-02: una senal de otra subasta no vuelve a leer ESTE detalle', async () => {
    const sockets = stubSockets()
    const fetchDetail = vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(detail())

    mount()
    await screen.findByRole('button', { name: 'Comprar ahora' })
    await waitFor(() => {
      expect(sockets).toHaveLength(1)
    })
    authenticate(sockets[0]!)

    act(() => {
      sockets[0]!.message(signal(1, 'BID_ACCEPTED', 'otra-subasta'))
    })
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(fetchDetail).toHaveBeenCalledTimes(1)
  })

  it('CA-03: al perder la conexion deja de decir "En vivo" y avisa que puede estar desactualizado', async () => {
    const sockets = stubSockets()
    vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(detail())

    mount()
    await screen.findByRole('button', { name: 'Comprar ahora' })
    await waitFor(() => {
      expect(sockets).toHaveLength(1)
    })
    authenticate(sockets[0]!)
    expect(await screen.findByTestId('auction-live-indicator')).toHaveTextContent('En vivo')

    act(() => {
      sockets[0]!.close(1006)
    })

    const indicator = await screen.findByTestId('auction-live-indicator')
    expect(indicator).toHaveTextContent(/Reconectando/u)
    expect(indicator).not.toHaveTextContent('En vivo')
  })

  it('con el realtime apagado en el servidor (404) la pantalla se ve y funciona como siempre', async () => {
    const { HttpError } = await import('@/lib/http')
    vi.mocked(issueAuctionRealtimeTicket).mockRejectedValue(new HttpError(404, 'Not Found', null))
    const sockets = stubSockets()
    const fetchDetail = vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(detail())

    mount()

    expect(await screen.findByRole('button', { name: 'Comprar ahora' })).toBeInTheDocument()
    expect(screen.queryByTestId('auction-live-indicator')).not.toBeInTheDocument()
    expect(sockets).toHaveLength(0)
    expect(fetchDetail).toHaveBeenCalledTimes(1)
  })
})

describe('Marketplace con senales en vivo', () => {
  const page = (bidCount: number) => ({
    page: 1,
    pageSize: 16,
    total: 1,
    items: [
      {
        id: 'player-1',
        sellerId: 'player-1',
        publisherType: 'PLAYER',
        productId: 'owned-1',
        priceKind: 'CREDITS',
        minimumBidCredits: 10,
        buyNowCredits: 20,
        currency: null,
        minimumBidAmountMinor: null,
        buyNowAmountMinor: null,
        officialMark: null,
        status: 'ACTIVE',
        currentBidAmount: 40,
        bidCount,
        publishedAt: '2026-09-24T12:00:00.000Z',
        closesAt: '2099-09-25T12:00:00.000Z',
      },
    ],
  })

  const stubFetch = (): { listCalls: () => number; setBidCount: (value: number) => void } => {
    let bidCount = 3
    let listCalls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        const json = (body: unknown): Promise<Response> =>
          Promise.resolve(
            new Response(JSON.stringify(body), {
              headers: { 'content-type': 'application/json' },
              status: 200,
            }),
          )
        if (url.includes('/v1/catalog/products/')) {
          return json({ ...product, productId: 'owned-1', name: 'Espada del Nexo' })
        }
        listCalls += 1
        return json(page(bidCount))
      }),
    )
    return {
      listCalls: () => listCalls,
      setBidCount: (value) => {
        bidCount = value
      },
    }
  }

  beforeEach(() => {
    vi.mocked(issueAuctionRealtimeTicket).mockResolvedValue('ticket-1')
  })

  it('CA-05: una senal vuelve a leer la lista y muestra el dato nuevo, sin mezclar paginas ni filtros', async () => {
    const sockets = stubSockets()
    const backend = stubFetch()

    renderWithProviders(<AuctionMarketplace />)
    expect(await screen.findByText('Espada del Nexo')).toBeInTheDocument()
    await waitFor(() => {
      expect(sockets).toHaveLength(1)
    })
    authenticate(sockets[0]!)
    expect(await screen.findByTestId('auction-live-indicator')).toHaveTextContent('En vivo')
    expect(sockets[0]!.frames()).toContainEqual({ type: 'subscribe', channel: 'auctions' })
    const before = backend.listCalls()
    expect(
      within(screen.getByRole('article')).getByText('Pujas').nextElementSibling,
    ).toHaveTextContent('3')

    backend.setBidCount(9)
    act(() => {
      sockets[0]!.message(signal(1, 'BID_ACCEPTED', 'player-1'))
    })

    await waitFor(() => {
      expect(backend.listCalls()).toBeGreaterThan(before)
    })
    // La tarjeta muestra lo que devolvio el backend en la nueva lectura, no lo que dijo la senal.
    await waitFor(() => {
      expect(
        within(screen.getByRole('article')).getByText('Pujas').nextElementSibling,
      ).toHaveTextContent('9')
    })
  })

  it('al reconectar relee la lista aunque no haya llegado ninguna senal (CA-03)', async () => {
    const sockets = stubSockets()
    const backend = stubFetch()

    renderWithProviders(<AuctionMarketplace />)
    await screen.findByText('Espada del Nexo')
    await waitFor(() => {
      expect(sockets).toHaveLength(1)
    })
    authenticate(sockets[0]!)
    const before = backend.listCalls()

    act(() => {
      sockets[0]!.message({ type: 'resync' })
    })

    await waitFor(() => {
      expect(backend.listCalls()).toBeGreaterThan(before)
    })
  })

  it('con el realtime apagado (404) no hay indicador, ni socket, ni sondeo', async () => {
    const { HttpError } = await import('@/lib/http')
    vi.mocked(issueAuctionRealtimeTicket).mockRejectedValue(new HttpError(404, 'Not Found', null))
    const sockets = stubSockets()
    const backend = stubFetch()

    renderWithProviders(<AuctionMarketplace />)
    await screen.findByText('Espada del Nexo')
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(screen.queryByTestId('auction-live-indicator')).not.toBeInTheDocument()
    expect(sockets).toHaveLength(0)
    expect(backend.listCalls()).toBe(1)
  })
})
