import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'
import { AuctionMarketplace } from './AuctionMarketplace'

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

describe('AuctionMarketplace HU-66.6', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    useSession.setState({ roles: [] })
  })

  it('presenta el orden del backend, etiquetas textuales y dinero localizado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse({
            page: 1,
            pageSize: 12,
            total: 2,
            items: [
              {
                id: 'official-1',
                sellerId: 'upb-company',
                publisherType: 'GAME_MASTER',
                productId: 'exclusive-1',
                priceKind: 'REAL_MONEY',
                minimumBidCredits: null,
                buyNowCredits: null,
                currency: 'COP',
                minimumBidAmountMinor: 90_000,
                buyNowAmountMinor: 120_000,
                officialMark: 'PREMIUM',
                status: 'ACTIVE',
                currentBidAmount: null,
                publishedAt: '2026-09-24T12:00:00.000Z',
                closesAt: '2026-09-26T12:00:00.000Z',
              },
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
                currentBidAmount: null,
                publishedAt: '2026-09-24T12:00:00.000Z',
                closesAt: '2026-09-25T12:00:00.000Z',
              },
            ],
          }),
        ),
      ),
    )
    renderWithProviders(<AuctionMarketplace />)

    const cards = await screen.findAllByRole('article')
    expect(within(cards[0]!).getByText('Producto exclusive-1')).toBeInTheDocument()
    expect(within(cards[0]!).getByLabelText('Publicación oficial: Premium')).toHaveTextContent(
      'Premium',
    )
    expect(within(cards[0]!).getByText(/900/u)).toBeInTheDocument()
    expect(within(cards[1]!).getByText('10 créditos')).toBeInTheDocument()
    expect(screen.getByText(/publicaciones oficiales aparecen primero/u)).toBeInTheDocument()
    expect(within(cards[1]!).getByRole('link', { name: 'Ver detalle' })).toHaveAttribute(
      'href',
      '/auction/player-1',
    )
  })

  /**
   * `GET /v1/auctions/:id` solo resuelve subastas de jugador (`findById`,
   * no `findOfficialById`): un enlace a "Ver detalle" en una tarjeta oficial
   * llevaria a un 404. Se oculta en vez de ofrecer un enlace roto.
   */
  it('no ofrece "Ver detalle" en una tarjeta oficial', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse({
            page: 1,
            pageSize: 12,
            total: 1,
            items: [
              {
                id: 'official-1',
                sellerId: 'upb-company',
                publisherType: 'GAME_MASTER',
                productId: 'exclusive-1',
                priceKind: 'REAL_MONEY',
                minimumBidCredits: null,
                buyNowCredits: null,
                currency: 'COP',
                minimumBidAmountMinor: 90_000,
                buyNowAmountMinor: 120_000,
                officialMark: 'OFFICIAL',
                status: 'ACTIVE',
                currentBidAmount: null,
                publishedAt: '2026-09-24T12:00:00.000Z',
                closesAt: '2026-09-26T12:00:00.000Z',
              },
            ],
          }),
        ),
      ),
    )
    renderWithProviders(<AuctionMarketplace />)

    const card = (await screen.findAllByRole('article'))[0]!
    expect(within(card).queryByRole('link', { name: 'Ver detalle' })).not.toBeInTheDocument()
  })

  /**
   * HU-66.6: el listado es el punto de entrada real; desde aqui hay que
   * poder llegar a seguir subastas (HU-68) y a publicar la propia (HU-62.5)
   * sin escribir ninguna URL a mano.
   */
  it('ofrece navegar a seguimiento y a publicar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse({ items: [], page: 1, pageSize: 12, total: 0 }))),
    )
    renderWithProviders(<AuctionMarketplace />)

    expect(await screen.findByRole('link', { name: 'Mis subastas seguidas' })).toHaveAttribute(
      'href',
      '/auction/watchlist',
    )
    expect(screen.getByRole('link', { name: 'Publicar mi subasta' })).toHaveAttribute(
      'href',
      '/auction/publish',
    )
    expect(
      screen.queryByRole('link', { name: 'Publicar producto oficial' }),
    ).not.toBeInTheDocument()
  })

  it('el Maestro de Juego ve ademas el acceso a publicar oficial', async () => {
    useSession.setState({ roles: ['GAME_MASTER'] })
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse({ items: [], page: 1, pageSize: 12, total: 0 }))),
    )
    renderWithProviders(<AuctionMarketplace />)

    expect(await screen.findByRole('link', { name: 'Publicar producto oficial' })).toHaveAttribute(
      'href',
      '/auction/publish-official',
    )
  })

  it('distingue los estados de carga, vacio y error', async () => {
    let resolveRequest: ((response: Response) => void) | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveRequest = resolve
          }),
      ),
    )
    const { unmount } = renderWithProviders(<AuctionMarketplace />)
    expect(screen.getByRole('status')).toHaveTextContent('Cargando')
    resolveRequest?.(jsonResponse({ items: [], page: 1, pageSize: 12, total: 0 }))
    expect(await screen.findByText('No hay subastas activas en este momento.')).toBeInTheDocument()
    unmount()

    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse({ message: 'Auction no disponible.' }, 503),
    )
    renderWithProviders(<AuctionMarketplace />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Auction no disponible')
  })
})
