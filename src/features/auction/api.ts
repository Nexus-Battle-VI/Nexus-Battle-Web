import { httpClient, HttpError } from '@/lib/http'
import type { WatchlistResponse } from './contract'
import { i18n } from '@/shared/i18n/i18n'
import { currentLanguage } from '@/shared/i18n/language'
import { describeFailure } from '@/shared/i18n/errors'

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
  /** Total de pujas persistidas en Auction; 0 si nadie ha pujado. */
  readonly bidCount: number
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

/** Tamano de pagina por defecto del marketplace. */
export const AUCTION_PAGE_SIZE = 16

/** Tamanos que ofrece el selector; todos dentro del maximo de Auction (100). */
export const AUCTION_PAGE_SIZE_OPTIONS = [16, 32, 48] as const

/** Limite por defecto de `GET /v1/auctions/suggestions` (tambien el maximo de Auction es 20). */
export const AUCTION_SUGGESTIONS_LIMIT = 8

/** Minimo de caracteres que exige Auction antes de pedir sugerencias. */
export const AUCTION_SUGGESTIONS_MIN_QUERY_LENGTH = 3

export type AuctionPublisherType = 'PLAYER' | 'GAME_MASTER'
export type AuctionPriceKind = 'CREDITS' | 'REAL_MONEY'
/** Ordenes de `GET /v1/auctions`; priceAsc/priceDesc exigen `priceKind=CREDITS`. */
export type ActiveAuctionSort = 'closingSoon' | 'newest' | 'priceAsc' | 'priceDesc' | 'mostBids'

/** Criterios del marketplace; un campo ausente significa "sin filtro". */
export interface ActiveAuctionQuery {
  readonly page: number
  readonly pageSize: number
  readonly search?: string
  readonly publisherType?: AuctionPublisherType
  readonly priceKind?: AuctionPriceKind
  readonly hasBuyNow?: boolean
  readonly sort?: ActiveAuctionSort
}

/** Una coincidencia de `GET /v1/auctions/suggestions`. */
export interface AuctionSuggestion {
  readonly productId: string
  readonly name: string
  readonly type: string
}

export interface AuctionSuggestionsResponse {
  readonly items: readonly AuctionSuggestion[]
}

/** Criterios de `GET /v1/auctions/suggestions`; no admite `sort`, `page` ni `pageSize`. */
export interface AuctionSuggestionsQuery {
  readonly q: string
  readonly limit?: number
  readonly publisherType?: AuctionPublisherType
  readonly priceKind?: AuctionPriceKind
  readonly hasBuyNow?: boolean
}

interface AuctionErrorBody {
  readonly code?: unknown
}

/** Codigos estables de Auction con texto propio (`auction:errors.<CODIGO>`). */
const KNOWN_ERROR_CODES = new Set([
  'PRODUCT_NOT_OWNED',
  'PRODUCT_IN_USE',
  'PRODUCT_NOT_TRADABLE',
  'SELLER_SANCTIONED',
  'ACTIVE_AUCTION_LIMIT_REACHED',
  'INVALID_BUY_NOW_PRICE',
  'INVALID_CREDITS',
  'INSUFFICIENT_FUNDS',
  'DEPENDENCY_UNAVAILABLE',
  'PRODUCT_NOT_ELIGIBLE',
])

export const describeAuctionError = (error: unknown): string => {
  if (!(error instanceof HttpError)) {
    return error instanceof Error
      ? describeFailure(error, i18n.t, currentLanguage())
      : i18n.t('auction:errors.publishFailed')
  }
  const body = error.body as AuctionErrorBody | null
  const code = typeof body?.code === 'string' ? body.code : ''
  return KNOWN_ERROR_CODES.has(code)
    ? i18n.t(`auction:errors.${code}`)
    : describeFailure(error, i18n.t, currentLanguage())
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
  if (error instanceof HttpError && error.status === 409) return i18n.t('auction:follow.already')
  if (error instanceof HttpError && (error.status === 404 || error.status === 422))
    return i18n.t('auction:follow.unavailable')
  return i18n.t('auction:follow.failed')
}

export const publishOfficialAuction = (
  input: PublishOfficialAuctionInput,
  operationId: string,
): Promise<OfficialAuctionPublication> =>
  httpClient.post<OfficialAuctionPublication>('/v1/official-auctions', input, {
    'Idempotency-Key': operationId,
  })

/**
 * `GET /v1/auctions`. Siempre envia `page` y `pageSize`, y el resto solo si
 * esta definido, en orden fijo: sin filtros la URL sigue siendo exactamente
 * `?page=N&pageSize=M`. El filtrado y el orden los resuelve Auction.
 */
export const listActiveAuctions = (
  query: ActiveAuctionQuery,
  signal?: AbortSignal,
): Promise<ActiveAuctionPage> => {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  })

  if (query.publisherType !== undefined) {
    params.set('publisherType', query.publisherType)
  }
  if (query.search !== undefined && query.search !== '') {
    params.set('search', query.search)
  }
  if (query.priceKind !== undefined) {
    params.set('priceKind', query.priceKind)
  }
  if (query.hasBuyNow !== undefined) {
    params.set('hasBuyNow', String(query.hasBuyNow))
  }
  if (query.sort !== undefined) {
    params.set('sort', query.sort)
  }

  return httpClient.get<ActiveAuctionPage>(`/v1/auctions?${params.toString()}`, signal)
}

/**
 * `GET /v1/auctions/suggestions`. Siempre envia `q`, y el resto -incluido
 * `limit`- solo si esta definido. Nunca envia `sort`, `page` ni `pageSize`:
 * Auction no los admite en este endpoint.
 */
export const listAuctionSuggestions = (
  query: AuctionSuggestionsQuery,
  signal?: AbortSignal,
): Promise<AuctionSuggestionsResponse> => {
  const params = new URLSearchParams({ q: query.q })

  if (query.limit !== undefined) {
    params.set('limit', String(query.limit))
  }
  if (query.publisherType !== undefined) {
    params.set('publisherType', query.publisherType)
  }
  if (query.priceKind !== undefined) {
    params.set('priceKind', query.priceKind)
  }
  if (query.hasBuyNow !== undefined) {
    params.set('hasBuyNow', String(query.hasBuyNow))
  }

  return httpClient.get<AuctionSuggestionsResponse>(
    `/v1/auctions/suggestions?${params.toString()}`,
    signal,
  )
}
