/**
 * Contrato `hu-91.v1` §4.6 de Auction: `GET /api/v1/admin/auction-metrics/summary`.
 *
 * Los tipos reflejan el contrato tal cual: ninguna cifra se deriva ni se inventa en
 * Web. Los importes en creditos llegan como numero (<= 2 decimales) y el dinero real
 * como entero en la unidad minima de SU moneda; nunca se mezclan.
 */

export type TrendGranularity = 'DAY' | 'WEEK' | 'MONTH'

export interface MetricsPeriod {
  readonly from: string
  readonly to: string
  readonly timezone: 'UTC'
  readonly bounds: '[from,to)'
}

/** Indisponible explicito del contrato: nunca se pinta como cero. */
export interface UnavailableMetric {
  readonly availability: 'UNAVAILABLE'
  readonly reason: string
}

export interface CreditsAmount {
  readonly unit: 'CREDITS'
  readonly amount: number
}

export interface RealMoneyAmount {
  readonly unit: 'REAL_MONEY'
  readonly currency: string
  readonly amountMinor: number
}

interface Envelope {
  readonly definitionsVersion: string
  readonly period: MetricsPeriod
  readonly asOf: string
}

/** §4.1 */
export interface VolumeAndSuccess extends Envelope {
  readonly playerAuctions: {
    readonly published: number
    readonly closed: {
      readonly total: number
      readonly withWinner: number
      readonly soldByBuyNow: number
      readonly withoutBids: number
      readonly settlementFailedTerminal: number
    }
    readonly cancelled: number
    readonly active: number
    readonly awaitingClosure: number
    readonly successRate: {
      readonly numerator: number
      readonly denominator: number
      readonly value: number | null
    }
    readonly claims: {
      readonly createdInPeriod: number
      readonly pending: number
      readonly claimed: number
      readonly expired: number
    }
  }
  readonly officialAuctions: {
    readonly published: number
    readonly byMark: { readonly OFFICIAL: number; readonly PREMIUM: number }
    readonly successRate: UnavailableMetric
  }
}

export type CloseReason = 'EXPIRED_WITH_WINNER' | 'EXPIRED_WITHOUT_BIDS' | 'BUY_NOW'

export interface TrendBucket {
  readonly bucketStart: string
  readonly bucketEnd: string
  readonly playerAuctions: {
    readonly published: number
    readonly closedWithWinner: number
    readonly soldByBuyNow: number
    readonly closedWithoutBids: number
    readonly cancelled: number
    readonly successRate: number | null
    readonly averageClosingTimeSeconds: number | null
  }
  readonly officialAuctions: { readonly published: number }
}

/** §4.5 */
export interface ClosingTimeAndTrends extends Envelope {
  readonly granularity: TrendGranularity
  readonly closingTime: {
    readonly sampleSize: number
    readonly average: number | null
    readonly median: number | null
    readonly p90: number | null
    readonly byCloseReason: Readonly<
      Record<CloseReason, { readonly sampleSize: number; readonly average: number | null }>
    >
    readonly settlementLagSeconds: {
      readonly sampleSize: number
      readonly average: number | null
      readonly p90: number | null
    }
    readonly officialAuctions: UnavailableMetric
  }
  readonly trends: { readonly buckets: readonly TrendBucket[] }
}

export type EnrichmentStatus = 'COMPLETE' | 'PARTIAL' | 'UNAVAILABLE'

export interface RankedProductInfo {
  readonly name: string
  readonly sku: string
  readonly type: string
  readonly imageUrl: string
}

export interface MostAuctionedItem {
  readonly rank: number
  readonly productId: string
  readonly product: RankedProductInfo | null
  readonly auctions: {
    readonly total: number
    readonly playerCredits: number
    readonly officialRealMoney: number
  }
}

export interface MostSoldItem {
  readonly rank: number
  readonly productId: string
  readonly product: RankedProductInfo | null
  readonly sales: {
    readonly total: number
    readonly byAuctionClose: number
    readonly byBuyNow: number
  }
}

/** §4.2 */
export interface ProductRankings extends Envelope {
  readonly limit: number
  readonly enrichment: { readonly status: EnrichmentStatus }
  readonly mostAuctioned: readonly MostAuctionedItem[]
  readonly mostSold: readonly MostSoldItem[]
}

export interface CurrencyPrices {
  readonly currency: string
  readonly publishedCount: number
  readonly listedMinimumBid: {
    readonly average: RealMoneyAmount
    readonly min: RealMoneyAmount
    readonly max: RealMoneyAmount
  }
  readonly listedBuyNow: {
    readonly count: number
    readonly average: RealMoneyAmount | null
  }
}

/** §4.3 */
export interface AveragePrices extends Envelope {
  readonly credits: {
    readonly salesCount: number
    readonly average: CreditsAmount | null
    readonly median: CreditsAmount | null
    readonly min: CreditsAmount | null
    readonly max: CreditsAmount | null
    readonly byChannel: {
      readonly AUCTION_CLOSE: {
        readonly salesCount: number
        readonly average: CreditsAmount | null
      }
      readonly BUY_NOW: {
        readonly salesCount: number
        readonly average: CreditsAmount | null
      }
    }
    readonly listedMinimumBid: {
      readonly auctionsCount: number
      readonly average: CreditsAmount | null
    }
  }
  readonly realMoney: {
    readonly finalSalePrice: UnavailableMetric
    readonly byCurrency: readonly CurrencyPrices[]
  }
}

export interface ActiveUser {
  readonly rank: number
  /** `sub` opaco: la pantalla jamas lo cruza con nombre ni correo (decision D-2). */
  readonly playerId: string
  readonly activeAuctions: number
  readonly asSeller: number
  readonly asBidder: number
  readonly asBuyer: number
}

export interface DurationCommission {
  readonly durationHours: number
  readonly auctions: number
  readonly feePerAuction: number
  readonly gross: CreditsAmount
}

/** §4.4 */
export interface UsersAndCommissions extends Envelope {
  readonly limit: number
  readonly activeUsers: {
    readonly totalActiveUsers: number
    readonly byRole: {
      readonly sellers: number
      readonly bidders: number
      readonly buyers: number
    }
    readonly top: readonly ActiveUser[]
  }
  readonly commissions: {
    readonly gross: CreditsAmount
    readonly refunded: CreditsAmount
    readonly net: CreditsAmount
    readonly pendingRefunds: { readonly count: number; readonly amount: CreditsAmount }
    readonly byDuration: readonly DurationCommission[]
    readonly salesCommission: UnavailableMetric
    readonly realMoneyCommission: UnavailableMetric
    readonly walletReconciliation: UnavailableMetric
  }
}

export type SummarySection<T> =
  | { readonly status: 'AVAILABLE'; readonly data: T }
  | { readonly status: 'DEGRADED'; readonly reason: string }

export type SummarySectionName =
  | 'volumeAndSuccess'
  | 'closingTimeAndTrends'
  | 'productRankings'
  | 'averagePrices'
  | 'usersAndCommissions'

/** §4.6 */
export interface AuctionMetricsSummary {
  readonly definitionsVersion: string
  readonly period: MetricsPeriod
  readonly asOf: string
  readonly limit: number
  readonly granularity: TrendGranularity
  readonly sections: {
    readonly volumeAndSuccess: SummarySection<VolumeAndSuccess>
    readonly closingTimeAndTrends: SummarySection<ClosingTimeAndTrends>
    readonly productRankings: SummarySection<ProductRankings>
    readonly averagePrices: SummarySection<AveragePrices>
    readonly usersAndCommissions: SummarySection<UsersAndCommissions>
  }
}

export interface AuctionMetricsParams {
  /** ISO-8601 con zona. */
  readonly from: string
  readonly to: string
  readonly granularity: TrendGranularity
  readonly limit?: number
}
