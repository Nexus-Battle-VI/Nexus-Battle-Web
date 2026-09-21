import { useEffect, useMemo, useSyncExternalStore } from 'react'

import { buildRealtimeUrl, type SocketFactory } from '@/features/battle-rooms/realtime'
import { currentAccessToken } from '@/shared/session'

import { ChatSession, type ChatSnapshot, type SendOutcome } from './ChatSession'
import { channelFromKey, channelKey, type ChatChannel } from './protocol'

export interface UseChatResult extends ChatSnapshot {
  readonly send: (text: string) => SendOutcome
  readonly retry: (commandId: string) => void
  readonly dismiss: (commandId: string) => void
}

const randomCommandId = (): string => globalThis.crypto.randomUUID()

export interface UseChatOptions {
  /** Solo para pruebas y vistas previas: sustituye el WebSocket real. Debe ser estable entre renders. */
  readonly socketFactory?: SocketFactory
  /**
   * Solo para pruebas y vistas previas: sustituye el testimonio de la sesion.
   * Debe ser estable entre renders: una funcion nueva en cada render reabriria la conexion.
   */
  readonly getToken?: () => string | null
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
  const { socketFactory, getToken = currentAccessToken } = options

  const session = useMemo(
    () =>
      new ChatSession({
        channel: channelFromKey(key),
        url: buildRealtimeUrl(),
        getToken,
        newCommandId: randomCommandId,
        ...(socketFactory === undefined ? {} : { socketFactory }),
      }),
    [key, socketFactory, getToken],
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
