import { beforeEach, describe, expect, it, vi } from 'vitest'

import { httpClient } from '@/lib/http'
import { registerBid } from './api'

describe('registerBid', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('envía el monto y la clave de idempotencia al contrato de Auction', async () => {
    const request = vi.spyOn(httpClient, 'request').mockResolvedValue({
      id: 'bid-1',
      auctionId: 'auction-1',
      bidderId: 'player-1',
      amountCredits: 1600,
      placedAt: '2026-09-22T12:00:00.000Z',
    })

    await registerBid('auction/1', { amountCredits: 1600 }, 'key-1')

    expect(request).toHaveBeenCalledWith('/v1/auctions/auction%2F1/bids', {
      method: 'POST',
      body: { amountCredits: 1600 },
      headers: { 'Idempotency-Key': 'key-1' },
    })
  })
})

