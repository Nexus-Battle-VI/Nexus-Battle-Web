import type {
  AuctionMetricsSummary,
  ClosingTimeAndTrends,
  TrendBucket,
  TrendGranularity,
} from '../types'

/**
 * Datos de ejemplo con la FORMA EXACTA del contrato `hu-91.v1` §4.6.
 *
 * Solo los consumen la vista previa de desarrollo y las pruebas: la pantalla real jamas
 * importa este archivo, y ninguna cifra de aqui llega a produccion. Las cifras son las del
 * diseño aprobado (HU-91.6) para poder compararlas lado a lado.
 */

export const SAMPLE_PERIOD = {
  from: '2026-09-07T00:00:00.000Z',
  to: '2026-10-05T00:00:00.000Z',
  timezone: 'UTC',
  bounds: '[from,to)',
} as const

export const SAMPLE_AS_OF = '2026-10-06T15:20:11.000Z'

const envelope = {
  definitionsVersion: 'hu-91.v1',
  period: SAMPLE_PERIOD,
  asOf: SAMPLE_AS_OF,
} as const

const week = (
  start: string,
  end: string,
  published: number,
  won: number,
  buyNow: number,
  withoutBids: number,
  cancelled: number,
  successRate: number,
  averageClosingTimeSeconds: number,
): TrendBucket => ({
  bucketStart: `${start}T00:00:00.000Z`,
  bucketEnd: `${end}T00:00:00.000Z`,
  playerAuctions: {
    published,
    closedWithWinner: won,
    soldByBuyNow: buyNow,
    closedWithoutBids: withoutBids,
    cancelled,
    successRate,
    averageClosingTimeSeconds,
  },
  officialAuctions: { published: 3 },
})

export const WEEKLY_BUCKETS: readonly TrendBucket[] = [
  week('2026-09-07', '2026-09-14', 28, 12, 2, 9, 3, 14 / 23, 118000),
  week('2026-09-14', '2026-09-21', 32, 15, 2, 9, 3, 17 / 26, 121000),
  week('2026-09-21', '2026-09-28', 30, 14, 2, 10, 3, 16 / 26, 117500),
  week('2026-09-28', '2026-10-05', 30, 14, 2, 9, 3, 16 / 25, 124000),
]

/** Serie diaria (14 dias) y mensual, para ejercitar los otros dos agrupados. */
const dailyBuckets = (): readonly TrendBucket[] =>
  Array.from({ length: 14 }, (_, index) => {
    const start = new Date(Date.UTC(2026, 8, 21 + index))
    const end = new Date(Date.UTC(2026, 8, 22 + index))

    return week(
      start.toISOString().slice(0, 10),
      end.toISOString().slice(0, 10),
      4 + (index % 5),
      2 + (index % 3),
      index % 2,
      1 + (index % 4),
      index % 3 === 0 ? 1 : 0,
      0.5 + (index % 4) / 10,
      100_000 + index * 1_000,
    )
  })

const MONTHLY_BUCKETS: readonly TrendBucket[] = [
  week('2026-09-01', '2026-10-01', 110, 52, 8, 35, 11, 0.63, 118000),
  week('2026-10-01', '2026-11-01', 10, 3, 0, 2, 1, 0.6, 121000),
]

export const bucketsFor = (granularity: TrendGranularity): readonly TrendBucket[] => {
  if (granularity === 'DAY') return dailyBuckets()
  if (granularity === 'MONTH') return MONTHLY_BUCKETS

  return WEEKLY_BUCKETS
}

const product = (name: string, sku: string, type: string) => ({
  name,
  sku,
  type,
  imageUrl: `https://catalog.example/${sku}.png`,
})

const closingTrends = (granularity: TrendGranularity): ClosingTimeAndTrends => ({
  ...envelope,
  granularity,
  closingTime: {
    sampleSize: 100,
    average: 118240,
    median: 172800,
    p90: 172800,
    byCloseReason: {
      EXPIRED_WITH_WINNER: { sampleSize: 55, average: 172950 },
      EXPIRED_WITHOUT_BIDS: { sampleSize: 37, average: 172910 },
      BUY_NOW: { sampleSize: 8, average: 9420 },
    },
    settlementLagSeconds: { sampleSize: 92, average: 41, p90: 118 },
    officialAuctions: {
      availability: 'UNAVAILABLE',
      reason: 'OFFICIAL_AUCTION_HAS_NO_CLOSING_FLOW',
    },
  },
  trends: { buckets: bucketsFor(granularity) },
})

export const sampleSummary = (granularity: TrendGranularity = 'WEEK'): AuctionMetricsSummary => ({
  ...envelope,
  limit: 10,
  granularity,
  sections: {
    volumeAndSuccess: {
      status: 'AVAILABLE',
      data: {
        ...envelope,
        playerAuctions: {
          published: 120,
          closed: {
            total: 100,
            withWinner: 55,
            soldByBuyNow: 8,
            withoutBids: 37,
            settlementFailedTerminal: 1,
          },
          cancelled: 12,
          active: 8,
          awaitingClosure: 2,
          successRate: { numerator: 63, denominator: 100, value: 0.63 },
          claims: { createdInPeriod: 63, pending: 5, claimed: 52, expired: 6 },
        },
        officialAuctions: {
          published: 14,
          byMark: { OFFICIAL: 9, PREMIUM: 5 },
          successRate: {
            availability: 'UNAVAILABLE',
            reason: 'OFFICIAL_AUCTION_HAS_NO_CLOSING_FLOW',
          },
        },
      },
    },
    closingTimeAndTrends: { status: 'AVAILABLE', data: closingTrends(granularity) },
    productRankings: {
      status: 'AVAILABLE',
      data: {
        ...envelope,
        limit: 10,
        enrichment: { status: 'COMPLETE' },
        mostAuctioned: [
          {
            rank: 1,
            productId: 'p-1',
            product: product('Espada de hierro', 'espada-de-hierro', 'ARMA'),
            auctions: { total: 14, playerCredits: 11, officialRealMoney: 3 },
          },
          {
            rank: 2,
            productId: 'p-2',
            product: product('Escudo de roble', 'escudo-de-roble', 'ARMADURA'),
            auctions: { total: 12, playerCredits: 12, officialRealMoney: 0 },
          },
          {
            rank: 3,
            productId: 'p-3',
            product: product('Poción de vida', 'pocion-de-vida', 'CONSUMIBLE'),
            auctions: { total: 10, playerCredits: 7, officialRealMoney: 3 },
          },
          {
            rank: 4,
            productId: 'p-4',
            product: product('Casco rúnico', 'casco-runico', 'ARMADURA'),
            auctions: { total: 9, playerCredits: 9, officialRealMoney: 0 },
          },
          {
            rank: 5,
            productId: 'p-5',
            product: product('Arco del alba', 'arco-del-alba', 'ARMA'),
            auctions: { total: 8, playerCredits: 5, officialRealMoney: 3 },
          },
        ],
        mostSold: [
          {
            rank: 1,
            productId: 'p-1',
            product: product('Espada de hierro', 'espada-de-hierro', 'ARMA'),
            sales: { total: 9, byAuctionClose: 7, byBuyNow: 2 },
          },
          {
            rank: 2,
            productId: 'p-3',
            product: product('Poción de vida', 'pocion-de-vida', 'CONSUMIBLE'),
            sales: { total: 7, byAuctionClose: 6, byBuyNow: 1 },
          },
          {
            rank: 3,
            productId: 'p-2',
            product: product('Escudo de roble', 'escudo-de-roble', 'ARMADURA'),
            sales: { total: 6, byAuctionClose: 5, byBuyNow: 1 },
          },
          {
            rank: 4,
            productId: 'p-4',
            product: product('Casco rúnico', 'casco-runico', 'ARMADURA'),
            sales: { total: 5, byAuctionClose: 5, byBuyNow: 0 },
          },
          {
            rank: 5,
            productId: 'p-5',
            product: product('Arco del alba', 'arco-del-alba', 'ARMA'),
            sales: { total: 4, byAuctionClose: 3, byBuyNow: 1 },
          },
        ],
      },
    },
    averagePrices: {
      status: 'AVAILABLE',
      data: {
        ...envelope,
        credits: {
          salesCount: 63,
          average: { unit: 'CREDITS', amount: 142.38 },
          median: { unit: 'CREDITS', amount: 120 },
          min: { unit: 'CREDITS', amount: 5 },
          max: { unit: 'CREDITS', amount: 900 },
          byChannel: {
            AUCTION_CLOSE: { salesCount: 55, average: { unit: 'CREDITS', amount: 138.1 } },
            BUY_NOW: { salesCount: 8, average: { unit: 'CREDITS', amount: 171.75 } },
          },
          listedMinimumBid: { auctionsCount: 120, average: { unit: 'CREDITS', amount: 41.2 } },
        },
        realMoney: {
          finalSalePrice: {
            availability: 'UNAVAILABLE',
            reason: 'OFFICIAL_AUCTION_HAS_NO_SALE_FLOW',
          },
          byCurrency: [
            {
              currency: 'COP',
              publishedCount: 9,
              listedMinimumBid: {
                average: { unit: 'REAL_MONEY', currency: 'COP', amountMinor: 4500000 },
                min: { unit: 'REAL_MONEY', currency: 'COP', amountMinor: 1000000 },
                max: { unit: 'REAL_MONEY', currency: 'COP', amountMinor: 9000000 },
              },
              listedBuyNow: {
                count: 3,
                average: { unit: 'REAL_MONEY', currency: 'COP', amountMinor: 12000000 },
              },
            },
            {
              currency: 'USD',
              publishedCount: 5,
              listedMinimumBid: {
                average: { unit: 'REAL_MONEY', currency: 'USD', amountMinor: 2500 },
                min: { unit: 'REAL_MONEY', currency: 'USD', amountMinor: 990 },
                max: { unit: 'REAL_MONEY', currency: 'USD', amountMinor: 6000 },
              },
              listedBuyNow: { count: 0, average: null },
            },
          ],
        },
      },
    },
    usersAndCommissions: {
      status: 'AVAILABLE',
      data: {
        ...envelope,
        limit: 10,
        activeUsers: {
          totalActiveUsers: 87,
          byRole: { sellers: 31, bidders: 70, buyers: 12 },
          top: [
            {
              rank: 1,
              playerId: 'us-east-1:2f1c9a…b7e4',
              activeAuctions: 18,
              asSeller: 6,
              asBidder: 11,
              asBuyer: 1,
            },
            {
              rank: 2,
              playerId: 'us-east-1:91ab03…44d0',
              activeAuctions: 15,
              asSeller: 2,
              asBidder: 12,
              asBuyer: 1,
            },
            {
              rank: 3,
              playerId: 'us-east-1:c0de77…19aa',
              activeAuctions: 13,
              asSeller: 9,
              asBidder: 4,
              asBuyer: 0,
            },
            {
              rank: 4,
              playerId: 'us-east-1:5e2210…a3f9',
              activeAuctions: 11,
              asSeller: 0,
              asBidder: 11,
              asBuyer: 0,
            },
            {
              rank: 5,
              playerId: 'us-east-1:7b44d1…e082',
              activeAuctions: 9,
              asSeller: 3,
              asBidder: 5,
              asBuyer: 1,
            },
          ],
        },
        commissions: {
          gross: { unit: 'CREDITS', amount: 210 },
          refunded: { unit: 'CREDITS', amount: 9 },
          net: { unit: 'CREDITS', amount: 201 },
          pendingRefunds: { count: 1, amount: { unit: 'CREDITS', amount: 1.5 } },
          byDuration: [
            {
              durationHours: 24,
              auctions: 80,
              feePerAuction: 1,
              gross: { unit: 'CREDITS', amount: 80 },
            },
            {
              durationHours: 48,
              auctions: 40,
              feePerAuction: 3,
              gross: { unit: 'CREDITS', amount: 120 },
            },
          ],
          salesCommission: { availability: 'UNAVAILABLE', reason: 'NO_SALE_COMMISSION_DEFINED' },
          realMoneyCommission: {
            availability: 'UNAVAILABLE',
            reason: 'OFFICIAL_AUCTION_HAS_NO_FEES',
          },
          walletReconciliation: {
            availability: 'UNAVAILABLE',
            reason: 'WALLET_READ_ENDPOINT_NOT_AVAILABLE',
          },
        },
      },
    },
  },
})

/** Periodo sin una sola subasta: todo en cero, tasas y promedios `null`. */
export const emptySummary = (): AuctionMetricsSummary => {
  const base = sampleSummary()
  const { volumeAndSuccess } = base.sections

  if (volumeAndSuccess.status !== 'AVAILABLE') {
    throw new Error('El resumen de ejemplo siempre trae volumen.')
  }

  return {
    ...base,
    sections: {
      ...base.sections,
      volumeAndSuccess: {
        status: 'AVAILABLE',
        data: {
          ...volumeAndSuccess.data,
          playerAuctions: {
            published: 0,
            closed: {
              total: 0,
              withWinner: 0,
              soldByBuyNow: 0,
              withoutBids: 0,
              settlementFailedTerminal: 0,
            },
            cancelled: 0,
            active: 0,
            awaitingClosure: 0,
            successRate: { numerator: 0, denominator: 0, value: null },
            claims: { createdInPeriod: 0, pending: 0, claimed: 0, expired: 0 },
          },
          officialAuctions: {
            ...volumeAndSuccess.data.officialAuctions,
            published: 0,
            byMark: { OFFICIAL: 0, PREMIUM: 0 },
          },
        },
      },
    },
  }
}
