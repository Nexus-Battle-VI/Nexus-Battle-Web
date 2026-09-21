import type { ChatMessage, ServerFrame } from './chatProtocol'

/**
 * Estado del chat de un canal y su reductor (HU-13, RF-13). Es logica pura:
 * no conoce sockets, temporizadores ni React, y por eso se prueba sin ninguno.
 *
 * Reglas del contrato que aplica (`docs/contracts/hu-13-chat-v1.md`, seccion 4):
 *
 * - Solo se aplica un `seq` MAYOR que el ultimo aplicado; uno repetido o
 *   anterior se ignora (sin duplicados visibles).
 * - Un SALTO (`seq` > ultimo + 1) puede ser un hueco inocuo o una perdida: ese
 *   mensaje NO se aplica y se pide de nuevo el historial (`resync`). La
 *   respuesta trae lo que exista y `upTo` cierra la duda.
 * - `chat.subscribed` deja al cliente AL DIA hasta `upTo`: un `seq` menor o
 *   igual que no llego es porque no existe.
 * - Un comando propio sin `chat.accepted` sigue «pendiente» y se reenvia con el
 *   MISMO `commandId` al reconectar: el servidor deduplica.
 */

/** Cuantos mensajes se conservan en pantalla: acota la memoria de una sesion larga. */
export const MAX_KEPT_MESSAGES = 300

export interface ChatFailure {
  readonly code: string
  readonly retryAfterMs: number | null
  readonly maxLength: number | null
}

export interface PendingMessage {
  readonly commandId: string
  readonly text: string
  readonly status: 'sending' | 'failed'
  readonly failure: ChatFailure | null
}

export interface ChatState {
  readonly messages: readonly ChatMessage[]
  /** Ultimo `seq` aplicado o cubierto por `upTo`. */
  readonly lastSeq: number
  /** Habia mas mensajes de los que caben en el historial. */
  readonly truncated: boolean
  readonly pending: readonly PendingMessage[]
  /** `commandId` de lo enviado por ESTA sesion: para marcar los mensajes propios. */
  readonly mine: ReadonlySet<string>
  /** El servidor pidio salir del canal (perdio el acceso) o rechazo la suscripcion. */
  readonly closedReason: string | null
  /** Se detecto un salto de `seq`: hay que volver a pedir el historial. */
  readonly resync: boolean
}

export const initialChatState: ChatState = {
  messages: [],
  lastSeq: 0,
  truncated: false,
  pending: [],
  mine: new Set(),
  closedReason: null,
  resync: false,
}

export type ChatAction =
  | { readonly type: 'frame'; readonly frame: ServerFrame }
  | { readonly type: 'local.send'; readonly commandId: string; readonly text: string }
  | { readonly type: 'local.retry'; readonly commandId: string }
  | { readonly type: 'local.dismiss'; readonly commandId: string }

/** Codigos de `command.rejected` que significan «ya no tienes acceso a este canal». */
const ACCESS_LOST_CODES: ReadonlySet<string> = new Set([
  'NOT_A_PARTICIPANT',
  'ROOM_NOT_ACTIVE',
  'ROOM_NOT_FOUND',
])

const keepLast = (messages: readonly ChatMessage[]): readonly ChatMessage[] =>
  messages.length > MAX_KEPT_MESSAGES
    ? messages.slice(messages.length - MAX_KEPT_MESSAGES)
    : messages

const withoutPending = (
  pending: readonly PendingMessage[],
  commandIds: ReadonlySet<string>,
): readonly PendingMessage[] => pending.filter((item) => !commandIds.has(item.commandId))

export const reduceChat = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'local.send':
      return {
        ...state,
        pending: [
          ...state.pending,
          { commandId: action.commandId, text: action.text, status: 'sending', failure: null },
        ],
        mine: new Set([...state.mine, action.commandId]),
      }

    case 'local.retry':
      return {
        ...state,
        pending: state.pending.map((item) =>
          item.commandId === action.commandId
            ? { ...item, status: 'sending', failure: null }
            : item,
        ),
      }

    case 'local.dismiss':
      return { ...state, pending: withoutPending(state.pending, new Set([action.commandId])) }

    case 'frame':
      return reduceFrame(state, action.frame)
  }
}

const reduceFrame = (state: ChatState, frame: ServerFrame): ChatState => {
  switch (frame.type) {
    case 'chat.subscribed': {
      const fresh = frame.messages
        .filter((message) => message.seq > state.lastSeq)
        .sort((a, b) => a.seq - b.seq)
      const delivered = new Set(frame.messages.map((message) => message.commandId))

      return {
        ...state,
        messages: keepLast([...state.messages, ...fresh]),
        // «Al dia hasta upTo»: nunca retrocede.
        lastSeq: Math.max(state.lastSeq, frame.upTo),
        truncated: frame.truncated,
        pending: withoutPending(state.pending, delivered),
        closedReason: null,
        resync: false,
      }
    }

    case 'chat.message': {
      const { message } = frame

      if (message.seq <= state.lastSeq) {
        return state
      }

      if (message.seq > state.lastSeq + 1) {
        // Salto: no se aplica; se pide el historial y llegara en orden.
        return state.resync ? state : { ...state, resync: true }
      }

      return {
        ...state,
        messages: keepLast([...state.messages, message]),
        lastSeq: message.seq,
        pending: withoutPending(state.pending, new Set([message.commandId])),
      }
    }

    case 'chat.accepted':
      return { ...state, pending: withoutPending(state.pending, new Set([frame.commandId])) }

    case 'chat.unsubscribed': {
      if (frame.reason === 'REQUESTED') {
        return state
      }

      return {
        ...state,
        closedReason: frame.reason,
        // Lo que estaba en vuelo ya no puede entregarse: se declara fallido, no se pierde en silencio.
        pending: state.pending.map((item) => ({
          ...item,
          status: 'failed',
          failure: { code: frame.reason, retryAfterMs: null, maxLength: null },
        })),
      }
    }

    case 'command.rejected': {
      if (frame.commandId !== null) {
        const failure: ChatFailure = {
          code: frame.code,
          retryAfterMs: frame.retryAfterMs,
          maxLength: frame.maxLength,
        }

        return {
          ...state,
          pending: state.pending.map((item) =>
            item.commandId === frame.commandId ? { ...item, status: 'failed', failure } : item,
          ),
          closedReason: ACCESS_LOST_CODES.has(frame.code) ? frame.code : state.closedReason,
        }
      }

      // Rechazo sin comando asociado (una suscripcion): el canal no esta disponible.
      return { ...state, closedReason: frame.code }
    }
  }
}
