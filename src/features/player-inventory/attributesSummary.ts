import { i18n } from '@/shared/i18n/i18n'

import type { Magnitude } from './equipment/api'
import { describeEquipmentEffect } from './equipment/effectPresentation'

/**
 * Lee el sobre de atributos canónicos de Catalog de forma defensiva.
 *
 * `attributes` llega como dato opaco (`unknown`): esta pantalla solo lo
 * presenta, no lo valida. Se extrae lo que HU-27 necesita mostrar —efectos y
 * referencias de habilidad— y se ignora el resto sin romper si la forma cambia.
 */
export interface AttributesSummary {
  readonly heroSubtype: string | null
  readonly compatibility: string | null
  readonly slot: string | null
  readonly abilities: readonly string[]
  readonly effects: readonly string[]
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null

const asString = (value: unknown): string | null => (typeof value === 'string' ? value : null)

const asMagnitude = (value: unknown): Magnitude | undefined => {
  const record = asRecord(value)
  const mode = asString(record?.mode)

  return record !== null && (mode === 'FIXED' || mode === 'PERCENTAGE' || mode === 'DICE')
    ? (record as unknown as Magnitude)
    : undefined
}

/**
 * Un efecto del producto EN PALABRAS («Daño 5 al rival»), con la misma
 * presentacion que los efectos del equipamiento. Antes se mostraban los codigos
 * crudos («DAMAGE · OPPONENT»). Solo describe lo que dice Catalog: si el dato es
 * extraño (p. ej. daño a un aliado) se muestra tal cual, no se corrige aqui.
 */
const describeEffect = (raw: unknown): string | null => {
  const effect = asRecord(raw)
  if (effect === null) return null

  const kind = asString(effect.kind)
  if (kind === null) return null

  const statistic = asString(effect.statistic)
  const operation = asString(effect.operation)
  const magnitude = asMagnitude(effect.magnitude)

  return describeEquipmentEffect({
    kind,
    target: asString(effect.target) ?? '',
    ...(statistic === null ? {} : { statistic }),
    ...(operation === null ? {} : { operation }),
    ...(magnitude === undefined ? {} : { magnitude }),
  })
}

export const summarizeAttributes = (attributes: unknown): AttributesSummary => {
  const values = asRecord(asRecord(attributes)?.values)

  const abilities = Array.isArray(values?.abilities)
    ? values.abilities.filter((entry): entry is string => typeof entry === 'string')
    : []

  const effects = Array.isArray(values?.effects)
    ? values.effects.map(describeEffect).filter((entry): entry is string => entry !== null)
    : []

  const compatibilityScope = asString(values?.compatibilityScope)
  const compatibleSubtypes = Array.isArray(values?.compatibleHeroSubtypes)
    ? values.compatibleHeroSubtypes.filter((entry): entry is string => typeof entry === 'string')
    : []

  return {
    heroSubtype: asString(values?.heroSubtype) ?? asString(values?.compatibleHeroSubtype),
    compatibility:
      compatibilityScope === 'ALL_HEROES'
        ? i18n.t('inventory:detail.allHeroes')
        : compatibleSubtypes.length > 0
          ? compatibleSubtypes.join(', ')
          : null,
    slot: asString(values?.slot),
    abilities,
    effects,
  }
}
