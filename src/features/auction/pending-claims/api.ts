import { httpClient } from '@/lib/http'

/**
 * Contrato REAL de Auction (HU-69.1 a HU-69.4), verificado contra el codigo
 * fuente del servicio en la misma sesion que esta pantalla: el issue de esta
 * Task nombraba Commerce como backend, plantilla generica desactualizada
 * igual que en varias Tasks de HU-69 del lado del servicio.
 */
export type PendingClaimStatus = 'PENDING' | 'CLAIMED'

export interface PendingClaim {
  readonly auctionId: string
  readonly productId: string
  readonly winningBidId: string
  readonly finalAmountCredits: number
  readonly settledAt: string
  readonly claimStatus: PendingClaimStatus
  /** Instante limite (inclusive) para reclamar: `settledAt` + 7 dias. */
  readonly claimDeadline: string
  /** Dias completos restantes hasta `claimDeadline`, redondeados hacia arriba. */
  readonly remainingClaimDays: number
}

/** `GET /v1/auctions/me/pending-claims` (HU-69.2). Sin pendientes: 200 con array vacio, nunca 404. */
export const fetchPendingClaims = (signal?: AbortSignal): Promise<readonly PendingClaim[]> =>
  httpClient.get<readonly PendingClaim[]>('/v1/auctions/me/pending-claims', signal)

/**
 * `POST /v1/auctions/me/pending-claims/:auctionId/claim` (HU-69.3).
 *
 * Idempotente: reclamar un producto ya CLAIMED responde 200 con el mismo
 * estado en vez de fallar. El servicio deduce al titular del testimonio.
 */
export const claimItem = (auctionId: string): Promise<PendingClaim> =>
  httpClient.post<PendingClaim>(
    `/v1/auctions/me/pending-claims/${encodeURIComponent(auctionId)}/claim`,
  )

export type ClaimBatchItemStatus =
  | 'CLAIMED'
  | 'ALREADY_CLAIMED'
  | 'NOT_OWNED'
  | 'NOT_FOUND'
  | 'EXPIRED'
  | 'INVENTORY_UNAVAILABLE'
  | 'ERROR'

export interface ClaimBatchItemResult {
  readonly auctionId: string
  readonly status: ClaimBatchItemStatus
  readonly claim: PendingClaim | null
  readonly message: string | null
}

export interface ClaimBatchResult {
  readonly results: readonly ClaimBatchItemResult[]
}

export interface ClaimBatchInput {
  readonly auctionIds?: readonly string[]
  readonly claimAll?: boolean
}

/**
 * `POST /v1/auctions/me/pending-claims/claim-batch` (HU-69.4).
 *
 * SIEMPRE responde 200 (salvo 401/403 globales): es parcialmente exitoso por
 * diseño, un item en NOT_OWNED/EXPIRED/INVENTORY_UNAVAILABLE/ERROR no
 * revierte ni oculta los que sí quedaron CLAIMED. La UI debe reflejar
 * `results[]` item por item, nunca tratar la respuesta como todo-o-nada.
 */
export const claimBatch = (input: ClaimBatchInput): Promise<ClaimBatchResult> =>
  httpClient.post<ClaimBatchResult>('/v1/auctions/me/pending-claims/claim-batch', input)
