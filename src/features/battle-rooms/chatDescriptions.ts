import type { ChatFailure } from './chatState'

/**
 * Textos del chat para la persona (HU-13). Los codigos del servidor son el
 * contrato (`docs/contracts/hu-13-chat-v1.md`); esto solo los traduce.
 */

/**
 * Pista para el campo de texto. **No es la regla**: el limite autoritativo es el
 * del servidor (`CHAT_MAX_MESSAGE_LENGTH`, 500 puntos de codigo por defecto) y
 * puede cambiar sin tocar Web. `maxLength` de un campo cuenta unidades UTF-16,
 * que nunca son menos que los puntos de codigo: este tope jamas deja pasar mas
 * de lo que el servidor admite.
 */
export const CHAT_MAX_LENGTH_HINT = 500

const seconds = (ms: number): number => Math.max(1, Math.ceil(ms / 1000))

export const describeChatFailure = (failure: ChatFailure): string => {
  switch (failure.code) {
    case 'EMPTY_MESSAGE':
      return 'El mensaje está vacío.'
    case 'MESSAGE_TOO_LONG':
      return failure.maxLength === null
        ? 'El mensaje es demasiado largo.'
        : `El mensaje supera los ${String(failure.maxLength)} caracteres.`
    case 'INVALID_CHARACTERS':
      return 'El mensaje contiene caracteres que no se admiten.'
    case 'RATE_LIMITED':
      return failure.retryAfterMs === null
        ? 'Estás escribiendo demasiado rápido.'
        : `Estás escribiendo demasiado rápido. Inténtalo de nuevo en ${String(seconds(failure.retryAfterMs))} s.`
    case 'NOT_A_PARTICIPANT':
    case 'ROOM_NOT_ACTIVE':
    case 'ROOM_NOT_FOUND':
      return 'Ya no tienes acceso al chat de esta sala.'
    case 'NOT_SUBSCRIBED':
      return 'Todavía no estás conectado al chat.'
    case 'ACCOUNT_PROFILE_NOT_FOUND':
      return 'Necesitas completar tu cuenta para escribir en el chat.'
    case 'CHAT_UNAVAILABLE':
      return 'El chat no está disponible en este momento. Inténtalo de nuevo.'
    default:
      return 'No se pudo enviar el mensaje.'
  }
}

/** Por que la persona ya no ve el canal. */
export const describeClosedReason = (reason: string): string => {
  switch (reason) {
    case 'NOT_A_PARTICIPANT':
    case 'ROOM_NOT_FOUND':
      return 'No eres participante de esta sala, así que no puedes ver su chat.'
    case 'ROOM_NOT_ACTIVE':
      return 'La sala ya no está activa: su chat está cerrado.'
    case 'ACCOUNT_PROFILE_NOT_FOUND':
      return 'Necesitas completar tu cuenta para usar el chat.'
    default:
      return 'El chat no está disponible en este momento.'
  }
}
