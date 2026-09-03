import { afterEach, describe, expect, it, vi } from 'vitest'

import { HttpError } from '@/lib/http'
import { jsonResponse, showcaseProduct } from '@/test/commerce-fixtures'
import { fetchShowcase, NO_FILTERS, showcaseQuery } from './api'

afterEach(() => {
  vi.unstubAllGlobals()
})

const products = Array.from({ length: 64 }, (_, index) =>
  showcaseProduct({ productId: `product-${String(index + 1)}`, sku: `sku-${String(index + 1)}` }),
)
const catalogResponse = (page: number, total: number): Response =>
  jsonResponse({
    items: products.slice((page - 1) * 16, Math.min(page * 16, total)),
    page,
    pageSize: 16,
    total,
  })
const setup = (total = 64) => {
  const fetcher = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>((input) => {
    const url = new URL(input, globalThis.location.origin)
    return Promise.resolve(catalogResponse(Number(url.searchParams.get('page')), total))
  })
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}
const requestPages = (fetcher: ReturnType<typeof setup>) =>
  fetcher.mock.calls.map(([input]) =>
    new URL(input, globalThis.location.origin).searchParams.get('page'),
  )

describe('Paginacion visible de 12 sobre el contrato HTTP de 16', () => {
  it.each([
    { page: 1, requests: ['1'], from: 0, to: 12 },
    { page: 2, requests: ['1', '2'], from: 12, to: 24 },
    { page: 3, requests: ['2', '3'], from: 24, to: 36 },
    { page: 4, requests: ['3'], from: 36, to: 48 },
    { page: 5, requests: ['4'], from: 48, to: 60 },
  ])('devuelve la franja exacta de la pagina $page', async ({ page, requests, from, to }) => {
    const fetcher = setup()

    const result = await fetchShowcase(showcaseQuery(NO_FILTERS, page))

    expect(result).toEqual({ items: products.slice(from, to), page, pageSize: 12, total: 64 })
    expect(requestPages(fetcher)).toEqual(requests)
  })

  it('recorre todas las paginas sin perder ni repetir productos', async () => {
    setup(49)
    const seen: string[] = []
    for (let page = 1; page <= 5; page++) {
      const result = await fetchShowcase(showcaseQuery(NO_FILTERS, page))
      seen.push(...result.items.map((product) => product.productId))
    }

    expect(seen).toEqual(products.slice(0, 49).map((product) => product.productId))
    expect(new Set(seen).size).toBe(49)
  })

  it.each([
    { page: 2, total: 17, requests: ['1', '2'], from: 12 },
    { page: 3, total: 25, requests: ['2'], from: 24 },
    { page: 3, total: 32, requests: ['2'], from: 24 },
    { page: 1, total: 0, requests: ['1'], from: 0 },
    { page: 4, total: 25, requests: ['3'], from: 36 },
  ])(
    'respeta el final con total $total y pagina $page',
    async ({ page, total, requests, from }) => {
      const fetcher = setup(total)

      const result = await fetchShowcase(showcaseQuery(NO_FILTERS, page))

      expect(result).toEqual({ items: products.slice(from, total), page, pageSize: 12, total })
      expect(requestPages(fetcher)).toEqual(requests)
    },
  )

  it('mantiene todos los filtros y la moneda en ambas consultas sin filtrar de nuevo', async () => {
    const fetcher = setup()
    const query = showcaseQuery(
      { term: '  heroe & espada  ', type: 'HEROE', minPrice: 0, maxPrice: 4000, currency: 'EUR' },
      2,
    )

    const result = await fetchShowcase(query)

    expect(result.items).toEqual(products.slice(12, 24))
    expect(query).toBe(
      'page=2&query=heroe+%26+espada&type=HEROE&minPrice=0&maxPrice=4000&currency=EUR',
    )
    for (const [input] of fetcher.mock.calls) {
      const url = new URL(input, globalThis.location.origin)
      expect(url.pathname).toBe('/api/v1/catalog/products')
      expect(Object.fromEntries(url.searchParams)).toEqual({
        page: expect.stringMatching(/^[12]$/u),
        query: 'heroe & espada',
        type: 'HEROE',
        minPrice: '0',
        maxPrice: '4000',
        currency: 'EUR',
      })
    }
  })

  it('transmite la misma señal a ambas peticiones', async () => {
    const fetcher = setup()
    const controller = new AbortController()

    await fetchShowcase(showcaseQuery(NO_FILTERS, 2), controller.signal)

    expect(fetcher).toHaveBeenCalledTimes(2)
    for (const [, init] of fetcher.mock.calls) expect(init?.signal).toBe(controller.signal)
  })

  it('no inicia peticiones con una señal ya cancelada', async () => {
    const fetcher = setup()
    const controller = new AbortController()
    controller.abort()

    await expect(
      fetchShowcase(showcaseQuery(NO_FILTERS, 2), controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('no inicia la segunda peticion si se cancela durante la primera', async () => {
    const fetcher = setup()
    const controller = new AbortController()
    fetcher.mockImplementationOnce(() => {
      controller.abort()
      return Promise.resolve(catalogResponse(1, 64))
    })

    await expect(
      fetchShowcase(showcaseQuery(NO_FILTERS, 2), controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('descarta los resultados si se cancela durante la segunda peticion', async () => {
    const fetcher = setup()
    const controller = new AbortController()
    fetcher.mockImplementationOnce(() => Promise.resolve(catalogResponse(1, 64)))
    fetcher.mockImplementationOnce(() => {
      controller.abort()
      return Promise.resolve(catalogResponse(2, 64))
    })

    await expect(
      fetchShowcase(showcaseQuery(NO_FILTERS, 2), controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it.each([1, 2])(
    'propaga el error HTTP de la peticion %i sin entregar una pagina parcial',
    async (failedRequest) => {
      const fetcher = setup()
      if (failedRequest === 2) fetcher.mockResolvedValueOnce(catalogResponse(1, 64))
      fetcher.mockResolvedValueOnce(jsonResponse({ message: 'Catalog no disponible.' }, 503))

      const result = fetchShowcase(showcaseQuery(NO_FILTERS, 2))

      await expect(result).rejects.toBeInstanceOf(HttpError)
      await expect(result).rejects.toMatchObject({ status: 503, message: 'Catalog no disponible.' })
      expect(fetcher).toHaveBeenCalledTimes(failedRequest)
    },
  )

  it('propaga fallos de red de la segunda peticion', async () => {
    const fetcher = setup()
    const networkError = new TypeError('Failed to fetch')
    fetcher.mockResolvedValueOnce(catalogResponse(1, 64))
    fetcher.mockRejectedValueOnce(networkError)

    await expect(fetchShowcase(showcaseQuery(NO_FILTERS, 2))).rejects.toBe(networkError)
  })

  it.each(['0', '-1', '1.5', 'NaN', String(Number.MAX_SAFE_INTEGER)])(
    'rechaza la pagina invalida %s antes de calcular peticiones',
    async (page) => {
      const fetcher = setup()

      await expect(fetchShowcase(`page=${page}`)).rejects.toBeInstanceOf(RangeError)
      expect(fetcher).not.toHaveBeenCalled()
    },
  )
})
