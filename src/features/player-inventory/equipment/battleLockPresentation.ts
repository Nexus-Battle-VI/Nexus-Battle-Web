import { HttpError } from '@/lib/http'
import { i18n } from '@/shared/i18n/i18n'

/**
 * Presentacion del bloqueo de equipamiento en combate (HU-29).
 *
 * NO DECIDE NADA: Player/Inventory es quien bloquea (`locked` en la lectura,
 * `409 { reason: 'battle_lock' }` en el intento de cambio); esto solo
 * reconoce esa forma y elige el texto, igual que
 * `battle-rooms/presentation.ts` hace con los codigos de union a sala. El
 * backend sigue siendo la unica defensa real: esto es solo UX.
 */

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null

const reasonOf = (body: unknown): string | null => {
  const reason = asRecord(body)?.reason

  return typeof reason === 'string' ? reason : null
}

/** `true` solo para el 409 estable de HU-29 (`reason: 'battle_lock'`), nunca por el texto del mensaje. */
export const isBattleLockError = (error: unknown): boolean =>
  error instanceof HttpError && error.status === 409 && reasonOf(error.body) === 'battle_lock'

/** Mismo texto para el aviso persistente (`locked: true`) y para el 409 de carrera. */
export const battleLockMessage = (): string => i18n.t('inventory:equipment.battleLock.message')
