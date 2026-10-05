import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

import { SessionQueryProvider } from '@/app/SessionQueryProvider'
import { useSession } from '@/shared/session'
import { renderWithProviders } from '@/test/render'
import { fetchWatchlist } from '../api'
import { AuctionActivityPage } from './AuctionActivityPage'

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const page = (items: readonly unknown[]) => ({ items, page: 1, pageSize: 16, total: items.length })

const requestUrl = (input: RequestInfo | URL): string =>
  typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

const privateAuction = (owner: 'A' | 'B') => ({
  auctionId: `auction-${owner}`,
  productId: `private-product-${owner}`,
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
})

const unavailableStatistics = {
  availability: 'UNAVAILABLE',
  reason: 'AUTHORITATIVE_SOURCE_NOT_CONFIGURED',
  metrics: [],
}

const product = (productId: string) => ({
  productId,
  name: `Producto privado ${productId.at(-1) ?? ''}`,
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
})

const SessionScopedActivity = (): React.JSX.Element => {
  const subject = useSession((state) => state.subject)

  return (
    <SessionQueryProvider key={subject ?? 'signed-out'}>
      {subject === null ? (
        <p>Sin sesión</p>
      ) : (
        <MemoryRouter>
          <AuctionActivityPage />
        </MemoryRouter>
      )}
    </SessionQueryProvider>
  )
}

afterEach(() => {
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
  vi.unstubAllGlobals()
})

describe('QA/Security del panel personal HU-89', () => {
  it('reutiliza Watchlist con el token vigente y sin identidad externa', async () => {
    const authorizations: (string | null)[] = []
    const fetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      authorizations.push(new Headers(init?.headers).get('authorization'))
      return Promise.resolve(json({ items: [] }))
    })
    vi.stubGlobal('fetch', fetch)
    useSession.setState({ subject: 'player-A', accessToken: 'token-A' })

    await fetchWatchlist()
    useSession.setState({ subject: 'player-B', accessToken: 'token-B' })
    await fetchWatchlist()

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(authorizations).toEqual(['Bearer token-A', 'Bearer token-B'])
    for (const [input] of fetch.mock.calls) {
      const url = requestUrl(input)
      expect(url).not.toMatch(/(?:userId|playerId|sellerId|bidderId)=/u)
    }
  })

  it('purga la actividad de A antes de consultar y mostrar la actividad de B', async () => {
    let resolveOwnedB: ((response: Response) => void) | undefined
    const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input)
      const token = new Headers(init?.headers).get('authorization')

      if (url.includes('/catalog/products/')) {
        return Promise.resolve(json(product(url.split('/').pop() ?? '')))
      }
      if (url.includes('/me/view-statistics')) return Promise.resolve(json(unavailableStatistics))
      if (url.includes('/me/bids') || url.includes('/me/transactions')) {
        return Promise.resolve(json(page([])))
      }
      if (url.includes('/me/owned') && token === 'Bearer token-A') {
        return Promise.resolve(json(page([privateAuction('A')])))
      }
      if (url.includes('/me/owned') && token === 'Bearer token-B') {
        return new Promise<Response>((resolve) => {
          resolveOwnedB = resolve
        })
      }
      return Promise.resolve(json({ message: 'not found' }, 404))
    })
    vi.stubGlobal('fetch', fetch)
    useSession.setState({
      subject: 'player-A',
      accessToken: 'token-A',
      expiresAt: Date.now() + 60_000,
    })

    render(<SessionScopedActivity />)
    expect(await screen.findByText('Producto privado A')).toBeInTheDocument()

    act(() => {
      useSession.setState({
        subject: 'player-B',
        accessToken: 'token-B',
        expiresAt: Date.now() + 60_000,
      })
    })

    expect(screen.queryByText('Producto privado A')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(resolveOwnedB).toBeDefined()
    })
    resolveOwnedB!(json(page([privateAuction('B')])))
    expect(await screen.findByText('Producto privado B')).toBeInTheDocument()

    const activityCalls = fetch.mock.calls.filter(([input]) => requestUrl(input).includes('/me/'))
    expect(
      activityCalls.some(([, init]) =>
        new Headers(init?.headers).get('authorization')?.includes('token-A'),
      ),
    ).toBe(true)
    expect(
      activityCalls.some(([, init]) =>
        new Headers(init?.headers).get('authorization')?.includes('token-B'),
      ),
    ).toBe(true)
  })

  it('cancela las consultas de A y descarta una respuesta que llega después del cambio', async () => {
    let oldSignal: AbortSignal | null | undefined
    let resolveOwnedA: ((response: Response) => void) | undefined
    const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input)
      const token = new Headers(init?.headers).get('authorization')

      if (url.includes('/catalog/products/')) {
        return Promise.resolve(json(product(url.split('/').pop() ?? '')))
      }
      if (url.includes('/me/view-statistics')) return Promise.resolve(json(unavailableStatistics))
      if (url.includes('/me/bids') || url.includes('/me/transactions')) {
        return Promise.resolve(json(page([])))
      }
      if (url.includes('/me/owned') && token === 'Bearer token-A') {
        oldSignal = init?.signal
        return new Promise<Response>((resolve) => {
          resolveOwnedA = resolve
        })
      }
      if (url.includes('/me/owned') && token === 'Bearer token-B') {
        return Promise.resolve(json(page([privateAuction('B')])))
      }
      return Promise.resolve(json({ message: 'not found' }, 404))
    })
    vi.stubGlobal('fetch', fetch)
    useSession.setState({ subject: 'player-A', accessToken: 'token-A' })

    render(<SessionScopedActivity />)
    await waitFor(() => {
      expect(resolveOwnedA).toBeDefined()
    })
    act(() => {
      useSession.setState({ subject: 'player-B', accessToken: 'token-B' })
    })

    expect(await screen.findByText('Producto privado B')).toBeInTheDocument()
    expect(oldSignal?.aborted).toBe(true)
    await act(async () => {
      resolveOwnedA!(json(page([privateAuction('A')])))
      await Promise.resolve()
    })
    expect(screen.queryByText('Producto privado A')).not.toBeInTheDocument()
  })

  it.each([
    [401, 'La sesión expiró.'],
    [403, 'No tienes permiso para consultar esta actividad.'],
  ] as const)('muestra el error %s sin conservar contenido privado', async (status, message) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(json({ message }, status))),
    )

    renderWithProviders(<AuctionActivityPage />)

    const alerts = await screen.findAllByRole('alert')
    expect(alerts).toHaveLength(4)
    for (const alert of alerts) expect(alert).toHaveTextContent(message)
    expect(screen.queryByText(/Producto privado/u)).not.toBeInTheDocument()
  })
})
