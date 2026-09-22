import { httpClient } from '@/lib/http'

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
