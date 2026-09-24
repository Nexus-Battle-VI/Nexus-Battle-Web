export interface AuctionSummary {
  readonly id: string
  readonly sellerId: string
  readonly productId: string
  readonly minimumBidCredits: number
  readonly buyNowCredits: number | null
  readonly status: string
  readonly closesAt: string
}

export interface WatchlistItem {
  readonly auctionId: string
  readonly followedAt: string
  readonly auction: AuctionSummary
}

export interface WatchlistResponse {
  readonly items: readonly WatchlistItem[]
}
