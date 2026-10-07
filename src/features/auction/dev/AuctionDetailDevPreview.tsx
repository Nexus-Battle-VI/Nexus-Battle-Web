import { useEffect, useState } from 'react'

import { useSession } from '@/shared/session'
import { AuctionDetailPage } from '../AuctionDetailPage'
import { AuctionThemeDevToolbar } from './AuctionThemeDevToolbar'

export const AUCTION_DETAIL_PREVIEW_ID = 'auction-remaster-preview'

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const product = {
  productId: 'product-remaster-preview',
  sku: 'reliquia-corona-astral',
  name: 'Corona astral de la última soberana de Nexus',
  description: 'Reliquia mítica · Poder 95 · Lote ceremonial de procedencia verificada',
  imageUrl: '',
  type: 'RELIC',
  lifecycleStatus: 'PUBLISHED',
  creditsPrice: 6200,
  premium: true,
  realMoneyPrice: null,
  averageRating: 4.9,
  reviewCount: 184,
}

const auction = {
  id: AUCTION_DETAIL_PREVIEW_ID,
  sellerId: 'seller-preview',
  sellerDisplayName: 'Custodia de Reliquias del Reino Septentrional',
  sellerAvatarUrl: null,
  productId: product.productId,
  publisherType: 'PLAYER',
  priceKind: 'CREDITS',
  durationHours: 48,
  publicationFeeCredits: 3,
  minimumBidCredits: 250,
  buyNowCredits: 7800,
  currency: null,
  minimumBidAmountMinor: null,
  buyNowAmountMinor: null,
  officialMark: null,
  status: 'ACTIVE',
  publishedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
  closesAt: new Date(Date.now() + 27 * 60 * 60 * 1000).toISOString(),
  currentBid: {
    id: 'bid-preview-current',
    auctionId: AUCTION_DETAIL_PREVIEW_ID,
    bidderId: 'other-preview',
    amountCredits: 4650,
    placedAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
  },
  bidCount: 37,
} as const

/** Detalle productivo montado con servicios locales exclusivos de la ruta DEV. */
export const AuctionDetailDevPreview = (): React.JSX.Element => {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const previous = useSession.getState()
    useSession.setState({ subject: 'buyer-preview', accessToken: null, expiresAt: null })
    return () => {
      useSession.setState(previous)
    }
  }, [])

  useEffect(() => {
    const original = globalThis.fetch
    let following = false

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const raw =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      const url = new URL(raw, globalThis.location.origin)
      const method = init?.method ?? (input instanceof Request ? input.method : 'GET')

      if (url.pathname === `/api/v1/catalog/products/${product.productId}`) {
        return jsonResponse(product)
      }
      if (url.pathname === '/api/v1/wallet/me') {
        return jsonResponse({ balance: 12_500, available: 10_900 })
      }
      if (url.pathname === '/api/v1/auctions/watchlist') {
        if (method === 'POST') following = true
        return jsonResponse({
          items: following
            ? [{ auctionId: auction.id, followedAt: new Date().toISOString(), auction }]
            : [],
        })
      }
      if (url.pathname === `/api/v1/auctions/watchlist/${auction.id}`) {
        following = false
        return new Response(null, { status: 204 })
      }
      if (url.pathname === `/api/v1/auctions/${auction.id}/bids` && method === 'POST') {
        const body = JSON.parse((init?.body as string | undefined) ?? '{}') as {
          amountCredits?: number
        }
        return jsonResponse({
          id: 'bid-preview-new',
          auctionId: auction.id,
          bidderId: 'buyer-preview',
          amountCredits: body.amountCredits ?? 4900,
          placedAt: new Date().toISOString(),
        })
      }
      if (url.pathname === `/api/v1/auctions/${auction.id}/bids`) {
        return jsonResponse({
          items: Array.from({ length: 8 }, (_, index) => ({
            id: `bid-preview-${String(index + 1)}`,
            amountCredits: 4650 - index * 225,
            placedAt: new Date(Date.now() - (index + 1) * 17 * 60 * 1000).toISOString(),
          })),
          total: 8,
          page: 1,
          pageSize: 20,
        })
      }
      if (url.pathname === `/api/v1/auctions/${auction.id}/auto-bid`) {
        const body = JSON.parse((init?.body as string | undefined) ?? '{}') as {
          maxAmountCredits?: number
        }
        return jsonResponse({
          auctionId: auction.id,
          bidderId: 'buyer-preview',
          maxAmountCredits: body.maxAmountCredits ?? 6500,
          configuredAt: new Date().toISOString(),
          isActive: true,
        })
      }
      if (url.pathname === `/api/v1/auctions/${auction.id}/buy-now`) {
        return jsonResponse({
          transactionId: 'txn-preview',
          auctionId: auction.id,
          buyerId: 'buyer-preview',
          sellerId: auction.sellerId,
          productId: product.productId,
          debitedCredits: auction.buyNowCredits,
          remainingCredits: 4700,
          closedAt: new Date().toISOString(),
          replayed: false,
        })
      }
      if (url.pathname === `/api/v1/auctions/${auction.id}`) {
        return jsonResponse(auction)
      }
      if (url.pathname.startsWith('/api/')) {
        return jsonResponse({ message: 'Ruta no simulada en el preview de Detail.' }, 404)
      }

      return original(input, init)
    }

    const timer = globalThis.setTimeout(() => {
      setReady(true)
    }, 0)
    return () => {
      globalThis.clearTimeout(timer)
      globalThis.fetch = original
    }
  }, [])

  return (
    <main>
      <AuctionThemeDevToolbar />
      <div className="mx-auto w-[calc(100%-2rem)] max-w-[1168px] pt-4 sm:pr-64">
        <p className="text-xs text-muted">
          Preview DEV: detalle, historial y acciones operan contra fixtures locales.
        </p>
      </div>
      {ready ? <AuctionDetailPage /> : null}
    </main>
  )
}
