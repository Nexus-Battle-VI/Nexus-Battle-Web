import { useEffect, useMemo, useState } from 'react'

import type { CanonicalProduct } from '@/features/catalog/api'
import { useSession } from '@/shared/session'
import { AuctionMarketplace } from '../AuctionMarketplace'
import type { ActiveAuction } from '../api'
import { AuctionThemeDevToolbar } from './AuctionThemeDevToolbar'

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const PRODUCTS = [
  {
    productId: 'relic-dragon',
    sku: 'relic-dragon',
    name: 'Huevo de dragón carmesí de la antigua cámara imperial',
    description: 'Reliquia mítica conservada por los guardianes del norte.',
    imageUrl: '',
    type: 'RELIC',
    lifecycleStatus: 'PUBLISHED',
    creditsPrice: 4800,
    premium: true,
    realMoneyPrice: null,
    averageRating: 4.9,
    reviewCount: 128,
  },
  {
    productId: 'armor-sentinel',
    sku: 'armor-sentinel',
    name: 'Armadura del centinela real',
    description: 'Armadura ceremonial de defensa elevada.',
    imageUrl: '',
    type: 'ARMOR',
    lifecycleStatus: 'PUBLISHED',
    creditsPrice: 2100,
    premium: false,
    realMoneyPrice: null,
    averageRating: 4.6,
    reviewCount: 74,
  },
  {
    productId: 'sword-eclipse',
    sku: 'sword-eclipse',
    name: 'Espada del eclipse',
    description: 'Hoja épica templada con esencia arcana.',
    imageUrl: '',
    type: 'WEAPON',
    lifecycleStatus: 'PUBLISHED',
    creditsPrice: 3200,
    premium: true,
    realMoneyPrice: null,
    averageRating: 4.8,
    reviewCount: 96,
  },
  {
    productId: 'mana-elixir',
    sku: 'mana-elixir',
    name: 'Elixir de maná mayor',
    description: 'Consumible raro para combates prolongados.',
    imageUrl: '',
    type: 'CONSUMABLE',
    lifecycleStatus: 'PUBLISHED',
    creditsPrice: 450,
    premium: false,
    realMoneyPrice: null,
    averageRating: 4.3,
    reviewCount: 41,
  },
  {
    productId: 'arcane-chest',
    sku: 'arcane-chest',
    name: 'Cofre arcano de obsidiana',
    description: 'Lote oficial de contenido desconocido.',
    imageUrl: '',
    type: 'CHEST',
    lifecycleStatus: 'PUBLISHED',
    creditsPrice: 0,
    premium: true,
    realMoneyPrice: { amount: 149900, currency: 'COP' },
    averageRating: null,
    reviewCount: 0,
  },
] as const satisfies readonly CanonicalProduct[]

const PRODUCT_BY_ID = new Map<string, CanonicalProduct>(
  PRODUCTS.map((product) => [product.productId, product]),
)

const buildAuctions = (): readonly ActiveAuction[] => {
  const now = Date.now()

  return Array.from({ length: 22 }, (_, index): ActiveAuction => {
    const product = PRODUCTS[index % PRODUCTS.length] ?? PRODUCTS[0]
    const official = index % 6 === 5
    const publishedAt = new Date(now - (index + 1) * 60 * 60 * 1000).toISOString()
    const closesAt = new Date(now + (index + 3) * 75 * 60 * 1000).toISOString()

    if (official) {
      return {
        id: `auction-preview-${String(index + 1)}`,
        sellerId: 'game-master-preview',
        productId: 'arcane-chest',
        publisherType: 'GAME_MASTER',
        priceKind: 'REAL_MONEY',
        minimumBidCredits: null,
        buyNowCredits: null,
        currency: 'COP',
        minimumBidAmountMinor: 90_000 + index * 5_000,
        buyNowAmountMinor: index % 2 === 0 ? 180_000 : null,
        officialMark: index % 12 === 5 ? 'PREMIUM' : 'OFFICIAL',
        status: 'ACTIVE',
        publishedAt,
        closesAt,
        currentBidAmount: null,
        bidCount: index * 2,
      }
    }

    return {
      id: `auction-preview-${String(index + 1)}`,
      sellerId: `seller-preview-${String((index % 4) + 1)}`,
      productId: product.productId,
      publisherType: 'PLAYER',
      priceKind: 'CREDITS',
      minimumBidCredits: 180 + index * 125,
      buyNowCredits: index % 3 === 0 ? 900 + index * 210 : null,
      currency: null,
      minimumBidAmountMinor: null,
      buyNowAmountMinor: null,
      officialMark: null,
      status: 'ACTIVE',
      publishedAt,
      closesAt,
      currentBidAmount: index % 2 === 0 ? 250 + index * 140 : null,
      bidCount: index * 3,
    }
  })
}

const filterAuctions = (url: URL, auctions: readonly ActiveAuction[]): readonly ActiveAuction[] => {
  const search = url.searchParams.get('search')?.trim().toLocaleLowerCase() ?? ''
  const publisherType = url.searchParams.get('publisherType')
  const priceKind = url.searchParams.get('priceKind')
  const hasBuyNow = url.searchParams.get('hasBuyNow')

  return auctions.filter((auction) => {
    const productName = PRODUCT_BY_ID.get(auction.productId)?.name.toLocaleLowerCase() ?? ''
    const matchesSearch = search === '' || productName.includes(search)
    const matchesPublisher = publisherType === null || auction.publisherType === publisherType
    const matchesPrice = priceKind === null || auction.priceKind === priceKind
    const buyNowAvailable =
      auction.priceKind === 'CREDITS'
        ? auction.buyNowCredits !== null
        : auction.buyNowAmountMinor !== null
    const matchesBuyNow = hasBuyNow === null || buyNowAvailable === (hasBuyNow === 'true')

    return matchesSearch && matchesPublisher && matchesPrice && matchesBuyNow
  })
}

/** Marketplace real con contratos interceptados exclusivamente dentro de la ruta DEV. */
export const AuctionMarketplaceDevPreview = (): React.JSX.Element => {
  const auctions = useMemo(() => buildAuctions(), [])
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
    const followed = new Set<string>(['auction-preview-2', 'auction-preview-7'])

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const raw =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      const url = new URL(raw, globalThis.location.origin)
      const method = init?.method ?? (input instanceof Request ? input.method : 'GET')

      if (url.pathname.startsWith('/api/v1/catalog/products/')) {
        const productId = decodeURIComponent(url.pathname.split('/').at(-1) ?? '')
        return jsonResponse(PRODUCT_BY_ID.get(productId) ?? PRODUCTS[0])
      }

      if (url.pathname === '/api/v1/auctions/suggestions') {
        const query = url.searchParams.get('q')?.toLocaleLowerCase() ?? ''
        return jsonResponse({
          items: PRODUCTS.filter((product) => product.name.toLocaleLowerCase().includes(query)).map(
            (product) => ({ productId: product.productId, name: product.name, type: product.type }),
          ),
        })
      }

      if (url.pathname === '/api/v1/auctions/watchlist') {
        if (method === 'POST') {
          const body = JSON.parse((init?.body as string | undefined) ?? '{}') as {
            auctionId?: string
          }
          if (body.auctionId !== undefined) followed.add(body.auctionId)
          return jsonResponse({ ok: true })
        }
        return jsonResponse({
          items: auctions
            .filter((auction) => followed.has(auction.id) && auction.priceKind === 'CREDITS')
            .map((auction) => ({
              auctionId: auction.id,
              followedAt: new Date().toISOString(),
              auction,
            })),
        })
      }

      if (url.pathname.startsWith('/api/v1/auctions/watchlist/') && method === 'DELETE') {
        followed.delete(decodeURIComponent(url.pathname.split('/').at(-1) ?? ''))
        return new Response(null, { status: 204 })
      }

      if (url.pathname === '/api/v1/auctions') {
        const filtered = filterAuctions(url, auctions)
        const page = Number(url.searchParams.get('page') ?? '1')
        const pageSize = Number(url.searchParams.get('pageSize') ?? '16')
        const start = (page - 1) * pageSize

        return jsonResponse({
          items: filtered.slice(start, start + pageSize),
          page,
          pageSize,
          total: filtered.length,
        })
      }

      if (url.pathname.startsWith('/api/')) {
        return jsonResponse({ message: 'Ruta no simulada en el preview de Marketplace.' }, 404)
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
  }, [auctions])

  return (
    <main>
      <AuctionThemeDevToolbar />
      <div className="mx-auto w-[calc(100%-2rem)] max-w-[1368px] pt-4 sm:pr-64">
        <p className="text-xs text-muted">
          Preview DEV: 22 subastas locales, búsqueda, filtros y paginación sin backend.
        </p>
      </div>
      {ready ? <AuctionMarketplace /> : null}
    </main>
  )
}
