import { useEffect, useReducer, useRef, useState } from 'react'

import {
  defaultSocketFactory,
  openRealtimeConnection,
  type RealtimeConnectionState,
  type SocketFactory,
  type TicketProvider,
} from '../realtime'
import { issueRealtimeTicket } from './api'
import { battleReducer, initialBattleState, type BattleClientState } from './battleReducer'
import {
  isBattleEventMessage,
  isCommandRejectedMessage,
  isResumeOkMessage,
  isSnapshotMessage,
} from './types'

export interface BattleRealtime extends BattleClientState {
  readonly connection: RealtimeConnectionState
  /**
   * Codigo estable de un `command.rejected` (p. ej. `NOT_A_PARTICIPANT`,
   * `ROOM_NOT_FOUND`), o `null`. Mientras no sea `null` la batalla no es accesible.
   */
  readonly rejected: string | null
}

/**
 * Batalla en tiempo real (HU-17, ADR-020).
 *
 * Abre la conexion compartida (ticket -> `auth` -> `auth.ok`) y envia
 * `{"type":"resume","roomId","lastSeq"?}`:
 *
 *  - PRIMERA conexion de la pantalla: sin `lastSeq` -> el servidor responde con un
 *    `snapshot` completo del estado visible.
 *  - RECONEXION dentro de la misma pantalla: con el `lastSeq` en memoria -> el
 *    servidor reenvia en orden solo los eventos que faltan (o un `snapshot`).
 *
 * Solo se guarda en memoria `roomId` y `lastSeq`: nunca se persiste el estado
 * autoritativo en el navegador (un `lastSeq` viejo sin la vista correspondiente
 * dejaria la pantalla sin estado tras recargar; el `snapshot` es lo correcto).
 * Web NO tiene semilla ni estado del generador: no existen en el contrato.
 *
 * Los eventos se aplican por `seq` con `battleReducer`: duplicados y viejos se
 * ignoran; un salto de `seq` pide `resume` por el mismo socket, sin inventar los
 * mensajes perdidos. Mientras la conexion esta caida se conserva lo ultimo que dijo
 * el servidor y no se calcula ningun resultado local.
 */
export const useBattleRealtime = (
  roomId: string | null,
  socketFactory: SocketFactory = defaultSocketFactory,
  ticketProvider: TicketProvider = issueRealtimeTicket,
): BattleRealtime => {
  const [state, dispatch] = useReducer(battleReducer, initialBattleState)
  const [connection, setConnection] = useState<RealtimeConnectionState>('connecting')
  const [rejected, setRejected] = useState<string | null>(null)
  const lastSeqRef = useRef(0)
  const sendRef = useRef<((payload: unknown) => void) | null>(null)

  useEffect(() => {
    lastSeqRef.current = state.lastSeq
  }, [state.lastSeq])

  useEffect(() => {
    if (roomId === null) {
      return
    }

    const link = openRealtimeConnection({
      socketFactory,
      ticketProvider,
      onStateChange: (next) => {
        setConnection(next)

        if (next !== 'open') {
          sendRef.current = null
        }
      },
      onAuthenticated: (send) => {
        sendRef.current = send
        send(
          lastSeqRef.current > 0
            ? { type: 'resume', roomId, lastSeq: lastSeqRef.current }
            : { type: 'resume', roomId },
        )
      },
      onConnectionLost: () => {
        sendRef.current = null
        dispatch({ type: 'connectionLost' })
      },
      onMessage: (message) => {
        if (isSnapshotMessage(message)) {
          if (message.roomId === roomId) {
            dispatch({ type: 'snapshot', message })
          }
        } else if (isBattleEventMessage(message)) {
          if (message.roomId === roomId) {
            dispatch({ type: 'event', message })
          }
        } else if (isResumeOkMessage(message)) {
          if (message.roomId === roomId) {
            dispatch({ type: 'synced' })
          }
        } else if (isCommandRejectedMessage(message)) {
          setRejected(message.code)
        }
      },
    })

    return () => {
      link.close()
      sendRef.current = null
    }
  }, [roomId, socketFactory, ticketProvider])

  // Un salto de `seq` (mensajes perdidos) se recupera con `resume` por el mismo
  // socket; nunca reconstruyendo el estado localmente.
  useEffect(() => {
    if (state.needsResync && roomId !== null && sendRef.current !== null) {
      sendRef.current({ type: 'resume', roomId, lastSeq: state.lastSeq })
      dispatch({ type: 'resyncRequested' })
    }
  }, [state.needsResync, state.lastSeq, roomId])

  return {
    ...state,
    connection: roomId === null ? 'disabled' : connection,
    rejected,
  }
}
