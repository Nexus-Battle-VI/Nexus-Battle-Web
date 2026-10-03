import { HttpError, httpClient } from '@/lib/http'
import { i18n } from '@/shared/i18n/i18n'
import { currentLanguage } from '@/shared/i18n/language'
import { describeFailure } from '@/shared/i18n/errors'

/**
 * Detalle de una subasta y de su puja lider actual.
 *
 * Nombre de archivo deliberadamente distinto de `api.ts`: HU-62 ya reservo ese
 * nombre en su propia rama (`feat/hu-62-5-publicacion-web`, PR #116, aun sin
 * fusionar) para las llamadas de PUBLICAR una subasta -el flujo del
 * vendedor-. Esto es el flujo del comprador; conviven en la misma carpeta de
 * feature sin que fusionar esa rama despues choque con este archivo.
 */
export interface AuctionDetailBid {
  readonly id: string
  readonly auctionId: string
  readonly bidderId: string
  readonly amountCredits: number
  readonly placedAt: string
}

interface AuctionDetailBase {
  readonly id: string
  readonly sellerId: string
  /** HU-88: perfil publico del vendedor (Account); `null` si no se pudo resolver. */
  readonly sellerDisplayName: string | null
  readonly sellerAvatarUrl: string | null
  readonly productId: string
  readonly durationHours: 24 | 48
  readonly publicationFeeCredits: number
  readonly status: string
  readonly publishedAt: string
  readonly closesAt: string
  /** `null` si nadie ha pujado todavia. */
  readonly currentBid: AuctionDetailBid | null
  /** Total de pujas persistidas; no se deriva de `currentBid`. */
  readonly bidCount: number
}

/** Mismo vocabulario que `ActiveAuction` de `./api.ts` (listado): no se inventan nombres nuevos. */
export interface PlayerAuctionDetail extends AuctionDetailBase {
  readonly publisherType: 'PLAYER'
  readonly priceKind: 'CREDITS'
  readonly minimumBidCredits: number
  readonly buyNowCredits: number | null
  readonly currency: null
  readonly minimumBidAmountMinor: null
  readonly buyNowAmountMinor: null
  readonly officialMark: null
}

export interface OfficialAuctionDetail extends AuctionDetailBase {
  readonly publisherType: 'GAME_MASTER'
  readonly priceKind: 'REAL_MONEY'
  readonly minimumBidCredits: null
  readonly buyNowCredits: null
  readonly currency: string
  readonly minimumBidAmountMinor: number
  readonly buyNowAmountMinor: number | null
  readonly officialMark: 'OFFICIAL' | 'PREMIUM'
}

export type AuctionDetail = PlayerAuctionDetail | OfficialAuctionDetail

/** `GET /api/v1/auctions/:auctionId` (HU-63.6, extendido por HU-88). */
export const fetchAuctionDetail = (
  auctionId: string,
  signal?: AbortSignal,
): Promise<AuctionDetail> =>
  httpClient.get<AuctionDetail>(`/v1/auctions/${encodeURIComponent(auctionId)}`, signal)

/** Item publico del historial de pujas (HU-88): nunca trae identidad del postor. */
export interface AuctionBidHistoryItem {
  readonly id: string
  readonly amountCredits: number
  readonly placedAt: string
}

export interface AuctionBidHistoryPage {
  readonly items: readonly AuctionBidHistoryItem[]
  readonly total: number
  readonly page: number
  readonly pageSize: number
}

/** Mismo default que Auction (`GET /v1/auctions/:auctionId/bids`). */
export const AUCTION_BID_HISTORY_PAGE_SIZE = 20

/**
 * `GET /v1/auctions/:auctionId/bids` (HU-88). Solo envia `page`/`pageSize`:
 * Auction no admite ningun otro parametro en este endpoint.
 */
export const fetchAuctionBidHistory = (
  auctionId: string,
  page: number,
  pageSize: number = AUCTION_BID_HISTORY_PAGE_SIZE,
  signal?: AbortSignal,
): Promise<AuctionBidHistoryPage> => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })

  return httpClient.get<AuctionBidHistoryPage>(
    `/v1/auctions/${encodeURIComponent(auctionId)}/bids?${params.toString()}`,
    signal,
  )
}

export interface BuyerCreditsSnapshot {
  readonly balance: number
  /** HU-23: saldo menos apuestas activas. Cuando falta, se usa `balance`. */
  readonly available?: number
}

/**
 * `GET /v1/wallet/me` (HU-22). Comparte el mismo endpoint y la misma clave de
 * consulta (`queryKeys.wallet.me`) que `features/battle-rooms/battle/useWallet`,
 * pero se llama aqui de forma local -sin importar ese modulo- porque `useWallet`
 * vive dentro de `battle-rooms/battle`, no en un punto de entrada de esa
 * feature pensado para reutilizarse (a diferencia de `features/catalog/api`).
 * Solo se necesita el saldo disponible para CA-02, no el progreso de cofre.
 */
export const fetchBuyerCredits = (signal?: AbortSignal): Promise<BuyerCreditsSnapshot> =>
  httpClient.get<BuyerCreditsSnapshot>('/v1/wallet/me', signal)

/** Confirmacion de una compra inmediata ya ejecutada (HU-64.4/HU-64.6). */
export interface BuyNowConfirmation {
  readonly transactionId: string
  readonly auctionId: string
  readonly buyerId: string
  readonly sellerId: string
  readonly productId: string
  readonly debitedCredits: number
  readonly remainingCredits: number
  readonly closedAt: string
  /** `true` si esta respuesta viene de un reintento idempotente, no de una compra nueva. */
  readonly replayed: boolean
}

/**
 * Codigos de rechazo que el backend documenta para `POST .../buy-now`
 * (`src/adapters/inbound/http/buy-now-error.mapper.ts` en Auction). Se listan
 * aqui, en el lado que los consume, para traducirlos a un mensaje sin
 * duplicar la regla de negocio que los produce.
 */
export type BuyNowErrorCode =
  | 'AUCTION_NOT_FOUND'
  | 'BUY_NOW_CONFLICT'
  | 'AUCTION_NOT_ACTIVE'
  | 'SELLER_CANNOT_BUY_OWN_AUCTION'
  | 'BUY_NOW_PRICE_UNAVAILABLE'
  | 'CONFIRMATION_REQUIRED'
  | 'INSUFFICIENT_CREDITS'
  | 'DEPENDENCY_UNAVAILABLE'

export interface InsufficientCreditsDetails {
  readonly requiredCredits: number
  readonly availableCredits: number
  readonly missingCredits: number
}

export interface BuyNowErrorBody {
  readonly statusCode: number
  readonly code?: BuyNowErrorCode
  readonly message?: string
  readonly details?: InsufficientCreditsDetails
}

/**
 * `POST /v1/auctions/:auctionId/buy-now` (HU-64.4). `idempotencyKey` viaja
 * SIEMPRE -el backend la exige (CA-04 de HU-63/64 de idempotencia)- y debe
 * repetirse sin cambiar en cada reintento de un mismo intento de compra, para
 * que el backend devuelva la misma confirmacion en vez de cobrar dos veces.
 */
export const executeBuyNow = (
  auctionId: string,
  idempotencyKey: string,
): Promise<BuyNowConfirmation> =>
  httpClient.post<BuyNowConfirmation>(
    `/v1/auctions/${encodeURIComponent(auctionId)}/buy-now`,
    { confirmed: true },
    { 'Idempotency-Key': idempotencyKey },
  )

/**
 * Un rechazo de negocio (saldo insuficiente, subasta ya cerrada, etc.) es
 * definitivo: reintentarlo no cambia el resultado. Solo un error que NO sea
 * `HttpError` -red caida, timeout- amerita el reintento automatico de
 * HU-64.6.
 */
export const isRetryableBuyNowError = (error: unknown): boolean => !(error instanceof HttpError)

const buyNowErrorCode = (error: HttpError): BuyNowErrorCode | undefined => {
  const body = error.body

  return typeof body === 'object' && body !== null && 'code' in body
    ? (body as BuyNowErrorBody).code
    : undefined
}

/** Sigue el mismo criterio que `describeAdjustmentFailure` (admin/products/api.ts). */
export const describeBuyNowFailure = (error: unknown): string => {
  if (!(error instanceof HttpError)) {
    return i18n.t('auction:buyNow.network')
  }

  switch (buyNowErrorCode(error)) {
    case 'AUCTION_NOT_FOUND':
      return i18n.t('auction:buyNow.AUCTION_NOT_FOUND')
    case 'BUY_NOW_CONFLICT':
    case 'AUCTION_NOT_ACTIVE':
      return i18n.t('auction:buyNow.conflict')
    case 'SELLER_CANNOT_BUY_OWN_AUCTION':
      return i18n.t('auction:buyNow.SELLER_CANNOT_BUY_OWN_AUCTION')
    case 'BUY_NOW_PRICE_UNAVAILABLE':
      return i18n.t('auction:buyNow.BUY_NOW_PRICE_UNAVAILABLE')
    case 'CONFIRMATION_REQUIRED':
      return i18n.t('auction:buyNow.CONFIRMATION_REQUIRED')
    case 'INSUFFICIENT_CREDITS':
      return i18n.t('auction:buyNow.INSUFFICIENT_CREDITS')
    case 'DEPENDENCY_UNAVAILABLE':
      return i18n.t('auction:buyNow.DEPENDENCY_UNAVAILABLE')
    default:
      break
  }

  if (error.isUnauthorized) {
    return i18n.t('auction:buyNow.unauthorized')
  }

  return describeFailure(error, i18n.t, currentLanguage())
}
