/**
 * Protocolo del chat de Jugar Online (HU-13, RF-13) sobre el WebSocket de
 * Combat (ADR-020). Contrato: `docs/contracts/hu-13-chat-v1.md` en
 * Nexus-Battle-Infrastructure.
 *
 * Este modulo solo sabe de mensajes: construir los del cliente y analizar los
 * del servidor. Un mensaje del servidor que no cumple la forma exacta se
 * DESCARTA (`null`), nunca se aplica a medias: el servidor es la autoridad y
 * un cuerpo inesperado no debe corromper el estado de la pantalla.
 */

export type ChatChannel =
  { readonly kind: 'lobby' } | { readonly kind: 'room'; readonly roomId: string }

export const LOBBY_CHANNEL: ChatChannel = { kind: 'lobby' }

/** Clave estable del canal: `lobby` o `room:<uuid>`. */
export const channelKey = (channel: ChatChannel): string =>
  channel.kind === 'lobby' ? 'lobby' : `room:${channel.roomId}`

/** Inversa de `channelKey`. Solo recibe claves que la propia aplicacion produjo. */
export const channelFromKey = (key: string): ChatChannel =>
  key.startsWith('room:') ? { kind: 'room', roomId: key.slice('room:'.length) } : LOBBY_CHANNEL

export interface ChatMessage {
  readonly messageId: string
  readonly seq: number
  /** UUID generado por el cliente que lo envio: sirve para reconocer los mensajes propios. */
  readonly commandId: string
  readonly senderName: string
  /** Texto plano. NUNCA se interpreta como HTML. */
  readonly text: string
  /** Hora del servidor (ISO 8601). */
  readonly sentAt: string
}

export type ServerFrame =
  | {
      readonly type: 'chat.subscribed'
      readonly channel: ChatChannel
      readonly upTo: number
      readonly truncated: boolean
      readonly messages: readonly ChatMessage[]
    }
  | { readonly type: 'chat.message'; readonly channel: ChatChannel; readonly message: ChatMessage }
  | {
      readonly type: 'chat.accepted'
      readonly commandId: string
      readonly seq: number
      readonly messageId: string
      readonly duplicate: boolean
    }
  | { readonly type: 'chat.unsubscribed'; readonly channel: ChatChannel; readonly reason: string }
  | {
      readonly type: 'command.rejected'
      readonly command: string
      readonly commandId: string | null
      readonly code: string
      readonly retryAfterMs: number | null
      readonly maxLength: number | null
    }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isSeq = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 1

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null

const parseChannel = (source: Record<string, unknown>): ChatChannel | null => {
  if (source.channel === 'lobby') {
    return LOBBY_CHANNEL
  }

  if (source.channel === 'room') {
    const roomId = asString(source.roomId)

    return roomId === null ? null : { kind: 'room', roomId }
  }

  return null
}

const parseMessage = (value: unknown): ChatMessage | null => {
  if (!isRecord(value) || !isRecord(value.sender)) {
    return null
  }

  const messageId = asString(value.messageId)
  const commandId = asString(value.commandId)
  const senderName = asString(value.sender.displayName)
  const sentAt = asString(value.sentAt)

  if (
    messageId === null ||
    commandId === null ||
    senderName === null ||
    sentAt === null ||
    !isSeq(value.seq) ||
    typeof value.text !== 'string'
  ) {
    return null
  }

  return { messageId, seq: value.seq, commandId, senderName, text: value.text, sentAt }
}

/**
 * Valida un mensaje del servidor ya leido como JSON. `null` si no tiene la forma
 * del contrato de chat. `auth.ok` NO es un mensaje de chat: lo consume la conexion
 * compartida (`openRealtimeConnection`) antes de que nada llegue aqui.
 */
export const validateServerFrame = (parsed: unknown): ServerFrame | null => {
  if (!isRecord(parsed) || typeof parsed.type !== 'string') {
    return null
  }

  switch (parsed.type) {
    case 'chat.subscribed': {
      const channel = parseChannel(parsed)

      if (
        channel === null ||
        !isCount(parsed.upTo) ||
        typeof parsed.truncated !== 'boolean' ||
        !Array.isArray(parsed.messages)
      ) {
        return null
      }

      const messages: ChatMessage[] = []

      for (const candidate of parsed.messages as unknown[]) {
        const message = parseMessage(candidate)

        // Un historial con un elemento invalido se descarta ENTERO: aplicar la
        // mitad dejaria un hueco que el cliente no sabria que existe.
        if (message === null) {
          return null
        }

        messages.push(message)
      }

      return {
        type: 'chat.subscribed',
        channel,
        upTo: parsed.upTo,
        truncated: parsed.truncated,
        messages,
      }
    }

    case 'chat.message': {
      const channel = parseChannel(parsed)
      const message = parseMessage(parsed)

      return channel === null || message === null
        ? null
        : { type: 'chat.message', channel, message }
    }

    case 'chat.accepted': {
      const commandId = asString(parsed.commandId)
      const messageId = asString(parsed.messageId)

      if (
        commandId === null ||
        messageId === null ||
        !isSeq(parsed.seq) ||
        typeof parsed.duplicate !== 'boolean'
      ) {
        return null
      }

      return {
        type: 'chat.accepted',
        commandId,
        seq: parsed.seq,
        messageId,
        duplicate: parsed.duplicate,
      }
    }

    case 'chat.unsubscribed': {
      const channel = parseChannel(parsed)
      const reason = asString(parsed.reason)

      return channel === null || reason === null
        ? null
        : { type: 'chat.unsubscribed', channel, reason }
    }

    case 'command.rejected': {
      const command = asString(parsed.command)
      const code = asString(parsed.code)

      if (command === null || code === null) {
        return null
      }

      return {
        type: 'command.rejected',
        command,
        commandId: asString(parsed.commandId),
        code,
        retryAfterMs: isCount(parsed.retryAfterMs) ? parsed.retryAfterMs : null,
        maxLength: isCount(parsed.maxLength) ? parsed.maxLength : null,
      }
    }

    default:
      return null
  }
}

/** Analiza un mensaje del servidor. `null` si no es JSON o no tiene la forma del contrato. */
export const parseServerFrame = (raw: unknown): ServerFrame | null => {
  if (typeof raw !== 'string') {
    return null
  }

  try {
    return validateServerFrame(JSON.parse(raw))
  } catch {
    return null
  }
}

const channelFields = (channel: ChatChannel): Record<string, string> =>
  channel.kind === 'lobby' ? { channel: 'lobby' } : { channel: 'room', roomId: channel.roomId }

/**
 * Mensajes del cliente. Son OBJETOS: la conexion compartida (`onAuthenticated`)
 * los serializa. El primer mensaje del socket (`auth` con el ticket) lo envia ella;
 * el chat nunca maneja credenciales.
 */

/** `lastSeq` solo se envia si el cliente ya aplico algun mensaje del canal. */
export const subscribeFrame = (channel: ChatChannel, lastSeq: number): Record<string, unknown> => ({
  type: 'chat.subscribe',
  ...channelFields(channel),
  ...(lastSeq > 0 ? { lastSeq } : {}),
})

export const sendFrame = (
  channel: ChatChannel,
  commandId: string,
  text: string,
): Record<string, unknown> => ({ type: 'chat.send', ...channelFields(channel), commandId, text })

export const unsubscribeFrame = (channel: ChatChannel): Record<string, unknown> => ({
  type: 'chat.unsubscribe',
  ...channelFields(channel),
})
