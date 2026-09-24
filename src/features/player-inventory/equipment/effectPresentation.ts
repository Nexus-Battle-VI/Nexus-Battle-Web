import type { EquippedEffect } from './api'
import { formatMagnitude } from './magnitude'

const STATISTIC_LABELS: Readonly<Record<string, string>> = {
  ATTACK: 'Ataque',
  DEFENSE: 'Defensa',
  HEALTH: 'Vida',
  POWER: 'Poder',
  DAMAGE: 'Daño',
  HEALING: 'Sanación',
  CRITICAL_CHANCE: 'Probabilidad de crítico',
}

const OPERATION_SIGNS: Readonly<Record<string, string>> = {
  INCREASE: '+',
  DECREASE: '−',
  MULTIPLY: '×',
  SET: '= ',
}

const TARGET_LABELS: Readonly<Record<string, string>> = {
  ALLY: 'a un aliado',
  ALLIED_GROUP: 'a tu equipo',
  OPPONENT: 'al rival',
  ENEMY_GROUP: 'al equipo rival',
}

const KIND_LABELS: Readonly<Record<string, string>> = {
  DAMAGE: 'Daño',
  HEALING: 'Sanación',
  REVIVE: 'Reanimación',
  REFLECT_DAMAGE: 'Refleja daño',
  IMMUNITY: 'Inmunidad',
  TEMPORARY_STATUS: 'Estado temporal',
}

/**
 * Un efecto del equipamiento en palabras ("+2 Ataque", "−1 Ataque al rival",
 * "Daño +1d4"), en lugar de sus codigos (`STAT_MODIFIER · ATTACK · INCREASE ·
 * SELF`). Solo presentacion: no aplica ni calcula nada; la magnitud se muestra
 * tal cual (un dado sigue siendo un dado).
 */
export const describeEquipmentEffect = (effect: EquippedEffect): string => {
  const magnitude = effect.magnitude === undefined ? '' : formatMagnitude(effect.magnitude)
  const sign = effect.operation === undefined ? '' : (OPERATION_SIGNS[effect.operation] ?? '')
  const statistic =
    effect.statistic === undefined ? null : (STATISTIC_LABELS[effect.statistic] ?? effect.statistic)
  const target = TARGET_LABELS[effect.target] ?? null

  let main: string

  if (effect.kind === 'STAT_MODIFIER' && statistic !== null) {
    main =
      effect.operation === 'BLOCK'
        ? `Bloquea ${statistic}`
        : effect.operation === 'RESTORE'
          ? `Restaura ${statistic}`
          : `${sign}${magnitude} ${statistic}`.trim()
  } else {
    const label = KIND_LABELS[effect.kind] ?? 'Efecto especial'
    main = magnitude === '' ? label : `${label} ${sign}${magnitude}`
  }

  return target === null ? main : `${main} ${target}`
}
