import { AuctionPage } from '../AuctionPage'
import type { WatchlistItem } from '../contract'
import { AuctionThemeDevToolbar } from './AuctionThemeDevToolbar'

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/**
 * `AuctionProductSummary` resuelve nombre/artwork via Catalog
 * (`fetchCanonicalProduct`). Este preview simulaba solo `/auctions/watchlist`
 * y dejaba esa consulta sin mock: la tarjeta caía siempre en su fallback
 * final ("Producto" + el slug crudo), que es el comportamiento correcto
 * cuando el catálogo de verdad no responde, pero no deja ver la identidad
 * real en una vista previa DEV. Se añaden aquí fixtures de catálogo con
 * nombres legibles para los tres `productId` de `initialItems`.
 */
const CATALOG_PRODUCTS: Readonly<Record<string, { name: string; type: string }>> = {
  'huevo-de-dragon-carmesí': { name: 'Huevo de dragón carmesí', type: 'RELIC' },
  'armadura-del-centinela': { name: 'Armadura del centinela', type: 'ARMOR' },
  'elixir-de-mana-mayor': { name: 'Elixir de maná mayor', type: 'CONSUMABLE' },
}

const canonicalProductFor = (productId: string) => {
  const entry = CATALOG_PRODUCTS[productId] ?? { name: productId, type: 'ITEM' }

  return {
    productId,
    sku: productId,
    name: entry.name,
    description: '',
    imageUrl: '',
    type: entry.type,
    lifecycleStatus: 'PUBLISHED',
    creditsPrice: 0,
    premium: false,
    realMoneyPrice: null,
    averageRating: null,
    reviewCount: 0,
  }
}

const initialItems: readonly WatchlistItem[] = [
  {
    auctionId: 'subasta-dragon-001',
    followedAt: '2026-09-22T19:45:00.000Z',
    auction: {
      id: 'subasta-dragon-001',
      sellerId: 'mercader-del-norte',
      productId: 'huevo-de-dragon-carmesí',
      minimumBidCredits: 1250,
      buyNowCredits: 4800,
      status: 'ACTIVE',
      closesAt: '2026-09-24T01:30:00.000Z',
    },
  },
  {
    auctionId: 'subasta-armadura-047',
    followedAt: '2026-09-22T17:10:00.000Z',
    auction: {
      id: 'subasta-armadura-047',
      sellerId: 'forja-real',
      productId: 'armadura-del-centinela',
      minimumBidCredits: 720,
      buyNowCredits: null,
      status: 'ACTIVE',
      closesAt: '2026-09-23T23:15:00.000Z',
    },
  },
  {
    auctionId: 'subasta-poción-118',
    followedAt: '2026-09-21T21:05:00.000Z',
    auction: {
      id: 'subasta-poción-118',
      sellerId: 'alquimista-errante',
      productId: 'elixir-de-mana-mayor',
      minimumBidCredits: 180,
      buyNowCredits: 450,
      status: 'ACTIVE',
      closesAt: '2026-09-25T18:00:00.000Z',
    },
  },
]

/**
 * Harness visual de HU-68. Monta la pantalla de producción y simula el
 * contrato de watchlist y la identidad de producto de Catalog mientras esta
 * ruta de desarrollo permanece activa.
 *
 * El mock se instala al EVALUAR este modulo (abajo, fuera del componente),
 * no en un render ni en un `useEffect`: `AuctionPage` dispara su query en un
 * efecto mas profundo en el arbol en cuanto se monta, y React 19 en modo
 * Strict puede montar/descartar/montar de nuevo un limite `Suspense` antes
 * de comprometerse a la version final -- un `useRef`/`useEffect` instalado
 * durante ese primer montaje descartable se perdia (`globalThis.fetch`
 * volvia a ser el nativo antes de que la query real llegara a dispararse).
 * El codigo de modulo en cambio corre exactamente una vez, cuando Vite carga
 * el chunk perezoso, sin que el ciclo de montaje de React pueda deshacerlo.
 */
let watchlistItems = [...initialItems]
const originalFetchBeforeWatchlistMock = globalThis.fetch

globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url =
    typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

  if (url.includes('/api/v1/auctions/watchlist')) {
    const method = init?.method ?? 'GET'
    if (method === 'GET') return jsonResponse({ items: watchlistItems })

    if (method === 'DELETE') {
      const auctionId = decodeURIComponent(url.split('/').at(-1) ?? '')
      watchlistItems = watchlistItems.filter((item) => item.auctionId !== auctionId)
      return new Response(null, { status: 204 })
    }

    if (method === 'POST') {
      return jsonResponse(
        { code: 'AUCTION_NOT_FOLLOWABLE', message: 'Vista previa: subasta no disponible.' },
        422,
      )
    }

    return jsonResponse({ message: 'Método no simulado.' }, 405)
  }

  const catalogMatch = /^\/api\/v1\/catalog\/products\/([^/]+)$/u.exec(
    new URL(url, globalThis.location.origin).pathname,
  )
  if (catalogMatch) {
    return jsonResponse(canonicalProductFor(decodeURIComponent(catalogMatch[1] ?? '')))
  }

  return originalFetchBeforeWatchlistMock(input, init)
}

// Deliberadamente SIN restaurar `fetch` al desmontar: React 19 en modo
// Strict puede ejecutar la limpieza de un efecto una vez de mas, como parte
// de montar/descartar/montar de nuevo un limite Suspense antes de
// comprometerse a la version final -- esa limpieza fantasma deshacia el
// mock sin que nada volviera a instalarlo (la instalacion es de modulo,
// corre una sola vez). El mock solo intercepta un par de rutas de Auction;
// dejarlo activo el resto de la sesion DEV es inofensivo.
export const AuctionWatchlistDevPreview = (): React.JSX.Element => {
  return (
    <div>
      <AuctionThemeDevToolbar />
      <p className="mx-auto mt-4 w-[calc(100%-2rem)] max-w-5xl rounded-md border border-border bg-surface-raised px-4 py-2 text-xs text-muted">
        Vista previa de desarrollo. Las subastas están simuladas y no llegan a Auction.
      </p>
      <AuctionPage />
    </div>
  )
}
