import { useEffect, useState } from 'react'

import { AuctionPage } from '../AuctionPage'
import type { WatchlistItem } from '../contract'

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

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
 * Harness visual de HU-68. Monta la pantalla de producción y simula únicamente
 * el contrato de watchlist mientras esta ruta de desarrollo permanece activa.
 */
export const AuctionWatchlistDevPreview = (): React.JSX.Element => {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const original = globalThis.fetch
    let items = [...initialItems]

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

      if (!url.includes('/api/v1/auctions/watchlist')) return original(input, init)

      const method = init?.method ?? 'GET'
      if (method === 'GET') return jsonResponse({ items })

      if (method === 'DELETE') {
        const auctionId = decodeURIComponent(url.split('/').at(-1) ?? '')
        items = items.filter((item) => item.auctionId !== auctionId)
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
    const readyTimer = globalThis.setTimeout(() => {
      setReady(true)
    }, 0)

    return () => {
      globalThis.clearTimeout(readyTimer)
      globalThis.fetch = original
    }
  }, [])

  return (
    <div>
      <p className="mx-auto mt-4 w-[calc(100%-2rem)] max-w-5xl rounded-md border border-border bg-surface-raised px-4 py-2 text-xs text-muted">
        Vista previa de desarrollo. Las subastas están simuladas y no llegan a Auction.
      </p>
      {ready ? <AuctionPage /> : null}
    </div>
  )
}
