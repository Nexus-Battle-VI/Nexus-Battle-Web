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

export interface PublishOfficialAuctionInput {
  readonly productId: string
  readonly durationHours: 24 | 48
  readonly currency: string
  readonly minimumBidAmountMinor: number
  readonly buyNowAmountMinor?: number
}

export interface OfficialAuctionPublication {
  readonly id: string
  readonly publisherId: string
  readonly publisherType: 'GAME_MASTER'
  readonly productId: string
  readonly durationHours: 24 | 48
  readonly publicationFeeCredits: 0
  readonly currency: string
  readonly minimumBidAmountMinor: number
  readonly buyNowAmountMinor: number | null
  readonly mark: 'OFFICIAL' | 'PREMIUM'
  readonly status: 'ACTIVE'
  readonly publishedAt: string
  readonly closesAt: string
}

interface ActiveAuctionBase {
  readonly id: string
  readonly sellerId: string
  readonly productId: string
  readonly status: 'ACTIVE'
  readonly publishedAt: string
  readonly closesAt: string
  readonly currentBidAmount: number | null
}

export interface PlayerActiveAuction extends ActiveAuctionBase {
  readonly publisherType: 'PLAYER'
  readonly priceKind: 'CREDITS'
  readonly minimumBidCredits: number
  readonly buyNowCredits: number | null
  readonly currency: null
  readonly minimumBidAmountMinor: null
  readonly buyNowAmountMinor: null
  readonly officialMark: null
}

export interface OfficialActiveAuction extends ActiveAuctionBase {
  readonly publisherType: 'GAME_MASTER'
  readonly priceKind: 'REAL_MONEY'
  readonly minimumBidCredits: null
  readonly buyNowCredits: null
  readonly currency: string
  readonly minimumBidAmountMinor: number
  readonly buyNowAmountMinor: number | null
  readonly officialMark: 'OFFICIAL' | 'PREMIUM'
}

export type ActiveAuction = PlayerActiveAuction | OfficialActiveAuction

export interface ActiveAuctionPage {
  readonly items: readonly ActiveAuction[]
  readonly page: number
  readonly pageSize: number
  readonly total: number
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
  PRODUCT_NOT_ELIGIBLE:
    'Catalog indica que el producto no es exclusivo o no está disponible para publicación oficial.',
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

/** Traduce el rechazo de `followAuction` (HU-68), compartido entre las pantallas que ofrecen "Seguir". */
export const describeFollowError = (error: unknown): string => {
  if (error instanceof HttpError && error.status === 409) return 'Ya sigues esta subasta.'
  if (error instanceof HttpError && (error.status === 404 || error.status === 422))
    return 'La subasta no está disponible para seguimiento.'
  return 'No se pudo seguir la subasta. Inténtalo de nuevo.'
}

export const publishOfficialAuction = (
  input: PublishOfficialAuctionInput,
  operationId: string,
): Promise<OfficialAuctionPublication> =>
  httpClient.post<OfficialAuctionPublication>('/v1/official-auctions', input, {
    'Idempotency-Key': operationId,
  })

export const listActiveAuctions = (
  page: number,
  signal?: AbortSignal,
): Promise<ActiveAuctionPage> =>
  httpClient.get<ActiveAuctionPage>(`/v1/auctions?page=${String(page)}&pageSize=12`, signal)
