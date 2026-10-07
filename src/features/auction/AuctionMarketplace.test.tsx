import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { formatMoney } from '@/lib/format'
import { queryKeys } from '@/shared/query-keys'
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
    bidCount: 0,
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
    currentBidAmount: 40,
    bidCount: 3,
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
  vi.useRealTimers()
  vi.unstubAllGlobals()
  useSession.setState({ roles: [], subject: null })
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
    expect(fetch.mock.calls.map(([input]) => urlOf(input))).toContainEqual(
      expect.stringContaining('page=1&pageSize=16'),
    )

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(await screen.findByText('P\u00e1gina 2 de 2')).toBeInTheDocument()
    expect(fetch.mock.calls.map(([input]) => urlOf(input))).toContainEqual(
      expect.stringContaining('page=2&pageSize=16'),
    )

    await user.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(await screen.findByText('P\u00e1gina 1 de 2')).toBeInTheDocument()
  })

  it('muestra el total de pujas de cada tarjeta, incluido 0', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = urlOf(input)
        if (url.includes('/v1/catalog/products/exclusive-1'))
          return Promise.resolve(jsonResponse(product('exclusive-1', 'Corona del Nexo', 'EPICA')))
        if (url.includes('/v1/catalog/products/owned-1'))
          return Promise.resolve(jsonResponse(product('owned-1', 'Espada del Nexo', 'ARMA')))
        return Promise.resolve(jsonResponse(activeAuctionPage(2)))
      }),
    )
    renderWithProviders(<AuctionMarketplace />)

    await screen.findByText('Espada del Nexo')
    const cards = screen.getAllByRole('article')
    const bidsOf = (card: HTMLElement): string | null =>
      within(card).getByText('Pujas').nextElementSibling?.textContent ?? null
    expect(bidsOf(cards[0]!)).toBe('0')
    expect(bidsOf(cards[1]!)).toBe('3')
  })

  it('cada tarjeta muestra su propia cuenta regresiva y la actualiza sin volver a pedir la lista', async () => {
    // Solo el reloj: `setTimeout` sigue real para React Query y los `findBy*`.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    vi.setSystemTime(Date.parse('2026-09-25T11:59:58.000Z'))
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = urlOf(input)
      if (url.includes('/v1/catalog/products/exclusive-1'))
        return Promise.resolve(jsonResponse(product('exclusive-1', 'Corona del Nexo', 'EPICA')))
      if (url.includes('/v1/catalog/products/owned-1'))
        return Promise.resolve(jsonResponse(product('owned-1', 'Espada del Nexo', 'ARMA')))
      return Promise.resolve(jsonResponse(activeAuctionPage(2)))
    })
    vi.stubGlobal('fetch', fetchMock)
    renderWithProviders(<AuctionMarketplace />)

    await screen.findByText('Espada del Nexo')
    const cards = screen.getAllByRole('article')
    const timeOf = (card: HTMLElement): string | null =>
      within(card).getByText('Tiempo restante').nextElementSibling?.textContent ?? null
    expect(timeOf(cards[0]!)).toBe('1d 00h 00m 02s')
    expect(timeOf(cards[1]!)).toBe('02s')
    const listCalls = (): number =>
      fetchMock.mock.calls.filter(([input]) => urlOf(input).includes('/v1/auctions')).length
    const callsBefore = listCalls()

    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(timeOf(cards[0]!)).toBe('1d 00h 00m 01s')
    expect(timeOf(cards[1]!)).toBe('01s')

    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(timeOf(cards[1]!)).toBe('Finalizada')
    expect(timeOf(cards[0]!)).toBe('23h 59m 56s')
    expect(timeOf(cards[1]!)).not.toMatch(/-/u)
    expect(listCalls()).toBe(callsBefore)
  })

  describe('compra inmediata desde la tarjeta', () => {
    const stubMarket = (items: readonly unknown[] = auctions) => {
      const fetchMock = vi.fn((input: RequestInfo | URL) => {
        const url = urlOf(input)
        if (url.includes('/v1/catalog/products/exclusive-1'))
          return Promise.resolve(jsonResponse(product('exclusive-1', 'Corona del Nexo', 'EPICA')))
        if (url.includes('/v1/catalog/products/owned-1'))
          return Promise.resolve(jsonResponse(product('owned-1', 'Espada del Nexo', 'ARMA')))
        return Promise.resolve(jsonResponse({ page: 1, pageSize: 16, total: items.length, items }))
      })
      vi.stubGlobal('fetch', fetchMock)
      return fetchMock
    }
    const buyNowOf = (card: HTMLElement): string | null =>
      within(card).getByText('Compra inmediata').nextElementSibling?.textContent ?? null

    it('Comprar ahora abre el flujo de compra (?buyNow=1) sin comprar desde la tarjeta', async () => {
      useSession.setState({ subject: 'buyer-1' })
      const fetchMock = stubMarket()
      renderWithProviders(<AuctionMarketplace />)

      await screen.findByText('Espada del Nexo')
      const cards = screen.getAllByRole('article')
      expect(buyNowOf(cards[1]!)).toBe('20 créditos')
      const buy = within(cards[1]!).getByRole('link', { name: 'Comprar ahora' })
      expect(buy).toHaveAttribute('href', '/auction/player-1?buyNow=1')
      // Ver detalle sigue siendo el detalle normal, sin la intencion de compra.
      expect(within(cards[1]!).getByRole('link', { name: 'Ver detalle' })).toHaveAttribute(
        'href',
        '/auction/player-1',
      )

      await userEvent.click(buy)
      expect(fetchMock.mock.calls.some(([input]) => urlOf(input).includes('/buy-now'))).toBe(false)
    })

    it('una publicacion oficial muestra su precio en dinero real pero no ofrece comprar', async () => {
      useSession.setState({ subject: 'buyer-1' })
      stubMarket()
      renderWithProviders(<AuctionMarketplace />)

      await screen.findByText('Espada del Nexo')
      const official = screen.getAllByRole('article')[0]!
      expect(buyNowOf(official)).toBe(formatMoney(120_000, 'COP'))
      expect(
        within(official).queryByRole('link', { name: 'Comprar ahora' }),
      ).not.toBeInTheDocument()
    })

    it('el vendedor ve el precio de su subasta pero no el boton de compra', async () => {
      useSession.setState({ subject: 'player-1' })
      stubMarket()
      renderWithProviders(<AuctionMarketplace />)

      await screen.findByText('Espada del Nexo')
      const own = screen.getAllByRole('article')[1]!
      expect(buyNowOf(own)).toBe('20 créditos')
      expect(within(own).queryByRole('link', { name: 'Comprar ahora' })).not.toBeInTheDocument()
      expect(within(own).getByRole('link', { name: 'Ver detalle' })).toBeInTheDocument()
    })

    it('sin precio de compra inmediata lo indica y no ofrece comprar', async () => {
      useSession.setState({ subject: 'buyer-1' })
      stubMarket([{ ...auctions[1]!, buyNowCredits: null }])
      renderWithProviders(<AuctionMarketplace />)

      await screen.findByText('Espada del Nexo')
      const card = screen.getAllByRole('article')[0]!
      expect(buyNowOf(card)).toBe('No disponible')
      expect(within(card).queryByRole('link', { name: 'Comprar ahora' })).not.toBeInTheDocument()
    })
  })

  describe('selector de elementos por pagina', () => {
    const stubPaged = (total: number) => {
      const fetchMock = vi.fn((input: RequestInfo | URL) => {
        const url = urlOf(input)
        if (url.includes('/v1/catalog/products/exclusive-1'))
          return Promise.resolve(jsonResponse(product('exclusive-1', 'Corona del Nexo', 'EPICA')))
        if (url.includes('/v1/catalog/products/owned-1'))
          return Promise.resolve(jsonResponse(product('owned-1', 'Espada del Nexo', 'ARMA')))
        const params = new URL(url, 'http://localhost').searchParams
        return Promise.resolve(
          jsonResponse({
            page: Number(params.get('page')),
            pageSize: Number(params.get('pageSize')),
            total,
            items: auctions,
          }),
        )
      })
      vi.stubGlobal('fetch', fetchMock)
      return fetchMock
    }
    const lastListUrl = (fetchMock: ReturnType<typeof stubPaged>): string =>
      fetchMock.mock.calls
        .map(([input]) => urlOf(input))
        .filter((url) => url.includes('/v1/auctions?'))
        .at(-1) ?? ''
    const selector = (): HTMLElement =>
      screen.getByRole('combobox', { name: 'Elementos por página' })

    it('por defecto pide 16 y ofrece 16, 32 y 48', async () => {
      const fetchMock = stubPaged(2)
      renderWithProviders(<AuctionMarketplace />)

      await screen.findByText('Espada del Nexo')
      expect(lastListUrl(fetchMock)).toContain('page=1&pageSize=16')
      expect(selector()).toHaveValue('16')
      expect(
        within(selector())
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual(['16', '32', '48'])
    })

    it.each([
      ['32', 'page=1&pageSize=32'],
      ['48', 'page=1&pageSize=48'],
    ])('al elegir %s el request usa ese tamano', async (size, expected) => {
      const user = userEvent.setup()
      const fetchMock = stubPaged(2)
      renderWithProviders(<AuctionMarketplace />)

      await screen.findByText('Espada del Nexo')
      await user.selectOptions(selector(), size)

      await waitFor(() => {
        expect(lastListUrl(fetchMock)).toContain(expected)
      })
      expect(selector()).toHaveValue(size)
    })

    it('cambiar el tamano estando en una pagina posterior vuelve a la pagina 1', async () => {
      const user = userEvent.setup()
      const fetchMock = stubPaged(100)
      renderWithProviders(<AuctionMarketplace />)

      await screen.findByText('Página 1 de 7')
      await user.click(screen.getByRole('button', { name: 'Siguiente' }))
      await user.click(await screen.findByRole('button', { name: 'Siguiente' }))
      expect(await screen.findByText('Página 3 de 7')).toBeInTheDocument()
      expect(lastListUrl(fetchMock)).toContain('page=3&pageSize=16')

      await user.selectOptions(selector(), '32')

      expect(await screen.findByText('Página 1 de 4')).toBeInTheDocument()
      expect(lastListUrl(fetchMock)).toContain('page=1&pageSize=32')
    })

    it.each([
      [32, '16', 2],
      [32, '32', 1],
      [33, '32', 2],
    ])('total %i con %s por pagina da %i pagina(s)', async (total, size, pages) => {
      const user = userEvent.setup()
      stubPaged(total)
      renderWithProviders(<AuctionMarketplace />)

      await screen.findByText('Espada del Nexo')
      await user.selectOptions(selector(), size)

      if (pages === 1) {
        await waitFor(() => {
          expect(
            screen.queryByRole('navigation', { name: 'Paginación de subastas' }),
          ).not.toBeInTheDocument()
        })
      } else {
        expect(await screen.findByText(`Página 1 de ${String(pages)}`)).toBeInTheDocument()
      }
    })

    it('anterior y siguiente respetan el tamano elegido', async () => {
      const user = userEvent.setup()
      const fetchMock = stubPaged(100)
      renderWithProviders(<AuctionMarketplace />)

      await screen.findByText('Espada del Nexo')
      await user.selectOptions(selector(), '48')
      expect(await screen.findByText('Página 1 de 3')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Siguiente' }))
      expect(await screen.findByText('Página 2 de 3')).toBeInTheDocument()
      expect(lastListUrl(fetchMock)).toContain('page=2&pageSize=48')

      await user.click(screen.getByRole('button', { name: 'Anterior' }))
      expect(await screen.findByText('Página 1 de 3')).toBeInTheDocument()
      expect(lastListUrl(fetchMock)).toContain('page=1&pageSize=48')
    })

    it('con otro tamano las tarjetas conservan pujas, tiempo restante y compra inmediata', async () => {
      const user = userEvent.setup()
      useSession.setState({ subject: 'buyer-1' })
      stubPaged(2)
      renderWithProviders(<AuctionMarketplace />)

      await screen.findByText('Espada del Nexo')
      await user.selectOptions(selector(), '32')
      await waitFor(() => {
        expect(selector()).toHaveValue('32')
      })

      const card = (await screen.findAllByRole('article'))[1]!
      expect(within(card).getByText('Pujas').nextElementSibling).toHaveTextContent('3')
      expect(within(card).getByText('Tiempo restante')).toBeInTheDocument()
      expect(within(card).getByRole('link', { name: 'Comprar ahora' })).toHaveAttribute(
        'href',
        '/auction/player-1?buyNow=1',
      )
    })
  })

  describe('filtros y orden', () => {
    interface ListResponse {
      readonly total: number
      readonly items: readonly unknown[]
    }
    const ALL: ListResponse = { total: 2, items: auctions }

    /** Backend simulado: responde lo que diga `respond` segun los parametros recibidos. */
    const stubMarket = (respond: (params: URLSearchParams) => ListResponse = () => ALL) => {
      const fetchMock = vi.fn((input: RequestInfo | URL) => {
        const url = urlOf(input)
        if (url.includes('/v1/catalog/products/exclusive-1'))
          return Promise.resolve(jsonResponse(product('exclusive-1', 'Corona del Nexo', 'EPICA')))
        if (url.includes('/v1/catalog/products/owned-1'))
          return Promise.resolve(jsonResponse(product('owned-1', 'Espada del Nexo', 'ARMA')))
        const params = new URL(url, 'http://localhost').searchParams
        return Promise.resolve(
          jsonResponse({
            page: Number(params.get('page')),
            pageSize: Number(params.get('pageSize')),
            ...respond(params),
          }),
        )
      })
      vi.stubGlobal('fetch', fetchMock)
      return fetchMock
    }
    const listUrls = (fetchMock: ReturnType<typeof stubMarket>): string[] =>
      fetchMock.mock.calls
        .map(([input]) => urlOf(input))
        .filter((url) => url.includes('/v1/auctions?'))
    const lastSearch = (fetchMock: ReturnType<typeof stubMarket>): string =>
      new URL(listUrls(fetchMock).at(-1) ?? '', 'http://localhost').search
    const field = (name: string): HTMLElement => screen.getByRole('combobox', { name })
    const clearButton = () => screen.queryByRole('button', { name: 'Limpiar filtros' })
    /** Ninguna peticion de la UI puede ordenar por precio sin priceKind=CREDITS. */
    const expectOnlyValidPriceSorts = (fetchMock: ReturnType<typeof stubMarket>): void => {
      for (const url of listUrls(fetchMock)) {
        const params = new URL(url, 'http://localhost').searchParams
        if (params.get('sort') === 'priceAsc' || params.get('sort') === 'priceDesc') {
          expect(params.get('priceKind')).toBe('CREDITS')
        }
      }
    }
    const renderMarket = async (): Promise<void> => {
      renderWithProviders(<AuctionMarketplace />)
      await screen.findByText('Espada del Nexo')
    }

    it('muestra los cuatro filtros sin valor, sin Limpiar filtros, y pide solo page y pageSize', async () => {
      const fetchMock = stubMarket()
      await renderMarket()

      expect(screen.getByRole('group', { name: 'Filtros de subastas' })).toBeInTheDocument()
      for (const name of ['Publicador', 'Tipo de precio', 'Compra inmediata', 'Ordenar por']) {
        expect(field(name)).toHaveValue('')
      }
      expect(
        within(field('Ordenar por'))
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual([
        'Orden por defecto',
        'Próximas a cerrar',
        'Más recientes',
        'Más pujas',
        'Precio menor',
        'Precio mayor',
      ])
      expect(field('Ordenar por')).toHaveAccessibleDescription(
        'Ordenar por precio muestra solo subastas en créditos.',
      )
      expect(clearButton()).not.toBeInTheDocument()
      expect(listUrls(fetchMock)).toEqual([
        expect.stringMatching(/\/v1\/auctions\?page=1&pageSize=16$/),
      ])
    })

    it.each([
      ['Publicador', 'PLAYER', '?page=1&pageSize=16&publisherType=PLAYER'],
      ['Publicador', 'GAME_MASTER', '?page=1&pageSize=16&publisherType=GAME_MASTER'],
      ['Tipo de precio', 'CREDITS', '?page=1&pageSize=16&priceKind=CREDITS'],
      ['Tipo de precio', 'REAL_MONEY', '?page=1&pageSize=16&priceKind=REAL_MONEY'],
      ['Compra inmediata', 'true', '?page=1&pageSize=16&hasBuyNow=true'],
      ['Compra inmediata', 'false', '?page=1&pageSize=16&hasBuyNow=false'],
      ['Ordenar por', 'closingSoon', '?page=1&pageSize=16&sort=closingSoon'],
      ['Ordenar por', 'newest', '?page=1&pageSize=16&sort=newest'],
      ['Ordenar por', 'mostBids', '?page=1&pageSize=16&sort=mostBids'],
    ])('%s=%s pide %s y deja el filtrado a Auction', async (name, value, expected) => {
      const user = userEvent.setup()
      const fetchMock = stubMarket()
      await renderMarket()

      await user.selectOptions(field(name), value)

      await waitFor(() => {
        expect(lastSearch(fetchMock)).toBe(expected)
      })
      expect(field(name)).toHaveValue(value)
      expect(clearButton()).toBeInTheDocument()
      // Sin filtrado local: se pintan exactamente los items que devuelve Auction.
      expect(await screen.findAllByRole('article')).toHaveLength(2)
    })

    it.each([
      ['priceAsc', '', '?page=1&pageSize=16&priceKind=CREDITS&sort=priceAsc'],
      ['priceDesc', 'REAL_MONEY', '?page=1&pageSize=16&priceKind=CREDITS&sort=priceDesc'],
    ])('%s (desde tipo "%s") fija priceKind=CREDITS y lo muestra', async (sort, from, expected) => {
      const user = userEvent.setup()
      const fetchMock = stubMarket()
      await renderMarket()
      if (from !== '') {
        await user.selectOptions(field('Tipo de precio'), from)
      }

      await user.selectOptions(field('Ordenar por'), sort)

      await waitFor(() => {
        expect(lastSearch(fetchMock)).toBe(expected)
      })
      expect(field('Tipo de precio')).toHaveValue('CREDITS')
      expectOnlyValidPriceSorts(fetchMock)
    })

    it.each([
      ['REAL_MONEY', '?page=1&pageSize=16&priceKind=REAL_MONEY'],
      ['', '?page=1&pageSize=16'],
    ])(
      'con orden por precio, cambiar el tipo de precio a "%s" vuelve al orden por defecto',
      async (priceKind, expected) => {
        const user = userEvent.setup()
        const fetchMock = stubMarket()
        await renderMarket()
        await user.selectOptions(field('Ordenar por'), 'priceDesc')
        await waitFor(() => {
          expect(lastSearch(fetchMock)).toContain('sort=priceDesc')
        })

        await user.selectOptions(field('Tipo de precio'), priceKind)

        await waitFor(() => {
          expect(lastSearch(fetchMock)).toBe(expected)
        })
        expect(field('Ordenar por')).toHaveValue('')
        expectOnlyValidPriceSorts(fetchMock)
      },
    )

    it('con orden por precio, otros cambios lo conservan y volver al orden por defecto mantiene CREDITS', async () => {
      const user = userEvent.setup()
      const fetchMock = stubMarket()
      await renderMarket()
      await user.selectOptions(field('Ordenar por'), 'priceAsc')

      await user.selectOptions(field('Ordenar por'), 'priceDesc')
      await user.selectOptions(field('Publicador'), 'PLAYER')
      await user.selectOptions(field('Compra inmediata'), 'true')
      await waitFor(() => {
        expect(lastSearch(fetchMock)).toBe(
          '?page=1&pageSize=16&publisherType=PLAYER&priceKind=CREDITS&hasBuyNow=true&sort=priceDesc',
        )
      })

      await user.selectOptions(field('Ordenar por'), '')
      await waitFor(() => {
        expect(lastSearch(fetchMock)).toBe(
          '?page=1&pageSize=16&publisherType=PLAYER&priceKind=CREDITS&hasBuyNow=true',
        )
      })
      expect(field('Tipo de precio')).toHaveValue('CREDITS')
      expectOnlyValidPriceSorts(fetchMock)
    })

    it('cambiar un filtro o el orden desde una pagina posterior vuelve a la pagina 1', async () => {
      const user = userEvent.setup()
      const fetchMock = stubMarket(() => ({ total: 100, items: auctions }))
      await renderMarket()
      const goToPage3 = async (): Promise<void> => {
        await user.click(screen.getByRole('button', { name: 'Siguiente' }))
        await user.click(await screen.findByRole('button', { name: 'Siguiente' }))
        expect(await screen.findByText('Página 3 de 7')).toBeInTheDocument()
      }

      await goToPage3()
      await user.selectOptions(field('Compra inmediata'), 'true')
      expect(await screen.findByText('Página 1 de 7')).toBeInTheDocument()
      expect(lastSearch(fetchMock)).toBe('?page=1&pageSize=16&hasBuyNow=true')

      await goToPage3()
      await user.selectOptions(field('Ordenar por'), 'newest')
      expect(await screen.findByText('Página 1 de 7')).toBeInTheDocument()
      expect(lastSearch(fetchMock)).toBe('?page=1&pageSize=16&hasBuyNow=true&sort=newest')
    })

    it('el tamano de pagina vuelve a la pagina 1 y conserva los filtros', async () => {
      const user = userEvent.setup()
      const fetchMock = stubMarket(() => ({ total: 100, items: auctions }))
      await renderMarket()
      await user.selectOptions(field('Publicador'), 'PLAYER')
      await user.click(await screen.findByRole('button', { name: 'Siguiente' }))
      expect(await screen.findByText('Página 2 de 7')).toBeInTheDocument()

      await user.selectOptions(field('Elementos por página'), '32')

      expect(await screen.findByText('Página 1 de 4')).toBeInTheDocument()
      expect(lastSearch(fetchMock)).toBe('?page=1&pageSize=32&publisherType=PLAYER')
      expect(field('Publicador')).toHaveValue('PLAYER')
    })

    it('anterior y siguiente conservan filtros y orden', async () => {
      const user = userEvent.setup()
      const fetchMock = stubMarket(() => ({ total: 100, items: auctions }))
      await renderMarket()
      await user.selectOptions(field('Ordenar por'), 'priceAsc')
      await user.selectOptions(field('Compra inmediata'), 'false')

      await user.click(await screen.findByRole('button', { name: 'Siguiente' }))
      expect(await screen.findByText('Página 2 de 7')).toBeInTheDocument()
      expect(lastSearch(fetchMock)).toBe(
        '?page=2&pageSize=16&priceKind=CREDITS&hasBuyNow=false&sort=priceAsc',
      )

      await user.click(screen.getByRole('button', { name: 'Anterior' }))
      expect(await screen.findByText('Página 1 de 7')).toBeInTheDocument()
      expect(lastSearch(fetchMock)).toBe(
        '?page=1&pageSize=16&priceKind=CREDITS&hasBuyNow=false&sort=priceAsc',
      )
      expectOnlyValidPriceSorts(fetchMock)
    })

    it('Limpiar filtros vuelve al estado inicial y a la pagina 1, conservando el tamano', async () => {
      const user = userEvent.setup()
      const fetchMock = stubMarket(() => ({ total: 100, items: auctions }))
      await renderMarket()
      await user.selectOptions(field('Elementos por página'), '32')
      await user.selectOptions(field('Publicador'), 'GAME_MASTER')
      await user.selectOptions(field('Ordenar por'), 'mostBids')
      await user.click(await screen.findByRole('button', { name: 'Siguiente' }))
      expect(await screen.findByText('Página 2 de 4')).toBeInTheDocument()

      await user.click(clearButton()!)

      expect(await screen.findByText('Página 1 de 4')).toBeInTheDocument()
      expect(lastSearch(fetchMock)).toBe('?page=1&pageSize=32')
      for (const name of ['Publicador', 'Tipo de precio', 'Compra inmediata', 'Ordenar por']) {
        expect(field(name)).toHaveValue('')
      }
      expect(field('Elementos por página')).toHaveValue('32')
      expect(clearButton()).not.toBeInTheDocument()
    })

    it('cada combinacion de filtros es una consulta distinta', async () => {
      const user = userEvent.setup()
      const fetchMock = stubMarket()
      await renderMarket()

      await user.selectOptions(field('Publicador'), 'PLAYER')
      await waitFor(() => {
        expect(listUrls(fetchMock)).toHaveLength(2)
      })
      await user.selectOptions(field('Compra inmediata'), 'true')
      await waitFor(() => {
        expect(listUrls(fetchMock)).toHaveLength(3)
      })

      expect(listUrls(fetchMock).map((url) => new URL(url, 'http://localhost').search)).toEqual([
        '?page=1&pageSize=16',
        '?page=1&pageSize=16&publisherType=PLAYER',
        '?page=1&pageSize=16&publisherType=PLAYER&hasBuyNow=true',
      ])
    })

    it('sin filtros, un listado vacio conserva el mensaje actual aunque cambie el tamano', async () => {
      const user = userEvent.setup()
      const fetchMock = stubMarket(() => ({ total: 0, items: [] }))
      renderWithProviders(<AuctionMarketplace />)
      expect(
        await screen.findByText('No hay subastas activas en este momento.'),
      ).toBeInTheDocument()

      // El tamano de pagina no es un filtro: no activa emptyFiltered.
      await user.selectOptions(field('Elementos por página'), '48')

      await waitFor(() => {
        expect(lastSearch(fetchMock)).toBe('?page=1&pageSize=48')
      })
      expect(
        await screen.findByText('No hay subastas activas en este momento.'),
      ).toBeInTheDocument()
      expect(clearButton()).not.toBeInTheDocument()
    })

    it('con filtros, un listado vacio indica que nada coincide', async () => {
      const user = userEvent.setup()
      stubMarket((params) => (params.has('publisherType') ? { total: 0, items: [] } : ALL))
      await renderMarket()

      await user.selectOptions(field('Publicador'), 'GAME_MASTER')

      expect(
        await screen.findByText('Ninguna subasta activa coincide con los filtros.'),
      ).toBeInTheDocument()
      expect(screen.queryByText('No hay subastas activas en este momento.')).not.toBeInTheDocument()
    })

    it('mientras carga muestra el estado de carga', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => new Promise<Response>(() => undefined)),
      )
      renderWithProviders(<AuctionMarketplace />)

      expect(await screen.findByRole('status')).toBeInTheDocument()
      expect(screen.queryAllByRole('article')).toHaveLength(0)
    })

    it('si Auction falla con filtros muestra el error', async () => {
      const user = userEvent.setup()
      const fetchMock = stubMarket()
      await renderMarket()
      fetchMock.mockImplementation((input: RequestInfo | URL) =>
        Promise.resolve(
          urlOf(input).includes('/v1/auctions?')
            ? jsonResponse({ code: 'INTERNAL' }, 500)
            : jsonResponse(product('owned-1', 'Espada del Nexo', 'ARMA')),
        ),
      )

      await user.selectOptions(field('Publicador'), 'PLAYER')

      expect(await screen.findByRole('alert')).toBeInTheDocument()
      expect(screen.queryAllByRole('article')).toHaveLength(0)
    })

    it('con filtros activos las tarjetas conservan pujas, tiempo restante y compra inmediata', async () => {
      const user = userEvent.setup()
      useSession.setState({ subject: 'buyer-1' })
      stubMarket()
      await renderMarket()

      await user.selectOptions(field('Publicador'), 'PLAYER')
      await user.selectOptions(field('Ordenar por'), 'mostBids')

      const card = (await screen.findAllByRole('article'))[1]!
      expect(within(card).getByText('Espada del Nexo')).toBeInTheDocument()
      expect(within(card).getByText('Pujas').nextElementSibling).toHaveTextContent('3')
      expect(within(card).getByText('Tiempo restante')).toBeInTheDocument()
      expect(within(card).getByRole('link', { name: 'Comprar ahora' })).toHaveAttribute(
        'href',
        '/auction/player-1?buyNow=1',
      )
      expect(within(card).getByRole('link', { name: 'Ver detalle' })).toHaveAttribute(
        'href',
        '/auction/player-1',
      )
    })

    it('mantiene el input vacio y no envia search inicialmente ni mientras se escribe', async () => {
      const user = userEvent.setup()
      const fetchMock = stubMarket()
      await renderMarket()
      const search = screen.getByRole('combobox', { name: 'Buscar subastas' })

      expect(search).toHaveValue('')
      expect(lastSearch(fetchMock)).toBe('?page=1&pageSize=16')
      const requestsBeforeTyping = listUrls(fetchMock).length
      await user.type(search, 'dragon')

      expect(search).toHaveValue('dragon')
      expect(listUrls(fetchMock)).toHaveLength(requestsBeforeTyping)
    })

    it('distingue busquedas aplicadas distintas en la query key', () => {
      const base = {
        page: 1,
        pageSize: 16,
        publisherType: null,
        priceKind: null,
        hasBuyNow: null,
        sort: null,
      }

      expect(queryKeys.auctions.activePage({ ...base, search: 'dragon' })).not.toEqual(
        queryKeys.auctions.activePage({ ...base, search: 'sword' }),
      )
      expect(queryKeys.auctions.activePage({ ...base, search: 'dragon' }).slice(0, 2)).toEqual([
        'auctions',
        'active',
      ])
    })

    it.each([
      ['dragon', 'dragon'],
      ['  dragon  ', 'dragon'],
      ['x', 'x'],
    ])('aplica search=%j como %j al presionar Enter y vuelve a page 1', async (typed, expected) => {
      const user = userEvent.setup()
      const fetchMock = stubMarket(() => ({ total: 100, items: auctions }))
      await renderMarket()
      const search = screen.getByRole('combobox', { name: 'Buscar subastas' })
      await user.click(screen.getByRole('button', { name: 'Siguiente' }))
      await waitFor(() => {
        expect(lastSearch(fetchMock)).toBe('?page=2&pageSize=16')
      })

      await user.type(search, typed)
      await user.keyboard('{Enter}')

      expect(lastSearch(fetchMock)).toBe(`?page=1&pageSize=16&search=${expected}`)
    })

    it('combina search con filtros y sort sin romper el orden por precio', async () => {
      const user = userEvent.setup()
      const fetchMock = stubMarket()
      await renderMarket()
      const search = screen.getByRole('combobox', { name: 'Buscar subastas' })
      await user.type(search, 'dragon')
      await user.keyboard('{Enter}')
      await user.selectOptions(field('Publicador'), 'PLAYER')
      await user.selectOptions(field('Compra inmediata'), 'true')
      await user.selectOptions(field('Ordenar por'), 'priceDesc')

      await waitFor(() => {
        expect(lastSearch(fetchMock)).toBe(
          '?page=1&pageSize=16&publisherType=PLAYER&search=dragon&priceKind=CREDITS&hasBuyNow=true&sort=priceDesc',
        )
      })
      expect(field('Tipo de precio')).toHaveValue('CREDITS')
      expectOnlyValidPriceSorts(fetchMock)
    })

    it('conserva search al paginar y cambiar el tamano de pagina', async () => {
      const user = userEvent.setup()
      const fetchMock = stubMarket(() => ({ total: 100, items: auctions }))
      await renderMarket()
      const search = screen.getByRole('combobox', { name: 'Buscar subastas' })
      await user.type(search, 'dragon')
      await user.keyboard('{Enter}')
      await user.click(await screen.findByRole('button', { name: 'Siguiente' }))
      expect(lastSearch(fetchMock)).toBe('?page=2&pageSize=16&search=dragon')

      await user.selectOptions(screen.getAllByRole('combobox')[5]!, '32')
      expect(lastSearch(fetchMock)).toBe('?page=1&pageSize=32&search=dragon')
    })

    it('limpia solo search, conserva los otros filtros y sincroniza el input', async () => {
      const user = userEvent.setup()
      const fetchMock = stubMarket()
      await renderMarket()
      const search = screen.getByRole('combobox', { name: 'Buscar subastas' })
      await user.selectOptions(field('Publicador'), 'PLAYER')
      await user.type(search, 'dragon')
      await user.keyboard('{Enter}')
      await user.click(screen.getByRole('button', { name: /Limpiar b.squeda/ }))

      await waitFor(() => {
        expect(lastSearch(fetchMock)).toBe('?page=1&pageSize=16&publisherType=PLAYER')
      })
      expect(search).toHaveValue('')
      expect(field('Publicador')).toHaveValue('PLAYER')
    })

    it('Limpiar filtros elimina search, limpia el input y conserva pageSize', async () => {
      const user = userEvent.setup()
      const fetchMock = stubMarket()
      await renderMarket()
      const search = screen.getByRole('combobox', { name: 'Buscar subastas' })
      await user.selectOptions(screen.getAllByRole('combobox')[5]!, '32')
      await user.selectOptions(field('Publicador'), 'PLAYER')
      await user.type(search, 'dragon')
      await user.keyboard('{Enter}')
      await user.click(clearButton()!)

      await waitFor(() => {
        expect(lastSearch(fetchMock)).toBe('?page=1&pageSize=32')
      })
      expect(search).toHaveValue('')
      expect(field('Publicador')).toHaveValue('')
    })

    it('usa emptyFiltered y pinta los items de Auction sin filtrarlos localmente', async () => {
      const user = userEvent.setup()
      const fetchMock = stubMarket((params) =>
        params.get('search') === 'dragon' ? { total: 2, items: auctions } : { total: 0, items: [] },
      )
      renderWithProviders(<AuctionMarketplace />)
      await screen.findByText('No hay subastas activas en este momento.')
      const search = screen.getByRole('combobox', { name: 'Buscar subastas' })
      await user.type(search, 'dragon')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(lastSearch(fetchMock)).toBe('?page=1&pageSize=16&search=dragon')
      })
      // Ninguno de los nombres locales contiene "dragon", pero Auction decidio incluirlos.
      expect(await screen.findAllByRole('article')).toHaveLength(2)

      fetchMock.mockImplementation((input: RequestInfo | URL) =>
        Promise.resolve(
          urlOf(input).includes('/v1/auctions?')
            ? jsonResponse({ page: 1, pageSize: 16, total: 0, items: [] })
            : jsonResponse(product('owned-1', 'Espada del Nexo', 'ARMA')),
        ),
      )
      await user.click(screen.getByRole('button', { name: /Limpiar b.squeda/ }))
      await user.type(search, 'x')
      await user.keyboard('{Enter}')
      expect(
        await screen.findByText('Ninguna subasta activa coincide con los filtros.'),
      ).toBeInTheDocument()
    })
  })

  describe('autocomplete de sugerencias (HU-87)', () => {
    const suggestion = (productId: string, name: string, type: string) => ({
      productId,
      name,
      type,
    })

    interface SuggestionsResult {
      readonly items: readonly unknown[]
    }
    interface SuggestionsFailure {
      readonly status: number
    }
    interface ListResult {
      readonly total: number
      readonly items: readonly unknown[]
    }

    /** Backend simulado: catalogo + lista principal + `/v1/auctions/suggestions`. */
    const stubCombobox = (options: {
      readonly suggestions?: (params: URLSearchParams) => SuggestionsResult | SuggestionsFailure
      readonly list?: (params: URLSearchParams) => ListResult
    }) => {
      const respondSuggestions = options.suggestions ?? (() => ({ items: [] }))
      const respondList = options.list ?? (() => ({ total: 2, items: auctions }))
      const fetchMock = vi.fn((input: RequestInfo | URL) => {
        const url = urlOf(input)
        if (url.includes('/v1/catalog/products/exclusive-1'))
          return Promise.resolve(jsonResponse(product('exclusive-1', 'Corona del Nexo', 'EPICA')))
        if (url.includes('/v1/catalog/products/owned-1'))
          return Promise.resolve(jsonResponse(product('owned-1', 'Espada del Nexo', 'ARMA')))
        const params = new URL(url, 'http://localhost').searchParams
        if (url.includes('/v1/auctions/suggestions')) {
          const result = respondSuggestions(params)
          return Promise.resolve(
            'status' in result
              ? jsonResponse({ code: 'INTERNAL' }, result.status)
              : jsonResponse({ items: result.items }),
          )
        }
        const { total, items } = respondList(params)
        return Promise.resolve(
          jsonResponse({
            page: Number(params.get('page')),
            pageSize: Number(params.get('pageSize')),
            total,
            items,
          }),
        )
      })
      vi.stubGlobal('fetch', fetchMock)
      return fetchMock
    }

    const listUrls = (fetchMock: ReturnType<typeof stubCombobox>): string[] =>
      fetchMock.mock.calls
        .map(([input]) => urlOf(input))
        .filter((url) => url.includes('/v1/auctions?'))
    const lastSearch = (fetchMock: ReturnType<typeof stubCombobox>): string =>
      new URL(listUrls(fetchMock).at(-1) ?? '', 'http://localhost').search
    const suggestionUrls = (fetchMock: ReturnType<typeof stubCombobox>): string[] =>
      fetchMock.mock.calls
        .map(([input]) => urlOf(input))
        .filter((url) => url.includes('/v1/auctions/suggestions'))
    const lastSuggestionUrl = (fetchMock: ReturnType<typeof stubCombobox>): string =>
      suggestionUrls(fetchMock).at(-1) ?? ''
    const search = (): HTMLElement => screen.getByRole('combobox', { name: 'Buscar subastas' })
    const field = (name: string): HTMLElement => screen.getByRole('combobox', { name })
    const renderMarket = async (): Promise<void> => {
      renderWithProviders(<AuctionMarketplace />)
      await screen.findByText('Espada del Nexo')
    }

    it('con menos de 3 caracteres no pide sugerencias ni abre el desplegable', async () => {
      const user = userEvent.setup()
      const fetchMock = stubCombobox({})
      await renderMarket()

      await user.type(search(), 'xy')
      await new Promise((resolve) => setTimeout(resolve, 350))

      expect(suggestionUrls(fetchMock)).toHaveLength(0)
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })

    it('con 3+ caracteres pide sugerencias tras el debounce', async () => {
      const user = userEvent.setup()
      const fetchMock = stubCombobox({
        suggestions: () => ({ items: [suggestion('p1', 'Corona del Nexo', 'EPICA')] }),
      })
      await renderMarket()

      await user.type(search(), 'cor')

      await waitFor(() => {
        expect(suggestionUrls(fetchMock).length).toBeGreaterThan(0)
      })
    })

    it('construye la query exacta: q, limit y filtros compatibles, sin sort/page/pageSize', async () => {
      const user = userEvent.setup()
      const fetchMock = stubCombobox({ suggestions: () => ({ items: [] }) })
      await renderMarket()
      await user.selectOptions(field('Publicador'), 'PLAYER')
      await user.selectOptions(field('Tipo de precio'), 'CREDITS')
      await user.selectOptions(field('Compra inmediata'), 'true')

      await user.type(search(), 'drag')

      await waitFor(() => {
        expect(suggestionUrls(fetchMock).length).toBeGreaterThan(0)
      })
      const url = new URL(lastSuggestionUrl(fetchMock), 'http://localhost')
      expect([...url.searchParams.keys()]).toEqual([
        'q',
        'limit',
        'publisherType',
        'priceKind',
        'hasBuyNow',
      ])
      expect(url.searchParams.get('q')).toBe('drag')
      expect(url.searchParams.get('limit')).toBe('8')
      expect(url.searchParams.get('publisherType')).toBe('PLAYER')
      expect(url.searchParams.get('priceKind')).toBe('CREDITS')
      expect(url.searchParams.get('hasBuyNow')).toBe('true')
      expect(url.searchParams.has('sort')).toBe(false)
      expect(url.searchParams.has('page')).toBe(false)
      expect(url.searchParams.has('pageSize')).toBe(false)
    })

    it('muestra el estado de carga mientras llegan las sugerencias', async () => {
      const user = userEvent.setup()
      vi.stubGlobal(
        'fetch',
        vi.fn((input: RequestInfo | URL) => {
          const url = urlOf(input)
          if (url.includes('/v1/catalog/products/exclusive-1'))
            return Promise.resolve(jsonResponse(product('exclusive-1', 'Corona del Nexo', 'EPICA')))
          if (url.includes('/v1/catalog/products/owned-1'))
            return Promise.resolve(jsonResponse(product('owned-1', 'Espada del Nexo', 'ARMA')))
          if (url.includes('/v1/auctions/suggestions'))
            return new Promise<Response>(() => undefined)
          return Promise.resolve(jsonResponse(activeAuctionPage(2)))
        }),
      )
      renderWithProviders(<AuctionMarketplace />)
      await screen.findByText('Espada del Nexo')

      await user.type(search(), 'drag')

      expect(await screen.findByText('Buscando sugerencias...')).toBeInTheDocument()
    })

    it('muestra "sin sugerencias" cuando Auction no encuentra coincidencias', async () => {
      const user = userEvent.setup()
      stubCombobox({ suggestions: () => ({ items: [] }) })
      await renderMarket()

      await user.type(search(), 'zzz')

      expect(await screen.findByText('Sin sugerencias para esta búsqueda.')).toBeInTheDocument()
    })

    it('un error de sugerencias no rompe el marketplace principal', async () => {
      const user = userEvent.setup()
      stubCombobox({ suggestions: () => ({ status: 500 }) })
      await renderMarket()

      await user.type(search(), 'drag')

      expect(await screen.findByText('No se pudieron cargar las sugerencias.')).toBeInTheDocument()
      expect(screen.getAllByRole('article')).toHaveLength(2)
    })

    it('pinta nombre y tipo de cada sugerencia', async () => {
      const user = userEvent.setup()
      stubCombobox({
        suggestions: () => ({
          items: [
            suggestion('p1', 'Corona del Nexo', 'EPICA'),
            suggestion('p2', 'Cofre del Nexo', 'COFRE'),
          ],
        }),
      })
      await renderMarket()

      await user.type(search(), 'nexo')

      const listbox = await screen.findByRole('listbox')
      const options = await within(listbox).findAllByRole('option')
      expect(options).toHaveLength(2)
      expect(options[0]).toHaveTextContent('Corona del Nexo')
      expect(options[0]).toHaveTextContent('EPICA')
      expect(options[1]).toHaveTextContent('Cofre del Nexo')
      expect(options[1]).toHaveTextContent('COFRE')
    })

    it('clic en una sugerencia aplica la busqueda, vuelve a pagina 1 y cierra el desplegable', async () => {
      const user = userEvent.setup()
      const fetchMock = stubCombobox({
        suggestions: () => ({ items: [suggestion('p1', 'Corona del Nexo', 'EPICA')] }),
        list: () => ({ total: 100, items: auctions }),
      })
      await renderMarket()
      await user.click(screen.getByRole('button', { name: 'Siguiente' }))
      await screen.findByText('Página 2 de 7')

      await user.type(search(), 'corona')
      const option = await screen.findByRole('option', { name: /Corona del Nexo/ })
      await user.click(option)

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      await waitFor(() => {
        expect(lastSearch(fetchMock)).toBe('?page=1&pageSize=16&search=Corona+del+Nexo')
      })
      expect(search()).toHaveValue('Corona del Nexo')
    })

    it('ArrowDown/ArrowUp mueven el resaltado entre las opciones', async () => {
      const user = userEvent.setup()
      stubCombobox({
        suggestions: () => ({
          items: [
            suggestion('p1', 'Corona del Nexo', 'EPICA'),
            suggestion('p2', 'Cofre del Nexo', 'COFRE'),
          ],
        }),
      })
      await renderMarket()
      await user.type(search(), 'nexo')
      await screen.findByRole('option', { name: /Corona del Nexo/ })

      await user.keyboard('{ArrowDown}')
      expect(screen.getByRole('option', { name: /Corona del Nexo/ })).toHaveAttribute(
        'aria-selected',
        'true',
      )

      await user.keyboard('{ArrowDown}')
      expect(screen.getByRole('option', { name: /Cofre del Nexo/ })).toHaveAttribute(
        'aria-selected',
        'true',
      )

      await user.keyboard('{ArrowUp}')
      expect(screen.getByRole('option', { name: /Corona del Nexo/ })).toHaveAttribute(
        'aria-selected',
        'true',
      )
    })

    it('Enter con una opcion resaltada la selecciona', async () => {
      const user = userEvent.setup()
      stubCombobox({
        suggestions: () => ({ items: [suggestion('p1', 'Corona del Nexo', 'EPICA')] }),
      })
      await renderMarket()
      await user.type(search(), 'corona')
      await screen.findByRole('option', { name: /Corona del Nexo/ })
      await user.keyboard('{ArrowDown}')

      await user.keyboard('{Enter}')

      expect(search()).toHaveValue('Corona del Nexo')
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })

    it('Enter sin resaltado conserva la busqueda manual existente', async () => {
      const user = userEvent.setup()
      const fetchMock = stubCombobox({
        suggestions: () => ({ items: [suggestion('p1', 'Corona del Nexo', 'EPICA')] }),
      })
      await renderMarket()
      await user.type(search(), 'corona')
      await screen.findByRole('option', { name: /Corona del Nexo/ })

      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(lastSearch(fetchMock)).toBe('?page=1&pageSize=16&search=corona')
      })
      expect(search()).toHaveValue('corona')
    })

    it('Escape cierra el desplegable sin borrar el input ni la busqueda aplicada', async () => {
      const user = userEvent.setup()
      const fetchMock = stubCombobox({
        suggestions: () => ({ items: [suggestion('p1', 'Corona del Nexo', 'EPICA')] }),
      })
      await renderMarket()
      await user.type(search(), 'corona')
      await screen.findByRole('option', { name: /Corona del Nexo/ })
      await user.keyboard('{Enter}')
      await waitFor(() => {
        expect(lastSearch(fetchMock)).toBe('?page=1&pageSize=16&search=corona')
      })

      await user.keyboard('{ArrowDown}')
      await screen.findByRole('listbox')
      await user.keyboard('{Escape}')

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      expect(search()).toHaveValue('corona')
      expect(field('Publicador')).toHaveValue('')
    })

    it('Limpiar busqueda cierra el desplegable y limpia el resaltado', async () => {
      const user = userEvent.setup()
      stubCombobox({
        suggestions: () => ({ items: [suggestion('p1', 'Corona del Nexo', 'EPICA')] }),
      })
      await renderMarket()
      await user.type(search(), 'corona')
      await screen.findByRole('option', { name: /Corona del Nexo/ })
      await user.keyboard('{Enter}')
      const clearSearchButton = await screen.findByRole('button', { name: 'Limpiar búsqueda' })
      await user.keyboard('{ArrowDown}')
      await screen.findByRole('listbox')

      await user.click(clearSearchButton)

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      expect(search()).toHaveValue('')
    })

    it('Limpiar filtros cierra el desplegable y limpia el resaltado', async () => {
      const user = userEvent.setup()
      stubCombobox({
        suggestions: () => ({ items: [suggestion('p1', 'Corona del Nexo', 'EPICA')] }),
      })
      await renderMarket()
      await user.selectOptions(field('Publicador'), 'PLAYER')
      await user.type(search(), 'corona')
      await screen.findByRole('option', { name: /Corona del Nexo/ })
      await user.keyboard('{Enter}')
      await user.keyboard('{ArrowDown}')
      await screen.findByRole('listbox')

      await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      expect(search()).toHaveValue('')
    })

    it('las sugerencias conservan publisherType/priceKind/hasBuyNow activos', async () => {
      const user = userEvent.setup()
      const fetchMock = stubCombobox({ suggestions: () => ({ items: [] }) })
      await renderMarket()
      await user.selectOptions(field('Publicador'), 'GAME_MASTER')
      await user.selectOptions(field('Tipo de precio'), 'REAL_MONEY')

      await user.type(search(), 'drag')

      await waitFor(() => {
        expect(suggestionUrls(fetchMock).length).toBeGreaterThan(0)
      })
      const url = new URL(lastSuggestionUrl(fetchMock), 'http://localhost')
      expect(url.searchParams.get('publisherType')).toBe('GAME_MASTER')
      expect(url.searchParams.get('priceKind')).toBe('REAL_MONEY')
    })

    it('nunca envia sort a las sugerencias aunque el orden este activo', async () => {
      const user = userEvent.setup()
      const fetchMock = stubCombobox({ suggestions: () => ({ items: [] }) })
      await renderMarket()
      await user.selectOptions(field('Ordenar por'), 'newest')

      await user.type(search(), 'drag')

      await waitFor(() => {
        expect(suggestionUrls(fetchMock).length).toBeGreaterThan(0)
      })
      expect(
        new URL(lastSuggestionUrl(fetchMock), 'http://localhost').searchParams.has('sort'),
      ).toBe(false)
    })

    it('seleccionar una sugerencia no afecta priceKind ni el orden por precio', async () => {
      const user = userEvent.setup()
      stubCombobox({
        suggestions: () => ({ items: [suggestion('p1', 'Corona del Nexo', 'EPICA')] }),
      })
      await renderMarket()
      await user.selectOptions(field('Ordenar por'), 'priceAsc')
      expect(field('Tipo de precio')).toHaveValue('CREDITS')

      await user.type(search(), 'corona')
      await user.click(await screen.findByRole('option', { name: /Corona del Nexo/ }))

      expect(field('Tipo de precio')).toHaveValue('CREDITS')
      expect(field('Ordenar por')).toHaveValue('priceAsc')
    })

    it('una respuesta atrasada de una busqueda anterior no reemplaza a la mas reciente', async () => {
      const user = userEvent.setup()
      const resolvers = new Map<string, (response: Response) => void>()
      const fetchMock = vi.fn((input: RequestInfo | URL) => {
        const url = urlOf(input)
        if (url.includes('/v1/catalog/products/exclusive-1'))
          return Promise.resolve(jsonResponse(product('exclusive-1', 'Corona del Nexo', 'EPICA')))
        if (url.includes('/v1/catalog/products/owned-1'))
          return Promise.resolve(jsonResponse(product('owned-1', 'Espada del Nexo', 'ARMA')))
        if (url.includes('/v1/auctions/suggestions')) {
          const q = new URL(url, 'http://localhost').searchParams.get('q') ?? ''
          return new Promise<Response>((resolve) => {
            resolvers.set(q, resolve)
          })
        }
        return Promise.resolve(jsonResponse(activeAuctionPage(2)))
      })
      vi.stubGlobal('fetch', fetchMock)
      renderWithProviders(<AuctionMarketplace />)
      await screen.findByText('Espada del Nexo')

      await user.type(search(), 'cat')
      await waitFor(() => {
        expect(resolvers.has('cat')).toBe(true)
      })

      await user.clear(search())
      await user.type(search(), 'dog')
      await waitFor(() => {
        expect(resolvers.has('dog')).toBe(true)
      })

      resolvers.get('dog')!(
        jsonResponse({ items: [suggestion('p-dog', 'Perro del Nexo', 'MASCOTA')] }),
      )
      await screen.findByRole('option', { name: /Perro del Nexo/ })

      resolvers.get('cat')!(
        jsonResponse({ items: [suggestion('p-cat', 'Gato del Nexo', 'MASCOTA')] }),
      )
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(screen.queryByRole('option', { name: /Gato del Nexo/ })).not.toBeInTheDocument()
      expect(screen.getByRole('option', { name: /Perro del Nexo/ })).toBeInTheDocument()
    })

    it('la clave de sugerencias distingue consultas y usa un prefijo propio', () => {
      const base = { limit: 8, publisherType: null, priceKind: null, hasBuyNow: null }

      expect(queryKeys.auctions.suggestions({ ...base, q: 'dragon' })).not.toEqual(
        queryKeys.auctions.suggestions({ ...base, q: 'sword' }),
      )
      expect(queryKeys.auctions.suggestions({ ...base, q: 'dragon' }).slice(0, 2)).toEqual([
        'auctions',
        'suggestions',
      ])
    })

    it('expone el patron ARIA combobox/listbox/option completo', async () => {
      const user = userEvent.setup()
      stubCombobox({
        suggestions: () => ({ items: [suggestion('p1', 'Corona del Nexo', 'EPICA')] }),
      })
      await renderMarket()
      const input = search()
      expect(input).toHaveAttribute('aria-autocomplete', 'list')
      expect(input).toHaveAttribute('aria-expanded', 'false')
      expect(input).not.toHaveAttribute('aria-controls')
      expect(input).not.toHaveAttribute('aria-activedescendant')

      await user.type(input, 'corona')
      const listbox = await screen.findByRole('listbox')
      expect(input).toHaveAttribute('aria-expanded', 'true')
      expect(input).toHaveAttribute('aria-controls', listbox.id)

      const option = await screen.findByRole('option', { name: /Corona del Nexo/ })
      expect(option).toHaveAttribute('aria-selected', 'false')

      await user.keyboard('{ArrowDown}')
      expect(option).toHaveAttribute('aria-selected', 'true')
      expect(input).toHaveAttribute('aria-activedescendant', option.id)
    })
  })
})
