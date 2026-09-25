import type { BattleRoom, ParticipantStake, ParticipantStakeStatus } from '../types'
import { i18n } from '@/shared/i18n/i18n'
import { formatInteger } from '@/shared/i18n/format'

/**
 * Textos de la apuesta de HU-23. Modulo PURO: recibe lo que Combat/Wallet ya
 * decidieron y solo decide como contarlo.
 *
 * Web NUNCA calcula el pozo, no decide quien gana la apuesta, no resta ni suma
 * saldo y no inventa un estado: si un valor no vino del servidor se muestra
 * como pendiente, nunca como un hecho (mismo criterio que
 * `rewardDelivery: 'PENDING'` de HU-22).
 */

/** Texto del estado de una apuesta, en primera persona y sin prometer nada antes de tiempo. */
export const describeStakeStatus = (status: ParticipantStakeStatus): string => {
  switch (status) {
    case 'PENDING_RESERVE':
    case 'ACTIVE':
    case 'RESERVE_FAILED':
    case 'RELEASED':
    case 'CAPTURED':
    case 'SETTLED_WON':
      return i18n.t(`battle:stake.status.${status}`)
  }
}

export const creditAmountText = (amount: number): string =>
  i18n.t('common:count.credits', { count: amount, value: formatInteger(amount) })

/**
 * Frase completa de la apuesta propia, con el monto que publico el servidor.
 * `null` si no hay apuesta propia que contar (sin apuesta o de un rival).
 * Nunca adelanta un resultado: cada texto corresponde al estado que Combat ya
 * persistio.
 */
export const describeOwnStake = (stake: ParticipantStake | undefined): string | null => {
  if (stake === undefined) {
    return null
  }

  const amount = creditAmountText(stake.amount)

  switch (stake.status) {
    case 'PENDING_RESERVE':
    case 'ACTIVE':
    case 'RESERVE_FAILED':
    case 'RELEASED':
    case 'CAPTURED':
    case 'SETTLED_WON':
      return i18n.t(`battle:stake.own.${stake.status}`, { amount })
  }
}

/**
 * La apuesta del PROPIO jugador dentro de una sala, o `undefined` si no
 * aposto (o si no hay sala/sesion). Solo puede leerla de un participante
 * propio: Combat no expone la de los rivales.
 */
export const ownStakeOf = (
  room: BattleRoom | null,
  subject: string | null,
): ParticipantStake | undefined => {
  if (subject === null || room === null) {
    return undefined
  }

  for (const team of room.teams) {
    for (const participant of team.participants) {
      if (participant.playerId === subject) {
        return participant.stake
      }
    }
  }

  return undefined
}

export interface ParsedStakeInput {
  /** `null` = no apostar (vacio o `0`). */
  readonly amount: number | null
  /** Mensaje para la persona cuando lo escrito no es un monto valido. */
  readonly error: string | null
}

/**
 * Interpreta lo que la persona escribio en el campo de apuesta. Un monto
 * invalido NO se envia nunca: se avisa y no se apuesta. La validacion
 * autoritativa del saldo sigue siendo de Wallet (D5).
 */
export const parseStakeInput = (raw: string): ParsedStakeInput => {
  const trimmed = raw.trim()

  if (trimmed === '') {
    return { amount: null, error: null }
  }

  const parsed = Number(trimmed)

  if (!Number.isInteger(parsed) || parsed < 0) {
    return {
      amount: null,
      error: i18n.t('battle:stake.invalid'),
    }
  }

  return parsed === 0 ? { amount: null, error: null } : { amount: parsed, error: null }
}

/**
 * Aviso (no bloqueante) cuando el monto supera el disponible que publico
 * Wallet. El backend decide de verdad; esto solo evita que la interfaz
 * sugiera un monto imposible.
 */
export const availableWarning = (amount: number, available: number | undefined): string | null => {
  if (available === undefined || amount <= available) {
    return null
  }

  return i18n.t('battle:stake.available', { amount: creditAmountText(available) })
}

/** Texto del paso de confirmacion antes de reservar (D8: la reserva es sincrona). */
export const describeStakeReservation = (amount: number): string =>
  i18n.t('battle:stake.reservation', { amount: creditAmountText(amount) })

/**
 * La sala ya tiene apuestas activas segun el resumen agregado (contrato §10:
 * solo el total, nunca el monto de un rival). Ausente en un Combat anterior a
 * HU-23: se trata como "sin apuestas".
 */
export const roomHasStakes = (room: BattleRoom): boolean => (room.stakePool?.total ?? 0) > 0
