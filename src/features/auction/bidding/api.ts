import { httpClient } from '@/lib/http'

export interface RegisterBidInput {
  readonly amountCredits: number
}

export interface RegisteredBid {
  readonly id: string
  readonly auctionId: string
  readonly bidderId: string
  readonly amountCredits: number
  readonly placedAt: string
}

/** `POST /api/v1/auctions/:auctionId/bids` (HU-63.4). */
export const registerBid = (
  auctionId: string,
  input: RegisterBidInput,
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<RegisteredBid> =>
  httpClient.request<RegisteredBid>(`/v1/auctions/${encodeURIComponent(auctionId)}/bids`, {
    method: 'POST',
    body: input,
    headers: { 'Idempotency-Key': idempotencyKey },
    ...(signal === undefined ? {} : { signal }),
  })

