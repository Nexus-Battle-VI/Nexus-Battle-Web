import { useEffect } from 'react'

import { useSession } from '@/shared/session'
import { AuctionActivityPage } from './activity/AuctionActivityPage'
import { AuctionThemeDevToolbar } from './dev/AuctionThemeDevToolbar'
import { OfficialAuctionPublisher } from './OfficialAuctionPublisher'
import { PublishAuctionPage } from './PublishAuctionPage'

const jsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

const product = (productId: string, name: string, type: string) => ({
  productId,
  sku: productId,
  name,
  description: 'Pieza de coleccion verificada para la vista previa de Auction.',
  imageUrl: '',
  type,
  lifecycleStatus: 'ACTIVE',
  creditsPrice: 2400,
  premium: false,
  realMoneyPrice: null,
  averageRating: 4.8,
  reviewCount: 42,
})

const PRODUCTS = new Map([
  ['activity-sword', product('activity-sword', 'Espada del eclipse', 'WEAPON')],
  ['activity-shield', product('activity-shield', 'Escudo del centinela', 'ARMOR')],
  ['publish-relic', product('publish-relic', 'Reliquia de la corona astral', 'RELIC')],
])

/**
 * Instala el mock de `fetch` de Activity/Publish al EVALUAR este modulo
 * (abajo, fuera de cualquier componente), no en un render ni en un
 * `useEffect`.
 *
 * La pagina real monta su query en un efecto mas profundo en el arbol en
 * cuanto se monta, y React 19 en modo Strict puede montar/descartar/montar
 * de nuevo un limite Suspense antes de comprometerse a la version final: un
 * mock instalado durante ese primer montaje descartable (en un `useEffect`
 * o incluso en el cuerpo del render, guardado por `ref`) se perdia --
 * `globalThis.fetch` volvia a ser el nativo antes de que la query real
 * llegara a dispararse, y ademas el linter de pureza de React prohibe mutar
 * `globalThis.fetch` dentro de un render. El codigo de modulo evita ambos
 * problemas: corre exactamente una vez, cuando Vite carga el chunk
 * perezoso, sin que el ciclo de montaje de React pueda deshacerlo.
 *
 * Las rutas de Activity y Publish no se solapan (`/me/owned`, `/me/bids`...
 * contra `/inventories/me/items`), asi que un unico mock sirve a ambas
 * previews sin necesitar un parametro `kind`.
 */
const installOperationsFetchMock = (): void => {
  const originalFetch = globalThis.fetch

  globalThis.fetch = (input: RequestInfo | URL): Promise<Response> => {
    const raw =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const url = new URL(raw, globalThis.location.origin)
    const now = Date.now()
    const closesAt = new Date(now + 18 * 60 * 60 * 1000).toISOString()

    if (url.pathname.startsWith('/api/v1/catalog/products/')) {
      const id = decodeURIComponent(url.pathname.split('/').at(-1) ?? '')
      return Promise.resolve(jsonResponse(PRODUCTS.get(id) ?? product(id, id, 'ITEM')))
    }

    if (url.pathname === '/api/v1/auctions/me/owned') {
      return Promise.resolve(
        jsonResponse({
          items: [
            {
              auctionId: 'owned-active',
              productId: 'activity-sword',
              status: 'ACTIVE',
              minimumBidCredits: 1800,
              buyNowCredits: 4200,
              currentBidCredits: 2600,
              bidCount: 8,
              publishedAt: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
              closesAt,
              finishedAt: null,
              cancelledAt: null,
              actions: { view: true, cancel: false },
            },
            {
              auctionId: 'owned-finished',
              productId: 'activity-shield',
              status: 'SOLD',
              minimumBidCredits: 900,
              buyNowCredits: null,
              currentBidCredits: 1750,
              bidCount: 5,
              publishedAt: new Date(now - 48 * 60 * 60 * 1000).toISOString(),
              closesAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
              finishedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
              cancelledAt: null,
              actions: { view: true, cancel: false },
            },
          ],
          total: 2,
          page: 1,
          pageSize: 16,
        }),
      )
    }

    if (url.pathname === '/api/v1/auctions/me/bids') {
      return Promise.resolve(
        jsonResponse({
          items: [
            {
              auctionId: 'bid-leading',
              productId: 'activity-shield',
              auctionStatus: 'ACTIVE',
              participationStatus: 'LEADING',
              ownLatestBidCredits: 2100,
              ownLatestBidAt: new Date(now - 20 * 60 * 1000).toISOString(),
              currentBidCredits: 2100,
              closesAt,
            },
            {
              auctionId: 'bid-lost',
              productId: 'activity-sword',
              auctionStatus: 'FINISHED',
              participationStatus: 'LOST',
              ownLatestBidCredits: 1900,
              ownLatestBidAt: new Date(now - 26 * 60 * 60 * 1000).toISOString(),
              currentBidCredits: 2500,
              closesAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
            },
          ],
          total: 2,
          page: 1,
          pageSize: 16,
        }),
      )
    }

    if (url.pathname === '/api/v1/auctions/me/transactions') {
      return Promise.resolve(
        jsonResponse({
          items: [
            {
              id: 'transaction-1',
              auctionId: 'owned-active',
              type: 'PUBLICATION_FEE',
              reference: 'fee-preview',
              occurredAt: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
              status: 'CONFIRMED',
              value: { amount: 3, unit: 'CREDITS' },
            },
            {
              id: 'transaction-2',
              auctionId: 'bid-leading',
              type: 'BID_RESERVATION',
              reference: 'bid-preview',
              occurredAt: new Date(now - 20 * 60 * 1000).toISOString(),
              status: 'CONFIRMED',
              value: { amount: 2100, unit: 'CREDITS' },
            },
          ],
          total: 2,
          page: 1,
          pageSize: 16,
        }),
      )
    }

    if (url.pathname === '/api/v1/auctions/me/view-statistics') {
      return Promise.resolve(
        jsonResponse({
          availability: 'AVAILABLE',
          metrics: [
            { auctionId: 'owned-active', views: 128 },
            { auctionId: 'owned-finished', views: 76 },
          ],
        }),
      )
    }

    if (url.pathname === '/api/inventories/me/items') {
      const relic = PRODUCTS.get('publish-relic')
      return Promise.resolve(
        jsonResponse({
          items: [
            {
              itemId: 'inventory-relic',
              quantity: 1,
              product: relic,
            },
          ],
          page: 1,
          pageSize: 20,
          totalItems: 1,
          totalPages: 1,
        }),
      )
    }

    return originalFetch(input)
  }
}

installOperationsFetchMock()

/**
 * Sesion de jugador para las previews de Activity/Publish. Vive en un
 * `useEffect` (no en el cuerpo del render): ninguna consulta depende de su
 * orden relativo al mock de `fetch`, y mutar un store de Zustand durante el
 * render de otro componente dispara un error de React ("Cannot update a
 * component while rendering a different component").
 */
const useAuctionOperationsSession = (): void => {
  useEffect(() => {
    const previousSession = useSession.getState()
    useSession.setState({
      subject: 'auction-preview-player',
      roles: ['PLAYER'],
      accessToken: null,
      expiresAt: null,
    })

    return () => {
      useSession.setState(previousSession)
    }
  }, [])
}

/** Actividad real con endpoints locales para QA visual aislada. */
export const AuctionActivityDevPreview = (): React.JSX.Element => {
  useAuctionOperationsSession()
  return (
    <>
      <AuctionThemeDevToolbar />
      <AuctionActivityPage />
    </>
  )
}

/** Formulario real de publicacion PLAYER con inventario local. */
export const AuctionPublishDevPreview = (): React.JSX.Element => {
  useAuctionOperationsSession()
  return (
    <>
      <AuctionThemeDevToolbar />
      <PublishAuctionPage />
    </>
  )
}

/** Formulario real GAME_MASTER; el preview DEV evita solamente el guard de ruta. */
export const AuctionOfficialPublishDevPreview = (): React.JSX.Element => (
  <>
    <AuctionThemeDevToolbar />
    <OfficialAuctionPublisher />
  </>
)
