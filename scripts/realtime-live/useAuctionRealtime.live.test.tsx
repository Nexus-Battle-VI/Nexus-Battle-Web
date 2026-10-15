import { execFileSync } from 'node:child_process'

import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import WebSocket from 'ws'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { useAuctionRealtime } from '@/features/auction/realtime/useAuctionRealtime'
import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'

/**
 * EN-034.5 — verificacion MANUAL del cliente de la Web contra un Auction REAL.
 *
 * Ejecuta el hook `useAuctionRealtime` de produccion (sin dobles de socket ni de ticket): el
 * ticket se pide con `httpClient` y el WebSocket lo abre el `WebSocket` real de jsdom. Detras hay
 * Caddy (con el Caddyfile real de Infrastructure), Auction (imagen construida desde `develop`) y
 * PostgreSQL. NO forma parte de la suite ni del CI: vive en `scripts/` y se lanza con
 * `scripts/realtime-live/vitest.live.config.ts`. Ver el README de este directorio.
 *
 * Lo que comprueba es la unica pieza que las pruebas con sockets simulados no pueden: que el
 * protocolo que habla la Web es el que habla el servidor.
 */

const BASE = process.env.LIVE_BASE_URL ?? 'http://127.0.0.1:18080'
const AUCTION = 'live-1'
const OTHER = 'live-2'

const psql = (statement: string): string =>
  execFileSync(
    'docker',
    [
      'exec',
      'rt-pg',
      'psql',
      '-U',
      'postgres',
      '-d',
      'auction',
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      statement,
    ],
    { encoding: 'utf8' },
  )

const seedAuction = (id: string): void => {
  psql(`delete from auction_bids where auction_id = '${id}'`)
  psql(`delete from auctions where id = '${id}'`)
  psql(`
    insert into auctions (id, seller_id, product_id, duration_hours, publisher_type, price_kind,
      publication_fee_credits, minimum_bid_credits, buy_now_credits, status, published_at, closes_at,
      inventory_commitment_id, fee_charge_id)
    values ('${id}', 'seller-${id}', 'product-${id}', 24, 'PLAYER', 'CREDITS',
      1, 1, null, 'ACTIVE', now(), now() + interval '24 hours', 'commitment-${id}', 'charge-${id}')
  `)
}

const bid = (id: string, n: number, amount: number): void => {
  psql(`
    update auction_bids set is_leader = false where auction_id = '${id}';
    insert into auction_bids (id, auction_id, bidder_id, amount_credits, placed_at, is_leader)
    values ('${id}-bid-${String(n)}', '${id}', 'bidder-${String(n)}', ${amount}, now(), true)
  `)
}

/** Una "sesion" de la Web: su propio QueryClient, como si fuera otra pestana u otra persona. */
const session = (options: { auctionId?: string; marketplace?: boolean }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const reads = { detail: 0, list: 0 }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  const hook = renderHook(
    () => {
      const realtime = useAuctionRealtime(options)
      // Consultas MONTADAS: invalidar solo vuelve a leer lo que esta en pantalla.
      useQuery({
        queryKey: queryKeys.auction.detail(options.auctionId ?? AUCTION),
        queryFn: () => {
          reads.detail += 1
          return Promise.resolve({ reads: reads.detail })
        },
        enabled: options.auctionId !== undefined,
      })
      useQuery({
        queryKey: queryKeys.auctions.active,
        queryFn: () => {
          reads.list += 1
          return Promise.resolve({ reads: reads.list })
        },
        enabled: options.marketplace === true,
      })
      return realtime
    },
    { wrapper },
  )

  return { hook, reads, queryClient }
}

beforeAll(() => {
  // Una sesion de la Web con testimonio, para que el hook pida ticket. Auction (AUTH_MODE=disabled)
  // no lo verifica; lo que se prueba aqui es el protocolo, no la identidad.
  useSession.setState({
    subject: 'persona-live',
    accessToken: 'jwt-de-prueba',
    expiresAt: Date.now() + 3_600_000,
  })

  // `httpClient` pide rutas relativas (`/api/...`) y `fetch` de Node no las admite: se antepone el
  // origen de Caddy. El resto de la peticion (cabecera Authorization, JSON) es la real.
  const realFetch = globalThis.fetch.bind(globalThis)
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    realFetch(typeof input === 'string' && input.startsWith('/') ? `${BASE}${input}` : input, init),
  )

  // El `WebSocket` global de Node (undici) dispara eventos incompatibles con el `Event` de jsdom.
  // `ws` es un cliente WebSocket real con la misma API de `addEventListener` que usa la conexion.
  vi.stubGlobal('WebSocket', WebSocket)

  seedAuction(AUCTION)
  seedAuction(OTHER)
})

afterAll(() => {
  vi.unstubAllGlobals()
})

/** `LIVE_REALTIME_OFF=1`: Auction levantado con `AUCTION_REALTIME_ENABLED=false` (reversion, ADR-024). */
const REALTIME_OFF = process.env.LIVE_REALTIME_OFF === '1'

describe.skipIf(REALTIME_OFF)('useAuctionRealtime contra Auction REAL (via Caddy)', () => {
  it('conecta de verdad: pide ticket por HTTP, abre el WebSocket y queda "en vivo"', async () => {
    const detail = session({ auctionId: AUCTION })

    await waitFor(
      () => {
        expect(detail.hook.result.current.connection).toBe('open')
      },
      { timeout: 10_000 },
    )

    expect(detail.hook.result.current.live).toBe(true)
    expect(detail.hook.result.current.fallbackRefetchMs).toBe(false)
    detail.hook.unmount()
  })

  it('CA-01: dos sesiones reciben la puja y vuelven a leer SIN accion manual', async () => {
    const first = session({ auctionId: AUCTION })
    const second = session({ auctionId: AUCTION })
    await waitFor(
      () => {
        expect(first.hook.result.current.live && second.hook.result.current.live).toBe(true)
      },
      { timeout: 10_000 },
    )
    await waitFor(() => {
      expect(first.reads.detail).toBe(1)
      expect(second.reads.detail).toBe(1)
    })

    bid(AUCTION, 1, 10)

    await waitFor(
      () => {
        expect(first.reads.detail).toBe(2)
        expect(second.reads.detail).toBe(2)
      },
      { timeout: 10_000 },
    )
    first.hook.unmount()
    second.hook.unmount()
  })

  it('CA-02: lo que pasa en OTRA subasta no hace volver a leer ESTE detalle', async () => {
    const watching = session({ auctionId: AUCTION })
    await waitFor(
      () => {
        expect(watching.hook.result.current.live).toBe(true)
      },
      { timeout: 10_000 },
    )
    await waitFor(() => {
      expect(watching.reads.detail).toBe(1)
    })

    bid(OTHER, 1, 10)
    await new Promise((resolve) => setTimeout(resolve, 1_500))

    expect(watching.reads.detail).toBe(1)

    // Y la propia subasta sigue funcionando despues de la ajena.
    bid(AUCTION, 2, 20)
    await waitFor(
      () => {
        expect(watching.reads.detail).toBe(2)
      },
      { timeout: 10_000 },
    )
    watching.hook.unmount()
  })

  it('CA-05: Marketplace vuelve a leer la lista ante una puja de cualquier subasta', async () => {
    const market = session({ marketplace: true })
    await waitFor(
      () => {
        expect(market.hook.result.current.live).toBe(true)
      },
      { timeout: 10_000 },
    )
    await waitFor(() => {
      expect(market.reads.list).toBe(1)
    })

    bid(OTHER, 2, 30)

    await waitFor(
      () => {
        expect(market.reads.list).toBe(2)
      },
      { timeout: 10_000 },
    )
    market.hook.unmount()
  })

  it('CA-04: un cambio de estado (cancelacion) tambien llega', async () => {
    seedAuction('live-3')
    const watching = session({ auctionId: 'live-3' })
    await waitFor(
      () => {
        expect(watching.hook.result.current.live).toBe(true)
      },
      { timeout: 10_000 },
    )
    await waitFor(() => {
      expect(watching.reads.detail).toBe(1)
    })

    psql(`update auctions set status = 'CANCELLED', cancelled_at = now() where id = 'live-3'`)

    await waitFor(
      () => {
        expect(watching.reads.detail).toBe(2)
      },
      { timeout: 10_000 },
    )
    watching.hook.unmount()
  })

  it('CA-03: si Auction pierde su conexion con PostgreSQL, el servidor manda resync y la Web relee', async () => {
    const market = session({ marketplace: true })
    await waitFor(
      () => {
        expect(market.hook.result.current.live).toBe(true)
      },
      { timeout: 10_000 },
    )
    await waitFor(() => {
      expect(market.reads.list).toBe(1)
    })

    // Mata SOLO la conexion en LISTEN de Auction. No llega ninguna senal; la unica forma de que la
    // Web se entere es el `resync` que emite el servidor al recuperar su conexion.
    psql(`
      select pg_terminate_backend(pid) from pg_stat_activity
      where query like 'LISTEN auction_realtime%' and pid <> pg_backend_pid()
    `)

    await waitFor(
      () => {
        expect(market.reads.list).toBeGreaterThanOrEqual(2)
      },
      { timeout: 15_000 },
    )
    // Y el canal sigue vivo despues de recuperarse.
    const before = market.reads.list
    bid(OTHER, 3, 40)
    await waitFor(
      () => {
        expect(market.reads.list).toBeGreaterThan(before)
      },
      { timeout: 10_000 },
    )
    market.hook.unmount()
  })

  it('al cerrar la pantalla, la Web cierra su conexion', async () => {
    const detail = session({ auctionId: AUCTION })
    await waitFor(
      () => {
        expect(detail.hook.result.current.live).toBe(true)
      },
      { timeout: 10_000 },
    )

    act(() => {
      detail.hook.unmount()
    })
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Si la Web dejara el socket abierto, el servidor seguiria contando la conexion: tras cerrar
    // las demas sesiones de esta prueba un ticket nuevo debe seguir siendo posible (limite de 3).
    const again = session({ auctionId: AUCTION })
    await waitFor(
      () => {
        expect(again.hook.result.current.live).toBe(true)
      },
      { timeout: 10_000 },
    )
    again.hook.unmount()
  })
})

describe.skipIf(!REALTIME_OFF)(
  'useAuctionRealtime contra Auction REAL con el realtime APAGADO',
  () => {
    it('el ticket responde 404: la conexion queda disabled, sin reintentos, sin sondeo', async () => {
      const ticket = await fetch('/api/v1/auctions/realtime/tickets', { method: 'POST' })
      expect(ticket.status).toBe(404)

      const detail = session({ auctionId: AUCTION })

      await waitFor(() => {
        expect(detail.hook.result.current.connection).toBe('disabled')
      })
      // Sin reintentos ni sondeo: pasado un rato sigue igual y la pantalla leyo una sola vez.
      await new Promise((resolve) => setTimeout(resolve, 3_000))
      expect(detail.hook.result.current).toEqual({
        connection: 'disabled',
        live: false,
        fallbackRefetchMs: false,
      })
      expect(detail.reads.detail).toBe(1)
      detail.hook.unmount()
    })
  },
)
