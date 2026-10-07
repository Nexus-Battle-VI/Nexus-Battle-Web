import { describe, expect, it, vi } from 'vitest'

import { HttpError, httpClient } from '@/lib/http'
import {
  cancelAuction,
  describeAuctionCancellationFailure,
  isRetryableAuctionCancellationError,
} from './detail-api'
import { newIdempotencyKey } from './idempotencyKey'

describe('cancelAuction (HU-90)', () => {
  it('hace POST al endpoint real, sin body y con Idempotency-Key', async () => {
    const post = vi.spyOn(httpClient, 'post').mockResolvedValue({})
    await cancelAuction('auction / 1', 'key-1')
    expect(post).toHaveBeenCalledWith('/v1/auctions/auction%20%2F%201/cancel', undefined, {
      'Idempotency-Key': 'key-1',
    })
  })

  it.each([
    ['AUCTION_HAS_BIDS', 'No puedes cancelar una subasta que ya tiene pujas.'],
    [
      'AUCTION_CANCELLATION_WINDOW_CLOSED',
      'No puedes cancelar la subasta durante las últimas 6 horas.',
    ],
    ['AUCTION_NOT_OWNER', 'No tienes permiso para cancelar esta subasta.'],
    ['AUCTION_NOT_ACTIVE', 'Esta subasta ya no está activa.'],
    ['AUCTION_NOT_FOUND', 'No encontramos esta subasta.'],
    [
      'IDEMPOTENCY_CONFLICT',
      'No se pudo repetir la operación de forma segura. Inténtalo nuevamente.',
    ],
  ] as const)('mapea %s con el mapper real', (code, message) => {
    expect(describeAuctionCancellationFailure(new HttpError(409, 'ignored', { code }))).toBe(
      message,
    )
  })

  it('solo reintenta errores fuera de HTTP', () => {
    expect(isRetryableAuctionCancellationError(new Error('network'))).toBe(true)
    expect(isRetryableAuctionCancellationError(new HttpError(503, 'unavailable', {}))).toBe(false)
  })

  it('crea una key distinta por cada accion independiente', () => {
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey())
  })
})
