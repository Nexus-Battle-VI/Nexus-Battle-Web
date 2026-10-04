import { httpClient } from '@/lib/http'

export type AuctionActivityStatus = 'ACTIVE' | 'FINISHED' | 'SOLD' | 'CANCELLED'

export interface PersonalPageQuery {
  readonly page: number
  readonly pageSize: number
}

export interface PersonalPage<T> {
  readonly items: readonly T[]
  readonly total: number
  readonly page: number
  readonly pageSize: number
}

export interface PersonalAuction {
  readonly auctionId: string
  readonly productId: string
  readonly status: AuctionActivityStatus
  readonly minimumBidCredits: number
  readonly buyNowCredits: number | null
  readonly currentBidCredits: number | null
  readonly bidCount: number
  readonly publishedAt: string
  readonly closesAt: string
  readonly finishedAt: string | null
  readonly cancelledAt: string | null
  readonly actions: { readonly view: true; readonly cancel: boolean }
}

export type BidParticipationStatus = 'LEADING' | 'OUTBID' | 'WON' | 'LOST'

export interface PersonalBid {
  readonly auctionId: string
  readonly productId: string
  readonly auctionStatus: AuctionActivityStatus
  readonly participationStatus: BidParticipationStatus
  readonly ownLatestBidCredits: number
  readonly ownLatestBidAt: string
  readonly currentBidCredits: number | null
  readonly closesAt: string
}

export type AuctionTransactionType =
  | 'PUBLICATION_FEE'
  | 'BID_RESERVATION'
  | 'BUY_NOW_PURCHASE'
  | 'SETTLEMENT_SALE'
  | 'SETTLEMENT_WIN'
  | 'CANCELLATION_REFUND'
  | 'PRODUCT_CLAIM'

export interface PersonalAuctionTransaction {
  readonly id: string
  readonly auctionId: string
  readonly type: AuctionTransactionType
  readonly reference: string
  readonly occurredAt: string
  readonly status: string
  readonly value: { readonly amount: number; readonly unit: 'CREDITS' } | null
}

export interface AuctionViewMetric {
  readonly auctionId: string
  readonly views: number
}

export type AuctionViewStatistics =
  | {
      readonly availability: 'UNAVAILABLE'
      readonly reason: 'AUTHORITATIVE_SOURCE_NOT_CONFIGURED'
      readonly metrics: readonly []
    }
  | {
      readonly availability: 'AVAILABLE'
      readonly metrics: readonly AuctionViewMetric[]
    }

const pagePath = (
  resource: 'owned' | 'bids' | 'transactions',
  query: PersonalPageQuery,
): string => {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  })
  return `/v1/auctions/me/${resource}?${params.toString()}`
}

/** Auction resuelve la identidad desde el JWT; Web solo envía paginación. */
export const fetchMyAuctions = (
  query: PersonalPageQuery,
  signal?: AbortSignal,
): Promise<PersonalPage<PersonalAuction>> => httpClient.get(pagePath('owned', query), signal)

/** No expone ni solicita identificadores de otros pujadores. */
export const fetchMyBids = (
  query: PersonalPageQuery,
  signal?: AbortSignal,
): Promise<PersonalPage<PersonalBid>> => httpClient.get(pagePath('bids', query), signal)

/** Consume registros autoritativos; la interfaz no reconstruye movimientos. */
export const fetchMyTransactions = (
  query: PersonalPageQuery,
  signal?: AbortSignal,
): Promise<PersonalPage<PersonalAuctionTransaction>> =>
  httpClient.get(pagePath('transactions', query), signal)

/** La indisponibilidad es un resultado funcional, no un contador cero. */
export const fetchMyViewStatistics = (signal?: AbortSignal): Promise<AuctionViewStatistics> =>
  httpClient.get('/v1/auctions/me/view-statistics', signal)
