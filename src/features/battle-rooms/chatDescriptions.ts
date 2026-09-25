import type { ChatFailure } from './chatState'
import { i18n } from '@/shared/i18n/i18n'

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
      return i18n.t('battle:chat.errors.EMPTY_MESSAGE')
    case 'MESSAGE_TOO_LONG':
      return failure.maxLength === null
        ? i18n.t('battle:chat.errors.tooLong')
        : i18n.t('battle:chat.errors.tooLongMax', { max: String(failure.maxLength) })
    case 'INVALID_CHARACTERS':
      return i18n.t('battle:chat.errors.INVALID_CHARACTERS')
    case 'RATE_LIMITED':
      return failure.retryAfterMs === null
        ? i18n.t('battle:chat.errors.rateLimited')
        : i18n.t('battle:chat.errors.rateLimitedRetry', {
            seconds: String(seconds(failure.retryAfterMs)),
          })
    case 'NOT_A_PARTICIPANT':
    case 'ROOM_NOT_ACTIVE':
    case 'ROOM_NOT_FOUND':
      return i18n.t('battle:chat.errors.noAccess')
    case 'NOT_SUBSCRIBED':
      return i18n.t('battle:chat.errors.NOT_SUBSCRIBED')
    case 'ACCOUNT_PROFILE_NOT_FOUND':
      return i18n.t('battle:chat.errors.ACCOUNT_PROFILE_NOT_FOUND')
    case 'CHAT_UNAVAILABLE':
      return i18n.t('battle:chat.errors.CHAT_UNAVAILABLE')
    default:
      return i18n.t('battle:chat.sendFailed')
  }
}

/** Por que la persona ya no ve el canal. */
export const describeClosedReason = (reason: string): string => {
  switch (reason) {
    case 'NOT_A_PARTICIPANT':
    case 'ROOM_NOT_FOUND':
      return i18n.t('battle:chat.closed.notParticipant')
    case 'ROOM_NOT_ACTIVE':
      return i18n.t('battle:chat.closed.ROOM_NOT_ACTIVE')
    case 'ACCOUNT_PROFILE_NOT_FOUND':
      return i18n.t('battle:chat.closed.ACCOUNT_PROFILE_NOT_FOUND')
    default:
      return i18n.t('battle:chat.closed.default')
  }
}
