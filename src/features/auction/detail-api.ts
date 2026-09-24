import { HttpError, httpClient } from '@/lib/http'

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

export interface AuctionDetail {
  readonly id: string
  readonly sellerId: string
  readonly productId: string
  readonly durationHours: 24 | 48
  readonly publicationFeeCredits: number
  readonly minimumBidCredits: number
  readonly buyNowCredits: number | null
  readonly status: string
  readonly publishedAt: string
  readonly closesAt: string
  /** `null` si nadie ha pujado todavia. */
  readonly currentBid: AuctionDetailBid | null
}

/** `GET /api/v1/auctions/:auctionId` (HU-63.6). */
export const fetchAuctionDetail = (
  auctionId: string,
  signal?: AbortSignal,
): Promise<AuctionDetail> =>
  httpClient.get<AuctionDetail>(`/v1/auctions/${encodeURIComponent(auctionId)}`, signal)

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
    return 'No se pudo completar la compra por un problema de conexión. Se reintentará automáticamente.'
  }

  switch (buyNowErrorCode(error)) {
    case 'AUCTION_NOT_FOUND':
      return 'Esta subasta ya no existe.'
    case 'BUY_NOW_CONFLICT':
    case 'AUCTION_NOT_ACTIVE':
      return 'Otro comprador se adelantó: la subasta ya se cerró.'
    case 'SELLER_CANNOT_BUY_OWN_AUCTION':
      return 'No puedes ejecutar la compra inmediata de tu propia subasta.'
    case 'BUY_NOW_PRICE_UNAVAILABLE':
      return 'Esta subasta ya no tiene compra inmediata disponible.'
    case 'CONFIRMATION_REQUIRED':
      return 'Debes confirmar la compra antes de continuar.'
    case 'INSUFFICIENT_CREDITS':
      return 'No tienes créditos suficientes para esta compra.'
    case 'DEPENDENCY_UNAVAILABLE':
      return 'El servicio de créditos no está disponible en este momento. Inténtalo más tarde.'
    default:
      break
  }

  if (error.isUnauthorized) {
    return 'Tu sesión no es válida o venció. Vuelve a iniciar sesión.'
  }

  return error.message
}
