import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchOwnedItemDetail, fetchOwnedItems } from './api'

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('player-inventory api', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(
      jsonResponse({ items: [], page: 1, pageSize: 16, totalItems: 0, totalPages: 0 }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('pide solo la página cuando no hay búsqueda ni filtro', async () => {
    await fetchOwnedItems({ page: 2 })

    expect(fetchMock).toHaveBeenCalledWith('/api/inventories/me/items?page=2', expect.anything())
  })

  it('incluye q y type cuando se proporcionan', async () => {
    await fetchOwnedItems({ page: 1, q: 'espada', type: 'ARMA' })

    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toContain('page=1')
    expect(url).toContain('q=espada')
    expect(url).toContain('type=ARMA')
  })

  it('omite q vacío y type nulo', async () => {
    await fetchOwnedItems({ page: 1, q: '', type: null })

    expect(fetchMock).toHaveBeenCalledWith('/api/inventories/me/items?page=1', expect.anything())
  })

  it('construye la URL del detalle escapando la referencia', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ itemId: 'a b', quantity: 1, product: {} }))

    await fetchOwnedItemDetail('a b')

    expect(fetchMock).toHaveBeenCalledWith('/api/inventories/me/items/a%20b', expect.anything())
  })
})
