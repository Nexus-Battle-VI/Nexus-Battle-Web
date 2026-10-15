import { useEffect, useState } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'

import {
  defaultSocketFactory,
  openRealtimeConnection,
  type RealtimeConnectionState,
  type SocketFactory,
  type TicketProvider,
} from '@/features/battle-rooms/realtime'
import { queryKeys } from '@/shared/query-keys'

import { isAuctionRealtimeUnavailable, issueAuctionRealtimeTicket } from './api'
import { parseAuctionSignal, RevisionTracker } from './signals'

export type { RealtimeConnectionState }

/** Ruta del WebSocket de Subasta bajo `API_BASE_URL` (ADR-024). */
const AUCTION_REALTIME_PATH = '/v1/auctions/realtime'

/** Canal agregado de Marketplace y prefijo del canal de una subasta (contrato, seccion 4). */
const MARKETPLACE_CHANNEL = 'auctions'
const auctionChannel = (auctionId: string): string => `auctions/${auctionId}`

/**
 * Sondeo HTTP de recuperacion mientras NO hay conexion en vivo (reversion de ADR-024: el cliente
 * cae a sondeo HTTP con intervalo largo). Largo a proposito: es una red de seguridad, no el
 * mecanismo de actualizacion.
 */
export const REALTIME_FALLBACK_POLL_MS = 30_000

export interface AuctionRealtimeOptions {
  /** Subasta que muestra el Detalle. `null`/ausente si la pantalla no observa una en concreto. */
  readonly auctionId?: string | null
  /** `true` en Marketplace: observa el canal agregado de todas las subastas. */
  readonly marketplace?: boolean
  /** Inyectables para pruebas, igual que `useBattleRoomRealtime`. */
  readonly socketFactory?: SocketFactory
  readonly ticketProvider?: TicketProvider
}

export interface AuctionRealtimeStatus {
  readonly connection: RealtimeConnectionState
  /** `true` solo con la conexion abierta y autenticada: el unico caso en que se puede decir «en vivo». */
  readonly live: boolean
  /**
   * Intervalo de `refetchInterval` para las consultas de la pantalla: sondeo largo mientras se
   * reconecta o la conexion fallo definitivamente; `false` si hay conexion en vivo o la funcion
   * esta apagada (en cuyo caso la pantalla se comporta exactamente como antes de EN-034).
   */
  readonly fallbackRefetchMs: number | false
}

/** Invalida UNICAMENTE lo que depende de la subasta de la senal (CA-02, CA-05). */
const invalidateForSignal = (
  queryClient: QueryClient,
  auctionId: string,
  observedAuctionId: string | null,
): void => {
  void queryClient.invalidateQueries({ queryKey: queryKeys.auction.detail(auctionId) })
  void queryClient.invalidateQueries({ queryKey: queryKeys.auction.bidHistoryAll(auctionId) })
  // Prefijo de TODAS las paginas y filtros del marketplace: se invalida, no se parchea, para no
  // mezclar combinaciones de filtros/paginas ni inventar datos imposibles (CA-05).
  void queryClient.invalidateQueries({ queryKey: queryKeys.auctions.active })

  if (auctionId === observedAuctionId) {
    // Quien fue superado recupera su reserva: el saldo que muestra el Detalle puede haber cambiado.
    void queryClient.invalidateQueries({ queryKey: queryKeys.wallet.me })
  }
}

/** Relectura de TODO lo que esta pantalla observa: reconexion o `resync` del servidor (CA-03). */
const invalidateObserved = (
  queryClient: QueryClient,
  observedAuctionId: string | null,
  marketplace: boolean,
): void => {
  if (observedAuctionId !== null) {
    invalidateForSignal(queryClient, observedAuctionId, observedAuctionId)
  }

  if (marketplace) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.auctions.active })
  }
}

/**
 * Senales realtime de Subasta (EN-034, ADR-024).
 *
 * Reutiliza la conexion compartida de `battle-rooms/realtime.ts`: ticket de un solo uso por HTTP,
 * WebSocket SIN credenciales en la URL, `auth` como primer mensaje y reconexion con backoff y un
 * ticket nuevo cada vez. Tras `authenticated` se suscribe a `auctions/{id}` (Detalle) y/o
 * `auctions` (Marketplace).
 *
 * **El socket no guarda estado de subasta.** Cada senal valida y NUEVA (por `revision`) solo
 * invalida las consultas de ESA subasta; React Query vuelve a pedir lo que este montado y lo que
 * devuelve el backend prevalece (CA-06). Una senal repetida o anterior se descarta.
 *
 * Reconexion (CA-03): al volver a autenticar tras una caida, y ante un `resync` del servidor
 * (su conexion con PostgreSQL se perdio y las senales de ese hueco no se recuperan), se relee
 * todo lo observado. Mientras no hay conexion, `live` es `false` y hay sondeo HTTP largo.
 *
 * Si Auction tiene el realtime apagado, pedir el ticket da `404`: la conexion queda `disabled`,
 * no se reintenta y la pantalla funciona por HTTP como antes.
 */
export const useAuctionRealtime = ({
  auctionId = null,
  marketplace = false,
  socketFactory = defaultSocketFactory,
  ticketProvider = issueAuctionRealtimeTicket,
}: AuctionRealtimeOptions): AuctionRealtimeStatus => {
  const queryClient = useQueryClient()
  const [state, setState] = useState<RealtimeConnectionState>('connecting')
  const observesAnything = auctionId !== null || marketplace

  useEffect(() => {
    if (!observesAnything) {
      return
    }

    const tracker = new RevisionTracker()
    const channels = [
      ...(auctionId === null ? [] : [auctionChannel(auctionId)]),
      ...(marketplace ? [MARKETPLACE_CHANNEL] : []),
    ]
    let connectedBefore = false

    const connection = openRealtimeConnection({
      socketFactory,
      ticketProvider,
      path: AUCTION_REALTIME_PATH,
      authenticatedMessageType: 'authenticated',
      isTicketUnavailable: isAuctionRealtimeUnavailable,
      onStateChange: setState,
      onAuthenticated: (send) => {
        for (const channel of channels) {
          send({ type: 'subscribe', channel })
        }

        // Reconexion: lo ocurrido mientras no hubo socket no se puede deducir, asi que se relee.
        if (connectedBefore) {
          invalidateObserved(queryClient, auctionId, marketplace)
        }

        connectedBefore = true
      },
      onMessage: (message) => {
        if (message.type === 'resync') {
          invalidateObserved(queryClient, auctionId, marketplace)
          return
        }

        if (message.type !== 'signal') {
          return
        }

        const signal = parseAuctionSignal(message.signal)

        if (signal === null || !tracker.accept(signal)) {
          return
        }

        invalidateForSignal(queryClient, signal.auctionId, auctionId)
      },
    })

    return () => {
      connection.close()
    }
  }, [auctionId, marketplace, observesAnything, queryClient, socketFactory, ticketProvider])

  const connection = observesAnything ? state : 'disabled'

  return {
    connection,
    live: connection === 'open',
    fallbackRefetchMs:
      connection === 'reconnecting' || connection === 'failed' ? REALTIME_FALLBACK_POLL_MS : false,
  }
}
