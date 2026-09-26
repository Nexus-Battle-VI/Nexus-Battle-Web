import type { DifficultyLevel, MissionDifficulty, RewardTier } from './api'
import { i18n } from '@/shared/i18n/i18n'
import { localizedMessages } from '@/shared/i18n/messages'

/**
 * Textos que ve el jugador. Solo presentan lo que responde Missions: ninguna
 * funcion de este modulo decide si un nivel esta libre.
 */
const NAMES: Readonly<Record<DifficultyLevel, string>> = localizedMessages({
  NORMAL: 'missions:difficulty.NORMAL',
  HEROIC: 'missions:difficulty.HEROIC',
  LEGENDARY: 'missions:difficulty.LEGENDARY',
  MYTHIC: 'missions:difficulty.MYTHIC',
})

/** Redaccion de la HU: Heroico "mejores", Legendario "premium", Mitico "unicas y exclusivas". */
const REWARDS: Readonly<Record<RewardTier, string>> = localizedMessages({
  STANDARD: 'missions:reward.STANDARD',
  IMPROVED: 'missions:reward.IMPROVED',
  PREMIUM: 'missions:reward.PREMIUM',
  EXCLUSIVE: 'missions:reward.EXCLUSIVE',
})

export const difficultyName = (level: DifficultyLevel): string => NAMES[level]

export const rewardTierText = (tier: RewardTier): string => REWARDS[tier]

const WHOLE_PERCENT = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

/**
 * El porcentaje sale del factor que envia Missions (`1.5` es "50 % mas"), no de
 * una tabla propia: si el PO cambia un factor, la interfaz lo refleja sin
 * tocar codigo. Sin factor (Mitico) se muestra lo unico que la HU dice de ese
 * nivel, en lugar de inventar un numero. El contrato solo publica factores de 1
 * en adelante.
 */
export const enemyScalingText = (multiplier: number | null): string => {
  if (multiplier === null) {
    return i18n.t('missions:difficulty.maxDifficulty')
  }

  const extra = (multiplier - 1) * 100
  // Intl redondea a entero para mostrarlo: la feature no usa Math.* (guarda de HU-09.5).
  const shown = WHOLE_PERCENT.format(extra)

  return extra > 0 && shown !== '0'
    ? i18n.t('missions:difficulty.enemiesBoosted', { percent: shown })
    : i18n.t('missions:difficulty.enemiesBase')
}

/**
 * Lo que el nivel cambia además de las estadísticas (diseño «misiones jugables»,
 * P-J8): más enemigos, un jefe más peligroso y mejor botín. Las cifras llegan de
 * Missions; un nivel sin cambios, o un Missions anterior, no añade nada. El Máster
 * no cambia con el nivel: el PO fijó un 15 % por misión.
 */
export const compositionTexts = (item: MissionDifficulty): readonly string[] => {
  const extra = item.extraEnemiesPerEncounter ?? 0
  const enrage = item.bossEnrageBonus ?? 0
  const loot = item.lootBonusPercent ?? 0
  return [
    ...(extra > 0
      ? [
          i18n.t(
            extra === 1
              ? 'missions:difficulty.extraEnemies_one'
              : 'missions:difficulty.extraEnemies_other',
            {
              count: extra,
            },
          ),
        ]
      : []),
    ...(enrage > 0 ? [i18n.t('missions:difficulty.bossEnrage', { amount: String(enrage) })] : []),
    ...(loot > 0 ? [i18n.t('missions:difficulty.bossLoot', { amount: String(loot) })] : []),
  ]
}
