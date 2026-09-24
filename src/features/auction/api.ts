import { httpClient, HttpError } from '@/lib/http'
import type { WatchlistResponse } from './contract'

export interface PublishAuctionInput {
  readonly productId: string
  readonly durationHours: 24 | 48
  readonly minimumBidCredits: number
  readonly buyNowCredits?: number
}

export interface AuctionPublication {
  readonly id: string
  readonly sellerId: string
  readonly productId: string
  readonly durationHours: 24 | 48
  readonly publicationFeeCredits: number
  readonly minimumBidCredits: number
  readonly buyNowCredits: number | null
  readonly status: 'ACTIVE'
  readonly publishedAt: string
  readonly closesAt: string
}

interface AuctionErrorBody {
  readonly code?: unknown
}

const ERROR_MESSAGES: Readonly<Record<string, string>> = {
  PRODUCT_NOT_OWNED: 'Este producto ya no pertenece a tu inventario. Actualiza la selección.',
  PRODUCT_IN_USE: 'Desequipa el producto antes de publicarlo.',
  PRODUCT_NOT_TRADABLE: 'Este producto no puede comercializarse en subasta.',
  SELLER_SANCTIONED: 'Tu cuenta tiene una sanción activa. Revisa su vigencia antes de reintentar.',
  ACTIVE_AUCTION_LIMIT_REACHED: 'Ya tienes 10 subastas activas. Espera a que finalice una.',
  INVALID_BUY_NOW_PRICE: 'La compra inmediata debe superar el precio mínimo de puja.',
  INVALID_CREDITS: 'Ingresa precios enteros y mayores que cero.',
  INSUFFICIENT_FUNDS: 'No tienes créditos suficientes para pagar la comisión seleccionada.',
  DEPENDENCY_UNAVAILABLE:
    'No pudimos verificar todos los datos. Conservamos el formulario para reintentar.',
}

export const describeAuctionError = (error: unknown): string => {
  if (!(error instanceof HttpError)) {
    return error instanceof Error ? error.message : 'No se pudo publicar la subasta.'
  }
  const body = error.body as AuctionErrorBody | null
  const code = typeof body?.code === 'string' ? body.code : ''
  return ERROR_MESSAGES[code] ?? error.message
}

export const publishAuction = (
  input: PublishAuctionInput,
  operationId: string,
): Promise<AuctionPublication> =>
  httpClient.post<AuctionPublication>('/v1/auctions', input, {
    'Idempotency-Key': operationId,
  })

/** Consulta la lista privada; Auction deduce al jugador desde su JWT. */
export const fetchWatchlist = (signal?: AbortSignal): Promise<WatchlistResponse> =>
  httpClient.get('/v1/auctions/watchlist', signal)

/** Agrega una subasta activa a la lista privada del jugador autenticado. */
export const followAuction = (auctionId: string): Promise<unknown> =>
  httpClient.post('/v1/auctions/watchlist', { auctionId })

/** Elimina el seguimiento sin afectar la subasta ni sus pujas. */
export const unfollowAuction = (auctionId: string): Promise<unknown> =>
  httpClient.delete(`/v1/auctions/watchlist/${encodeURIComponent(auctionId)}`)
