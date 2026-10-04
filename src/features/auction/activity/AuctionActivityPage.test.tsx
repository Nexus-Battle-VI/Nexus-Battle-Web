import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { AuctionActivityPage } from './AuctionActivityPage'

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const page = (items: readonly unknown[]) => ({ items, page: 1, pageSize: 16, total: items.length })

const requestUrl = (input: RequestInfo | URL): string =>
  typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

const responses = (overrides: Readonly<Record<string, Response>> = {}) =>
  vi.fn((input: RequestInfo | URL) => {
    const url = requestUrl(input)
    const override = Object.entries(overrides).find(([fragment]) => url.includes(fragment))?.[1]
    if (override !== undefined) return Promise.resolve(override.clone())
    if (url.includes('/me/owned'))
      return Promise.resolve(
        json(
          page([
            {
              auctionId: 'auction-owned',
              productId: 'product-owned',
              status: 'ACTIVE',
              minimumBidCredits: 10,
              buyNowCredits: 30,
              currentBidCredits: null,
              bidCount: 0,
              publishedAt: '2026-10-03T10:00:00.000Z',
              closesAt: '2026-10-04T10:00:00.000Z',
              finishedAt: null,
              cancelledAt: null,
              actions: { view: true, cancel: true },
            },
          ]),
        ),
      )
    if (url.includes('/me/bids'))
      return Promise.resolve(
        json(
          page([
            {
              auctionId: 'auction-bid',
              productId: 'product-bid',
              auctionStatus: 'ACTIVE',
              participationStatus: 'OUTBID',
              ownLatestBidCredits: 20,
              ownLatestBidAt: '2026-10-03T10:05:00.000Z',
              currentBidCredits: 30,
              closesAt: '2026-10-04T10:00:00.000Z',
            },
          ]),
        ),
      )
    if (url.includes('/me/transactions'))
      return Promise.resolve(
        json(
          page([
            {
              id: 'publication:operation-1',
              auctionId: 'auction-owned',
              type: 'PUBLICATION_FEE',
              reference: 'operation-1',
              occurredAt: '2026-10-03T10:00:00.000Z',
              status: 'COMPLETED',
              value: { amount: 1, unit: 'CREDITS' },
            },
          ]),
        ),
      )
    if (url.includes('/me/view-statistics'))
      return Promise.resolve(
        json({
          availability: 'UNAVAILABLE',
          reason: 'AUTHORITATIVE_SOURCE_NOT_CONFIGURED',
          metrics: [],
        }),
      )
    if (url.includes('/catalog/products/')) {
      const productId = url.split('/').pop() ?? ''
      return Promise.resolve(
        json({
          productId,
          name: `Producto ${productId}`,
          type: 'ARMA',
          imageUrl: '',
          description: '',
          sku: productId,
          lifecycleStatus: 'PUBLISHED',
          creditsPrice: 0,
          premium: false,
          realMoneyPrice: null,
          averageRating: null,
          reviewCount: 0,
        }),
      )
    }
    return Promise.resolve(json({ message: 'not found' }, 404))
  })

afterEach(() => vi.unstubAllGlobals())

describe('AuctionActivityPage', () => {
  it('presenta actividad real y reutiliza los enlaces de Watchlist y Pending Claims', async () => {
    vi.stubGlobal('fetch', responses())
    renderWithProviders(<AuctionActivityPage />)

    expect(
      await screen.findByRole('heading', { name: 'Mi actividad de subastas' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Lista de seguimiento' })).toHaveAttribute(
      'href',
      '/auction/watchlist',
    )
    expect(screen.getByRole('link', { name: 'Productos por reclamar' })).toHaveAttribute(
      'href',
      '/auction/pending-claims',
    )
    expect(await screen.findByText('Producto product-owned')).toBeInTheDocument()
    expect(screen.getByText('Producto product-bid')).toBeInTheDocument()
    expect(screen.getByText('Superada')).toBeInTheDocument()
    expect(screen.getByText('Comisión de publicación')).toBeInTheDocument()
    expect(
      screen.getByText('Las estadísticas de visualización todavía no están disponibles.'),
    ).toBeInTheDocument()
  })

  it('solo muestra el enlace de cancelación cuando Auction lo autoriza', async () => {
    vi.stubGlobal('fetch', responses())
    renderWithProviders(<AuctionActivityPage />)

    const owned = screen.getByRole('region', { name: 'Mis subastas' })
    expect(
      await within(owned).findByRole('link', { name: 'Cancelar en el detalle' }),
    ).toHaveAttribute('href', '/auction/auction-owned?cancel=1')
  })

  it('pagina en Auction sin cambiar el propietario de la consulta', async () => {
    const user = userEvent.setup()
    const fetch = responses({
      '/me/owned': json({
        ...page([
          {
            auctionId: 'auction-owned',
            productId: 'product-owned',
            status: 'ACTIVE',
            minimumBidCredits: 10,
            buyNowCredits: null,
            currentBidCredits: null,
            bidCount: 0,
            publishedAt: '2026-10-03T10:00:00.000Z',
            closesAt: '2026-10-04T10:00:00.000Z',
            finishedAt: null,
            cancelledAt: null,
            actions: { view: true, cancel: false },
          },
        ]),
        total: 17,
      }),
    })
    vi.stubGlobal('fetch', fetch)
    renderWithProviders(<AuctionActivityPage />)

    const owned = screen.getByRole('region', { name: 'Mis subastas' })
    await within(owned).findByText('Producto product-owned')
    expect(within(owned).queryByRole('link', { name: 'Cancelar en el detalle' })).toBeNull()
    await user.click(within(owned).getByRole('button', { name: 'Siguiente' }))

    expect(
      fetch.mock.calls.some(([input]) =>
        requestUrl(input).includes('/me/owned?page=2&pageSize=16'),
      ),
    ).toBe(true)
    expect(fetch.mock.calls.every(([input]) => !requestUrl(input).includes('playerId'))).toBe(true)
  })

  it('distingue estados vacíos en cada sección', async () => {
    vi.stubGlobal(
      'fetch',
      responses({
        '/me/owned': json(page([])),
        '/me/bids': json(page([])),
        '/me/transactions': json(page([])),
      }),
    )
    renderWithProviders(<AuctionActivityPage />)

    expect(await screen.findByText('No has publicado subastas.')).toBeInTheDocument()
    expect(screen.getByText('Todavía no has participado en subastas.')).toBeInTheDocument()
    expect(screen.getByText('No hay operaciones de subasta registradas.')).toBeInTheDocument()
  })

  it('muestra carga mientras los contratos no responden', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => undefined)))
    renderWithProviders(<AuctionActivityPage />)
    expect(screen.getAllByRole('status').length).toBeGreaterThanOrEqual(4)
  })

  it('aísla el error de una sección y mantiene las demás', async () => {
    vi.stubGlobal(
      'fetch',
      responses({ '/me/bids': json({ message: 'Auction no disponible' }, 503) }),
    )
    renderWithProviders(<AuctionActivityPage />)

    expect(await screen.findByText('Producto product-owned')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Auction no disponible')
    expect(screen.getByText('Comisión de publicación')).toBeInTheDocument()
  })
})
