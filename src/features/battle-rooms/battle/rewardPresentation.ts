import type { RewardDeliveryState, RewardProduct } from './api'
import { i18n } from '@/shared/i18n/i18n'

/**
 * Textos y numeros del panel de recompensa (HU-22). Modulo PURO: recibe lo
 * que ya publicaron Wallet/Combat y solo decide como contarlo -- no calcula
 * saldo, no calcula progreso, no decide si corresponde cofre (HU-22 S93: "NO
 * OPTIMISTIC ECONOMY").
 */

/** Fraccion 0..1 para la barra de progreso. Nunca supera 1 aunque el ultimo credito cruce el umbral. */
export const chestProgressFraction = (progress: number, threshold: number): number => {
  if (threshold <= 0) {
    return 0
  }

  const fraction = progress / threshold

  if (fraction < 0) {
    return 0
  }

  if (fraction > 1) {
    return 1
  }

  return fraction
}

export const chestProgressText = (progress: number, threshold: number): string =>
  `${String(progress)} / ${String(threshold)}`

export const weeklyLimitText = (count: number, limit: number): string =>
  `${String(count)} / ${String(limit)}`

export const weeklyLimitReached = (count: number, limit: number): boolean => count >= limit

export interface DeliveryPresentation {
  readonly headline: string
  readonly detail: string | null
}

/**
 * `rewardDelivery` es la UNICA fuente de si ya se puede decir "entregado":
 * `PENDING` nunca se muestra como confirmado (HU-22 S88/S9), y `NONE` no
 * insinua un cofre que no existe. `FAILED` (terminal, Combat nunca reintenta
 * solo un `TERMINAL_FAILURE`) tampoco dice "entregado" NI sigue insinuando un
 * "procesando" que ya no va a resolverse -- `balance` distingue si el fallo
 * fue ANTES de confirmar el credito (nunca se acredito) o DESPUES (el
 * credito quedo firme, solo la entrega del cofre fallo).
 */
export const describeDelivery = (
  delivery: RewardDeliveryState,
  reward: RewardProduct | null,
  balance: number | null,
): DeliveryPresentation | null => {
  if (delivery === 'NONE') {
    return null
  }

  if (delivery === 'PENDING') {
    return {
      headline: i18n.t('battle:reward.chest'),
      detail:
        reward === null
          ? i18n.t('battle:reward.pendingSelecting')
          : i18n.t('battle:reward.pendingDelivering', { reward: reward.name }),
    }
  }

  if (delivery === 'FAILED') {
    return balance === null
      ? {
          headline: i18n.t('battle:reward.failed'),
          detail: i18n.t('battle:reward.failedDetail'),
        }
      : {
          headline: i18n.t('battle:reward.incomplete'),
          detail: i18n.t('battle:reward.incompleteDetail'),
        }
  }

  // CONFIRMED: reward siempre no-nulo en este estado (el contrato lo garantiza).
  return {
    headline: i18n.t('battle:reward.chest'),
    detail: reward === null ? null : i18n.t('battle:reward.added', { reward: reward.name }),
  }
}
