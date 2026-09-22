import type { DifficultyLevel, RewardTier } from './api'

/**
 * Textos que ve el jugador. Solo presentan lo que responde Missions: ninguna
 * funcion de este modulo decide si un nivel esta libre.
 */
const NAMES: Readonly<Record<DifficultyLevel, string>> = {
  NORMAL: 'Normal',
  HEROIC: 'Heroico',
  LEGENDARY: 'Legendario',
  MYTHIC: 'Mítico',
}

/** Redaccion de la HU: Heroico "mejores", Legendario "premium", Mitico "unicas y exclusivas". */
const REWARDS: Readonly<Record<RewardTier, string>> = {
  STANDARD: 'Recompensas estándar',
  IMPROVED: 'Mejores recompensas',
  PREMIUM: 'Recompensas premium',
  EXCLUSIVE: 'Recompensas únicas y exclusivas',
}

export const difficultyName = (level: DifficultyLevel): string => NAMES[level]

export const rewardTierText = (tier: RewardTier): string => REWARDS[tier]

/**
 * El porcentaje sale del factor que envia Missions (`1.5` es "50 % mas"), no de
 * una tabla propia: si el PO cambia un factor, la interfaz lo refleja sin
 * tocar codigo. Sin factor (Mitico) se muestra lo unico que la HU dice de ese
 * nivel, en lugar de inventar un numero. El contrato solo publica factores de 1
 * en adelante.
 */
export const enemyScalingText = (multiplier: number | null): string => {
  if (multiplier === null) {
    return 'Dificultad máxima'
  }

  const extra = Math.round((multiplier - 1) * 100)

  return extra > 0
    ? `Enemigos con ${String(extra)} % más estadísticas`
    : 'Enemigos con sus estadísticas base'
}
