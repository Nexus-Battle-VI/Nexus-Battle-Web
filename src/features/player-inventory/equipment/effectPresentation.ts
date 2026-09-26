import { i18n } from '@/shared/i18n/i18n'

import type { EquippedEffect } from './api'
import { formatMagnitude } from './magnitude'

const OPERATION_SIGNS: Readonly<Record<string, string>> = {
  INCREASE: '+',
  DECREASE: '−',
  MULTIPLY: '×',
  SET: '= ',
}

const KNOWN_STATISTICS = new Set([
  'ATTACK',
  'DEFENSE',
  'HEALTH',
  'POWER',
  'DAMAGE',
  'HEALING',
  'CRITICAL_CHANCE',
])
const KNOWN_TARGETS = new Set(['ALLY', 'ALLIED_GROUP', 'OPPONENT', 'ENEMY_GROUP'])
const KNOWN_KINDS = new Set([
  'DAMAGE',
  'HEALING',
  'REVIVE',
  'REFLECT_DAMAGE',
  'IMMUNITY',
  'TEMPORARY_STATUS',
])

/** Etiqueta de una estadistica; un codigo desconocido se muestra tal cual (no se inventa). */
export const statisticLabel = (statistic: string): string =>
  KNOWN_STATISTICS.has(statistic) ? i18n.t(`inventory:stats.${statistic}`) : statistic

/** Lo minimo que se necesita para describir un efecto (equipado o de la ficha). */
export type DescribableEffect = Pick<
  EquippedEffect,
  'kind' | 'target' | 'statistic' | 'operation' | 'magnitude'
>

/**
 * Un efecto del equipamiento en palabras del idioma activo, a partir de sus
 * codigos (`kind`, `statistic`, `operation`, `target`) y su magnitud. Solo
 * describe: no decide si aplica ni cuanto vale en combate.
 */
export const describeEquipmentEffect = (effect: DescribableEffect): string => {
  const magnitude = effect.magnitude === undefined ? '' : formatMagnitude(effect.magnitude)
  const sign = effect.operation === undefined ? '' : (OPERATION_SIGNS[effect.operation] ?? '')
  const statistic = effect.statistic === undefined ? null : statisticLabel(effect.statistic)
  const target = KNOWN_TARGETS.has(effect.target)
    ? i18n.t(`inventory:effects.targets.${effect.target}`)
    : null

  let main: string

  if (effect.kind === 'STAT_MODIFIER' && statistic !== null) {
    main =
      effect.operation === 'BLOCK'
        ? i18n.t('inventory:effects.block', { stat: statistic })
        : effect.operation === 'RESTORE'
          ? i18n.t('inventory:effects.restore', { stat: statistic })
          : `${sign}${magnitude} ${statistic}`.trim()
  } else {
    const label = KNOWN_KINDS.has(effect.kind)
      ? i18n.t(`inventory:effects.kinds.${effect.kind}`)
      : i18n.t('inventory:effects.kinds.other')
    main = magnitude === '' ? label : `${label} ${sign}${magnitude}`
  }

  return target === null ? main : `${main} ${target}`
}
