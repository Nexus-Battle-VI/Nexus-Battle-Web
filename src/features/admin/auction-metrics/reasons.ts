import type { TFunction } from 'i18next'

/**
 * Texto de un motivo `UNAVAILABLE` del contrato, segun DONDE se muestra (el mismo codigo
 * se explica distinto en la tarjeta de oficiales que en la nota al pie de tendencias).
 * Un codigo que Web aun no conoce se muestra tal cual en vez de desaparecer: el contrato
 * puede sumar motivos sin que la pantalla los esconda.
 */
export type ReasonScope =
  | 'officialSuccessRate'
  | 'officialClosingTime'
  | 'officialFinalPrice'
  | 'salesCommission'
  | 'realMoneyCommission'
  | 'walletReconciliation'

export const reasonText = (t: TFunction, scope: ReasonScope, reason: string): string =>
  t(`auctionMetrics:reasons.${scope}.${reason}`, { defaultValue: reason })
