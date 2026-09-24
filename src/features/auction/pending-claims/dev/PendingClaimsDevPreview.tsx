import { useEffect } from 'react'

import { useSession } from '@/shared/session'
import { PendingClaimsPage } from '../PendingClaimsPage'

/**
 * Vista previa de desarrollo de HU-69.7 (solo `import.meta.env.DEV`).
 *
 * `PendingClaimsPage` vive tras `RequireSession` y necesita Auction
 * respondiendo de verdad (`/v1/auctions/me/pending-claims*`) y Catalog para
 * el nombre de cada producto (`/v1/catalog/products/*`). El entorno local no
 * levanta esos servicios, asi que, igual que `ModerationQueueDevPreview` y
 * `BattleRoomLobbyDevPreview`, este preview intercepta `fetch` para esas
 * rutas y falsea una sesion mientras esta montado. Monta el componente REAL
 * de produccion, sin fixtures propios: reclamar, el lote y "Recoger todo"
 * funcionan de verdad contra este servidor simulado.
 *
 * NO ES UNA PUERTA TRASERA: solo existe con `import.meta.env.DEV` (Vite
 * elimina la rama entera en produccion) y no monta la ruta productiva.
 */
const PRODUCTS: Readonly<Record<string, { name: string; type: string }>> = {
  'product-espada': { name: 'Espada Legendaria Nexus', type: 'WEAPON' },
  'product-escudo': { name: 'Escudo Antiguo', type: 'ARMOR' },
  'product-pocion': { name: 'Poción de Maná Superior', type: 'CONSUMABLE' },
  'product-urgente': { name: 'Yelmo del Vacío', type: 'ARMOR' },
}

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

interface StubClaim {
  auctionId: string
  productId: string
  winningBidId: string
  finalAmountCredits: number
  settledAt: string
  claimStatus: 'PENDING' | 'CLAIMED'
  claimDeadline: string
  remainingClaimDays: number
}

const now = Date.now()

const claims = new Map<string, StubClaim>([
  [
    'auction-espada',
    {
      auctionId: 'auction-espada',
      productId: 'product-espada',
      winningBidId: 'bid-1',
      finalAmountCredits: 2500,
      settledAt: new Date(now - 2 * DAY_MS).toISOString(),
      claimStatus: 'PENDING',
      claimDeadline: new Date(now + 5 * DAY_MS).toISOString(),
      remainingClaimDays: 5,
    },
  ],
  [
    'auction-escudo',
    {
      auctionId: 'auction-escudo',
      productId: 'product-escudo',
      winningBidId: 'bid-2',
      finalAmountCredits: 1200,
      settledAt: new Date(now - 5 * DAY_MS).toISOString(),
      claimStatus: 'PENDING',
      claimDeadline: new Date(now + 2 * DAY_MS).toISOString(),
      remainingClaimDays: 2,
    },
  ],
  [
    'auction-urgente',
    {
      auctionId: 'auction-urgente',
      productId: 'product-urgente',
      winningBidId: 'bid-3',
      finalAmountCredits: 4800,
      settledAt: new Date(now - 6 * DAY_MS - 20 * HOUR_MS).toISOString(),
      claimStatus: 'PENDING',
      claimDeadline: new Date(now + 4 * HOUR_MS).toISOString(),
      remainingClaimDays: 1,
    },
  ],
  [
    'auction-pocion',
    {
      auctionId: 'auction-pocion',
      productId: 'product-pocion',
      winningBidId: 'bid-4',
      finalAmountCredits: 300,
      settledAt: new Date(now - 6 * DAY_MS).toISOString(),
      claimStatus: 'CLAIMED',
      claimDeadline: new Date(now + 1 * DAY_MS).toISOString(),
      remainingClaimDays: 1,
    },
  ],
])

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const canonicalProductFor = (productId: string) => {
  const product = PRODUCTS[productId] ?? { name: productId, type: 'WEAPON' }

  return {
    productId,
    sku: productId,
    name: product.name,
    description: '',
    imageUrl: '',
    type: product.type,
    lifecycleStatus: 'PUBLISHED',
    creditsPrice: 0,
    premium: false,
    realMoneyPrice: null,
    averageRating: null,
    reviewCount: 0,
  }
}

const claimOne = (auctionId: string): Response => {
  const claim = claims.get(auctionId)

  if (claim === undefined) {
    return jsonResponse({ message: 'No existe un producto pendiente de reclamo.' }, 404)
  }

  const updated: StubClaim = { ...claim, claimStatus: 'CLAIMED' }
  claims.set(auctionId, updated)

  return jsonResponse(updated)
}

const handlePendingClaimsRequest = (input: string, init?: RequestInit): Response => {
  const url = new URL(input, globalThis.location.origin)

  if (url.pathname === '/api/v1/auctions/me/pending-claims') {
    return jsonResponse([...claims.values()])
  }

  const claimMatch = /^\/api\/v1\/auctions\/me\/pending-claims\/([^/]+)\/claim$/u.exec(url.pathname)

  if (claimMatch) {
    return claimOne(decodeURIComponent(claimMatch[1] ?? ''))
  }

  if (url.pathname === '/api/v1/auctions/me/pending-claims/claim-batch') {
    const body = JSON.parse((init?.body as string | undefined) ?? '{}') as {
      auctionIds?: readonly string[]
      claimAll?: boolean
    }
    const targetIds =
      body.claimAll === true
        ? [...claims.values()]
            .filter((claim) => claim.claimStatus === 'PENDING')
            .map((c) => c.auctionId)
        : (body.auctionIds ?? [])

    const results = targetIds.map((auctionId) => {
      const claim = claims.get(auctionId)

      if (claim === undefined) {
        return { auctionId, status: 'NOT_FOUND' as const, claim: null, message: null }
      }

      if (auctionId === 'auction-escudo') {
        // Simula un fallo parcial: Inventory no disponible para este item.
        return {
          auctionId,
          status: 'INVENTORY_UNAVAILABLE' as const,
          claim: null,
          message: 'Player-Inventory no disponible.',
        }
      }

      const updated: StubClaim = { ...claim, claimStatus: 'CLAIMED' }
      claims.set(auctionId, updated)

      return { auctionId, status: 'CLAIMED' as const, claim: updated, message: null }
    })

    return jsonResponse({ results })
  }

  const catalogMatch = /^\/api\/v1\/catalog\/products\/([^/]+)$/u.exec(url.pathname)

  if (catalogMatch) {
    return jsonResponse(canonicalProductFor(decodeURIComponent(catalogMatch[1] ?? '')))
  }

  return jsonResponse({ message: 'Ruta no simulada en este preview.' }, 404)
}

export const PendingClaimsDevPreview = (): React.JSX.Element => {
  useEffect(() => {
    const previous = useSession.getState()

    useSession.setState({
      subject: 'jugador-preview',
      accessToken: null,
      expiresAt: null,
    })

    return () => {
      useSession.setState(previous)
    }
  }, [])

  useEffect(() => {
    const original = globalThis.fetch

    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

      if (
        url.includes('/api/v1/auctions/me/pending-claims') ||
        url.includes('/api/v1/catalog/products/')
      ) {
        return Promise.resolve(handlePendingClaimsRequest(url, init))
      }

      return original(input, init)
    }

    return () => {
      globalThis.fetch = original
    }
  }, [])

  return (
    <div>
      <p className="mx-auto max-w-5xl px-4 pt-4 text-xs text-muted sm:px-6">
        Vista previa de desarrollo. Los productos pendientes y los reclamos están simulados: no
        llegan a Auction. "Escudo Antiguo" está preparado para fallar en el reclamo en bloque
        (INVENTORY_UNAVAILABLE), para ver el resultado parcial.
      </p>
      <PendingClaimsPage />
    </div>
  )
}
