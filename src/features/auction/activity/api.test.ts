import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchMyAuctions, fetchMyBids, fetchMyTransactions, fetchMyViewStatistics } from './api'

const json = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

const requestUrl = (input: RequestInfo | URL): string =>
  typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

afterEach(() => vi.unstubAllGlobals())

describe('API del panel personal HU-89', () => {
  it('consulta los cuatro contratos sin enviar un identificador de usuario', async () => {
    const fetch = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(json({ items: [], total: 0, page: 1, pageSize: 16 })),
      )
    vi.stubGlobal('fetch', fetch)

    await fetchMyAuctions({ page: 2, pageSize: 10 })
    await fetchMyBids({ page: 3, pageSize: 20 })
    await fetchMyTransactions({ page: 4, pageSize: 25 })
    await fetchMyViewStatistics()

    const urls = fetch.mock.calls.map(([input]) => requestUrl(input as RequestInfo | URL))
    expect(urls).toEqual([
      expect.stringContaining('/v1/auctions/me/owned?page=2&pageSize=10'),
      expect.stringContaining('/v1/auctions/me/bids?page=3&pageSize=20'),
      expect.stringContaining('/v1/auctions/me/transactions?page=4&pageSize=25'),
      expect.stringContaining('/v1/auctions/me/view-statistics'),
    ])
    for (const identifier of ['userId', 'playerId', 'sellerId', 'bidderId']) {
      expect(urls.every((url) => !url.includes(identifier))).toBe(true)
    }
  })
})
