import { httpClient } from '@/lib/http'

export interface ConfigureAutoBidInput {
  readonly maxAmountCredits: number
}

export interface AutoBidConfig {
  readonly auctionId: string
  readonly bidderId: string
  readonly maxAmountCredits: number
  readonly configuredAt: string
  readonly isActive: boolean
}

/** `POST /api/v1/auctions/:auctionId/auto-bid` (HU-67.5). */
export const configureAutoBid = (
  auctionId: string,
  input: ConfigureAutoBidInput,
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<AutoBidConfig> =>
  httpClient.request<AutoBidConfig>(`/v1/auctions/${encodeURIComponent(auctionId)}/auto-bid`, {
    method: 'POST',
    body: input,
    headers: { 'Idempotency-Key': idempotencyKey },
    ...(signal === undefined ? {} : { signal }),
  })
