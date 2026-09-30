import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'
import { AuctionMarketplace } from './AuctionMarketplace'

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' }, status })

const urlOf = (input: RequestInfo | URL): string =>
  typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

const product = (productId: string, name: string, type: string, imageUrl = '') => ({
  productId,
  sku: productId,
  name,
  type,
  imageUrl,
  description: '',
  lifecycleStatus: 'ACTIVE',
  creditsPrice: 10,
  premium: false,
  realMoneyPrice: null,
  averageRating: null,
  reviewCount: 0,
})

const auctions = [
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
]

const activeAuctionPage = (total: number, page = 1) => ({
  page,
  pageSize: 16,
  total,
  items: auctions,
})

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ roles: [] })
})

describe('AuctionMarketplace', () => {
  it('muestra nombre, tipo e imagen de Catalog sin usar el UUID como titulo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = urlOf(input)
        if (url.includes('/v1/catalog/products/exclusive-1'))
          return Promise.resolve(
            jsonResponse(
              product(
                'exclusive-1',
                'Corona del Nexo',
                'EPICA',
                'https://assets.example.test/corona.webp',
              ),
            ),
          )
        if (url.includes('/v1/catalog/products/owned-1'))
          return Promise.resolve(jsonResponse(product('owned-1', 'Espada del Nexo', 'ARMA')))
        return Promise.resolve(jsonResponse(activeAuctionPage(2)))
      }),
    )
    renderWithProviders(<AuctionMarketplace />)

    await screen.findByText('Corona del Nexo')
    const cards = screen.getAllByRole('article')
    expect(within(cards[0]!).getByText('Corona del Nexo')).toBeInTheDocument()
    expect(within(cards[0]!).getByText('EPICA')).toBeInTheDocument()
    expect(within(cards[0]!).getByAltText('Corona del Nexo')).toBeInTheDocument()
    expect(within(cards[0]!).queryByText('Producto exclusive-1')).not.toBeInTheDocument()
    expect(within(cards[0]!).getByLabelText('Publicación oficial: Premium')).toHaveTextContent(
      'Premium',
    )
    expect(within(cards[1]!).getByText('Espada del Nexo')).toBeInTheDocument()
    expect(within(cards[1]!).getByRole('link', { name: 'Ver detalle' })).toHaveAttribute(
      'href',
      '/auction/player-1',
    )
  })

  it('mantiene las otras tarjetas si Catalog falla para una', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = urlOf(input)
        if (url.includes('/v1/catalog/products/exclusive-1'))
          return Promise.resolve(jsonResponse({ message: 'not found' }, 404))
        if (url.includes('/v1/catalog/products/owned-1'))
          return Promise.resolve(jsonResponse(product('owned-1', 'Espada del Nexo', 'ARMA')))
        return Promise.resolve(jsonResponse(activeAuctionPage(2)))
      }),
    )
    renderWithProviders(<AuctionMarketplace />)

    expect(await screen.findByText('Espada del Nexo')).toBeInTheDocument()
    expect(screen.getAllByText('Producto')).toHaveLength(1)
  })

  it('no ofrece detalle para una subasta oficial', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = urlOf(input)
        if (url.includes('/v1/catalog/products/'))
          return Promise.resolve(jsonResponse(product('exclusive-1', 'Corona', 'EPICA')))
        return Promise.resolve(jsonResponse({ ...activeAuctionPage(1), items: [auctions[0]] }))
      }),
    )
    renderWithProviders(<AuctionMarketplace />)

    expect(
      within((await screen.findAllByRole('article'))[0]!).queryByRole('link', {
        name: 'Ver detalle',
      }),
    ).not.toBeInTheDocument()
  })

  it.each([
    [16, 1],
    [17, 2],
    [32, 2],
    [33, 3],
  ])('calcula %i resultados como %i pagina(s) de 16', async (total, pages) => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = urlOf(input)
        if (url.includes('/v1/catalog/products/'))
          return Promise.resolve(jsonResponse(product('exclusive-1', 'Corona', 'EPICA')))
        return Promise.resolve(jsonResponse(activeAuctionPage(total)))
      }),
    )
    renderWithProviders(<AuctionMarketplace />)

    await screen.findByText('Corona')
    if (pages === 1) {
      expect(
        screen.queryByRole('navigation', { name: 'Paginaci\u00f3n de subastas' }),
      ).not.toBeInTheDocument()
    } else {
      expect(await screen.findByText(`P\u00e1gina 1 de ${String(pages)}`)).toBeInTheDocument()
    }
  })

  it('solicita 16 resultados y mantiene anterior/siguiente', async () => {
    const user = userEvent.setup()
    const fetch = vi.fn((input: RequestInfo | URL) => {
      const url = urlOf(input)
      if (url.includes('/v1/catalog/products/'))
        return Promise.resolve(jsonResponse(product('exclusive-1', 'Corona', 'EPICA')))
      const page = url.includes('page=2') ? 2 : 1
      return Promise.resolve(jsonResponse(activeAuctionPage(32, page)))
    })
    vi.stubGlobal('fetch', fetch)
    renderWithProviders(<AuctionMarketplace />)

    await screen.findByText('P\u00e1gina 1 de 2')
    expect(fetch.mock.calls.map(([input]) => urlOf(input as RequestInfo | URL))).toContainEqual(
      expect.stringContaining('page=1&pageSize=16'),
    )

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(await screen.findByText('P\u00e1gina 2 de 2')).toBeInTheDocument()
    expect(fetch.mock.calls.map(([input]) => urlOf(input as RequestInfo | URL))).toContainEqual(
      expect.stringContaining('page=2&pageSize=16'),
    )

    await user.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(await screen.findByText('P\u00e1gina 1 de 2')).toBeInTheDocument()
  })
})
