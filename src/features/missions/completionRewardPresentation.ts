import type { MissionRewardProgression } from './api'
import { i18n } from '@/shared/i18n/i18n'

/**
 * Textos de la recompensa de finalización de misión (HU-10.6, sobre la
 * liquidación de HU-10.5), tal como la publica el informe de HU-74.
 *
 * NO CALCULA NADA: el importe, el estado y la progresión del héroe llegan
 * resueltos de Missions (que a su vez los recibe de Player/Inventory y de
 * Wallet); aquí solo se eligen las palabras. Sigue el mismo estilo que
 * `experiencePresentation.ts` (HU-09), pero sobre la forma, más pequeña, que
 * publica una línea `source: 'HU-10'`.
 */

/** «+120 XP» si ya se entregó; «120 XP» mientras sigue pendiente o si falló. */
export const completionXpAmountText = (reward: {
  readonly quantity: number
  readonly status: string
}): string =>
  reward.status === 'CREDITED'
    ? i18n.t('missions:report.completionXpCredited', { amount: String(reward.quantity) })
    : i18n.t('missions:report.completionXpUnresolved', { amount: String(reward.quantity) })

/** «50 créditos» / «1 crédito», tal como lo publica Wallet a través de Missions. */
export const completionCreditsAmountText = (reward: { readonly quantity: number }): string =>
  i18n.t('missions:report.completionCreditsAmount', { count: reward.quantity })

/** «Nivel 3», o «Nivel 3 · máximo» cuando el héroe ya alcanzó el tope. */
export const completionLevelText = (progression: MissionRewardProgression): string => {
  const level = i18n.t('missions:report.completionLevel', { level: String(progression.level) })

  return progression.level >= progression.maxLevel
    ? i18n.t('missions:report.completionLevelMax', { level })
    : level
}

/** «315 XP acumulada», tal como la publica Player/Inventory a través de Missions. */
export const completionCurrentXpText = (progression: MissionRewardProgression): string =>
  i18n.t('missions:report.completionCurrentXp', { amount: String(progression.currentXp) })

/** Los niveles ganados CON esta recompensa, o `null` si no subió ninguno. */
export const completionLevelsGainedText = (
  progression: MissionRewardProgression,
): string | null => {
  if (progression.levelsGained === 1) {
    return i18n.t('missions:report.completionLevelsGainedOne')
  }

  if (progression.levelsGained > 1) {
    return i18n.t('missions:report.completionLevelsGainedMany', {
      count: progression.levelsGained,
    })
  }

  return null
}
