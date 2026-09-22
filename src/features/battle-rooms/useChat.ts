import { useEffect, useMemo, useSyncExternalStore } from 'react'

import type { SocketFactory, TicketProvider } from './realtime'

import { ChatSession, type ChatSnapshot, type SendOutcome } from './ChatSession'
import { channelFromKey, channelKey, type ChatChannel } from './chatProtocol'

export interface UseChatResult extends ChatSnapshot {
  readonly send: (text: string) => SendOutcome
  readonly retry: (commandId: string) => void
  readonly dismiss: (commandId: string) => void
}

const randomCommandId = (): string => globalThis.crypto.randomUUID()

export interface UseChatOptions {
  /**
   * Solo para pruebas y vistas previas; los tres deben ser estables entre renders
   * (una funcion nueva en cada render reabriria la conexion). Sustituyen el
   * WebSocket real, el `POST /v1/combat/realtime/tickets` y la comprobacion de
   * que hay sesion.
   */
  readonly socketFactory?: SocketFactory
  readonly ticketProvider?: TicketProvider
  readonly hasSession?: () => boolean
}

/**
 * Chat de un canal (HU-13, RF-13): abre una sesion mientras el componente esta
 * montado y la cierra al desmontarlo o al cambiar de canal.
 *
 * La sesion se identifica por la CLAVE del canal, no por el objeto: pasar un
 * `{ kind: 'lobby' }` nuevo en cada render no reabre la conexion.
 */
export const useChat = (channel: ChatChannel, options: UseChatOptions = {}): UseChatResult => {
  const key = channelKey(channel)
  const { socketFactory, ticketProvider, hasSession } = options

  const session = useMemo(
    () =>
      new ChatSession({
        channel: channelFromKey(key),
        newCommandId: randomCommandId,
        ...(socketFactory === undefined ? {} : { socketFactory }),
        ...(ticketProvider === undefined ? {} : { ticketProvider }),
        ...(hasSession === undefined ? {} : { hasSession }),
      }),
    [key, socketFactory, ticketProvider, hasSession],
  )

  useEffect(() => {
    session.start()

    return () => {
      session.stop()
    }
  }, [session])

  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot)

  return { ...snapshot, send: session.send, retry: session.retry, dismiss: session.dismiss }
}
