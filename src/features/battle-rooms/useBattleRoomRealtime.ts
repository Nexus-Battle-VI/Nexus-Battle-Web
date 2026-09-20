import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'
import { currentAccessToken } from '@/shared/session'

import {
  buildRealtimeUrl,
  defaultSocketFactory,
  parseRealtimeMessage,
  type SocketFactory,
} from './realtime'

export type RealtimeConnectionState = 'connecting' | 'open' | 'reconnecting' | 'disabled'

const RECONNECT_BASE_MS = 1_000
const RECONNECT_MAX_MS = 10_000

/**
 * Realtime de una sala de batalla (HU-15.3, D — protocolo de ADR-020).
 *
 * Se conecta al WebSocket nativo de Combat, envia `{"type":"auth","token"}`
 * como primer mensaje (dentro de los 5s que exige el servidor) y, tras eso,
 * `{"type":"subscribe","roomId"}`. El protocolo documentado no describe un
 * mensaje explicito de "auth confirmada" antes del `subscribe` — se envian
 * ambos seguidos apenas el socket abre, que es la lectura mas simple
 * compatible con lo documentado; si Combat en el futuro exige esperar un ack
 * de `auth`, este es el unico punto que cambiaria.
 *
 * Al recibir `battle-room.updated` para la sala vigilada, NO se guarda un
 * segundo estado en paralelo: se invalida la unica query real
 * (`queryKeys.battleRooms.list`) para que React Query la vuelva a pedir. El
 * WebSocket es solo el disparador del refetch, nunca la fuente de verdad.
 *
 * Reconexion con backoff exponencial acotado (1s, 2s, 4s... hasta 10s) en
 * vez de un bucle agresivo, y limpieza completa (temporizador + socket) al
 * desmontar o al cambiar de sala — sin eso, cada cambio de pantalla dejaria
 * una conexion colgada.
 */
export const useBattleRoomRealtime = (
  roomId: string | null,
  socketFactory: SocketFactory = defaultSocketFactory,
): RealtimeConnectionState => {
  const queryClient = useQueryClient()
  // `roomId === null` se deriva al final del hook, sin guardarlo en el
  // estado: evita un `setState` sincrono al inicio del efecto solo para
  // reflejar algo que ya se puede calcular directamente de la prop.
  const [state, setState] = useState<RealtimeConnectionState>('connecting')

  useEffect(() => {
    if (roomId === null) {
      return
    }

    let cancelled = false
    let socket: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let attempt = 0

    const connect = (): void => {
      if (cancelled) {
        return
      }

      const token = currentAccessToken()

      if (token === null) {
        // Sin testimonio vigente no tiene sentido intentar autenticar: se
        // deja de intentar en vez de reconectar indefinidamente sin poder
        // completar el primer mensaje del protocolo.
        setState('disabled')
        return
      }

      setState(attempt === 0 ? 'connecting' : 'reconnecting')

      const ws = socketFactory(buildRealtimeUrl())
      socket = ws

      ws.addEventListener('open', () => {
        if (cancelled) {
          return
        }

        ws.send(JSON.stringify({ type: 'auth', token }))
        ws.send(JSON.stringify({ type: 'subscribe', roomId }))
        attempt = 0
        setState('open')
      })

      ws.addEventListener('message', (event: MessageEvent) => {
        if (cancelled) {
          return
        }

        const message = parseRealtimeMessage(event.data)

        if (message?.type === 'battle-room.updated' && message.roomId === roomId) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.battleRooms.list })
        }
      })

      ws.addEventListener('close', () => {
        socket = null

        if (!cancelled) {
          setState('reconnecting')
          const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS)
          attempt += 1
          reconnectTimer = setTimeout(connect, delay)
        }
      })

      ws.addEventListener('error', () => {
        // El propio `close` que sigue a un `error` ya dispara la
        // reconexion; aqui solo se evita dejar el socket a medio abrir.
        ws.close()
      })
    }

    connect()

    return () => {
      cancelled = true

      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer)
      }

      socket?.close()
    }
  }, [roomId, queryClient, socketFactory])

  return roomId === null ? 'disabled' : state
}
