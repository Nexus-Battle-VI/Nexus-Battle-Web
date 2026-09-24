import { beforeEach, describe, expect, it, vi } from 'vitest'

import { httpClient } from '@/lib/http'
import { claimBatch, claimItem, fetchPendingClaims } from './api'

describe('pending-claims api', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetchPendingClaims consulta el listado del titular autenticado', async () => {
    const get = vi.spyOn(httpClient, 'get').mockResolvedValue([])
    const controller = new AbortController()

    await fetchPendingClaims(controller.signal)

    expect(get).toHaveBeenCalledWith('/v1/auctions/me/pending-claims', controller.signal)
  })

  it('claimItem reclama un producto individual codificando el auctionId', async () => {
    const post = vi.spyOn(httpClient, 'post').mockResolvedValue({
      auctionId: 'auction/1',
      productId: 'product-1',
      winningBidId: 'bid-1',
      finalAmountCredits: 30,
      settledAt: '2026-09-20T12:00:00.000Z',
      claimStatus: 'CLAIMED',
      claimDeadline: '2026-09-27T12:00:00.000Z',
      remainingClaimDays: 0,
    })

    await claimItem('auction/1')

    expect(post).toHaveBeenCalledWith('/v1/auctions/me/pending-claims/auction%2F1/claim')
  })

  it('claimBatch envia auctionIds explicitos', async () => {
    const post = vi.spyOn(httpClient, 'post').mockResolvedValue({ results: [] })

    await claimBatch({ auctionIds: ['auction-1', 'auction-2'] })

    expect(post).toHaveBeenCalledWith('/v1/auctions/me/pending-claims/claim-batch', {
      auctionIds: ['auction-1', 'auction-2'],
    })
  })

  it('claimBatch envia claimAll cuando se pide "recoger todo"', async () => {
    const post = vi.spyOn(httpClient, 'post').mockResolvedValue({ results: [] })

    await claimBatch({ claimAll: true })

    expect(post).toHaveBeenCalledWith('/v1/auctions/me/pending-claims/claim-batch', {
      claimAll: true,
    })
  })
})
