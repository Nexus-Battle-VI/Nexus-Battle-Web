import { beforeEach, describe, expect, it, vi } from 'vitest'

import { httpClient } from '@/lib/http'
import { configureAutoBid } from './api'

describe('configureAutoBid', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('envía el limite maximo y la clave de idempotencia al contrato de Auction', async () => {
    const request = vi.spyOn(httpClient, 'request').mockResolvedValue({
      auctionId: 'auction-1',
      bidderId: 'player-1',
      maxAmountCredits: 5000,
      configuredAt: '2026-09-22T12:00:00.000Z',
      isActive: true,
    })

    await configureAutoBid('auction/1', { maxAmountCredits: 5000 }, 'key-1')

    expect(request).toHaveBeenCalledWith('/v1/auctions/auction%2F1/auto-bid', {
      method: 'POST',
      body: { maxAmountCredits: 5000 },
      headers: { 'Idempotency-Key': 'key-1' },
    })
  })
})
