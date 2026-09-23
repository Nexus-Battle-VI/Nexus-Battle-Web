import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'

import { issueRealtimeTicket } from './battle/api'
import {
  defaultSocketFactory,
  openRealtimeConnection,
  type RealtimeConnectionState,
  type SocketFactory,
  type TicketProvider,
} from './realtime'

export type { RealtimeConnectionState }

export interface BattleRoomRealtimeStatus {
  readonly connection: RealtimeConnectionState
  /**
   * `status` del ultimo `battle-room.updated` recibido PARA LA SALA
   * VIGILADA (HU-15.3: distinguir "cancelada" de "se lleno normalmente" en
   * el lobby, ambos casos indistinguibles solo con `GET /rooms`, que excluye
   * cualquier sala que no este `WAITING_FOR_PLAYERS`). `null` mientras no
   * llega ningun evento para esta sala en esta conexion.
   */
  readonly lastRoomStatus: string | null
}

/**
 * Realtime del lobby de una sala de batalla (HU-15.3, ADR-020).
 *
 * Usa la conexion compartida de `realtime.ts`: pide un TICKET de un solo uso por
 * HTTP, abre el WebSocket sin credenciales en la URL, envia `{"type":"auth",
 * "ticket"}` como primer mensaje y, tras `auth.ok`, `{"type":"subscribe",
 * "roomId"}`. El JWT ya no viaja por el socket (HU-17 completo el esquema de
 * ADR-020).
 *
 * Al recibir `battle-room.updated` para la sala vigilada, NO se guarda un
 * segundo estado en paralelo: se invalidan las consultas reales (el listado y la
 * sala concreta) para que React Query las vuelva a pedir. El WebSocket es solo
 * el disparador del refetch, nunca la fuente de verdad.
 *
 * Reconexion con backoff exponencial acotado y limpieza completa al desmontar o
 * al cambiar de sala: la implementacion vive en `openRealtimeConnection`.
 */
export const useBattleRoomRealtime = (
  roomId: string | null,
  socketFactory: SocketFactory = defaultSocketFactory,
  ticketProvider: TicketProvider = issueRealtimeTicket,
): BattleRoomRealtimeStatus => {
  const queryClient = useQueryClient()
  const [state, setState] = useState<RealtimeConnectionState>('connecting')
  const [lastRoomStatus, setLastRoomStatus] = useState<string | null>(null)
  // Patron recomendado por React para "ajustar estado cuando cambia una prop":
  // `setState` durante el render, NUNCA dentro de un efecto. Sin esto, un
  // `lastRoomStatus` de la sala anterior sobreviviria a un cambio de `roomId`.
  const [watchedRoomId, setWatchedRoomId] = useState(roomId)

  if (roomId !== watchedRoomId) {
    setWatchedRoomId(roomId)
    setLastRoomStatus(null)
  }

  useEffect(() => {
    if (roomId === null) {
      return
    }

    const connection = openRealtimeConnection({
      socketFactory,
      ticketProvider,
      onStateChange: setState,
      onAuthenticated: (send) => {
        send({ type: 'subscribe', roomId })
      },
      onMessage: (message) => {
        if (message.type === 'battle-room.updated' && message.roomId === roomId) {
          setLastRoomStatus(message.status ?? null)
          void queryClient.invalidateQueries({ queryKey: queryKeys.battleRooms.list })
          void queryClient.invalidateQueries({ queryKey: queryKeys.battleRooms.mine })
          void queryClient.invalidateQueries({ queryKey: queryKeys.battleRooms.detail(roomId) })
        }
      },
    })

    return () => {
      connection.close()
    }
  }, [roomId, queryClient, socketFactory, ticketProvider])

  return {
    connection: roomId === null ? 'disabled' : state,
    lastRoomStatus: roomId === null ? null : lastRoomStatus,
  }
}
