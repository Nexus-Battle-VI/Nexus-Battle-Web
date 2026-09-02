import { afterEach, describe, expect, it, vi } from 'vitest'

import { addToWishlist, fetchWishlist, removeFromWishlist } from './api'

afterEach(() => {
  vi.unstubAllGlobals()
})

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const stubFetch = (response: Response) => {
  const fetchImpl = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchImpl)

  return fetchImpl
}

describe('api de la lista de deseos', () => {
  it('consulta las referencias deseadas', async () => {
    const fetchImpl = stubFetch(jsonResponse([{ sku: 'x', enDeseos: true, adquirido: false }]))

    const result = await fetchWishlist()

    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain('/wishlist')
    expect(result).toHaveLength(1)
  })

  it('anade con POST sobre la referencia', async () => {
    const fetchImpl = stubFetch(jsonResponse({ sku: 'x', enDeseos: true, adquirido: false }))

    await addToWishlist('espada-de-hierro')

    const [url, init] = fetchImpl.mock.calls[0] ?? []
    expect(String(url)).toContain('/wishlist/espada-de-hierro')
    expect((init as RequestInit).method).toBe('POST')
  })

  it('retira con DELETE sobre la referencia', async () => {
    const fetchImpl = stubFetch(jsonResponse({ sku: 'x', enDeseos: false, adquirido: false }))

    await removeFromWishlist('espada-de-hierro')

    const [url, init] = fetchImpl.mock.calls[0] ?? []
    expect(String(url)).toContain('/wishlist/espada-de-hierro')
    expect((init as RequestInit).method).toBe('DELETE')
  })

  /** El estado de adquisicion lo deriva el servicio: aqui no se calcula. */
  it('el cuerpo no declara si la referencia esta adquirida', async () => {
    const fetchImpl = stubFetch(jsonResponse({ sku: 'x', enDeseos: true, adquirido: false }))

    await addToWishlist('espada-de-hierro')

    expect((fetchImpl.mock.calls[0]?.[1] as RequestInit | undefined)?.body).toBeUndefined()
  })
})
