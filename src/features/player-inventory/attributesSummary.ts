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

const describeEffect = (raw: unknown): string | null => {
  const effect = asRecord(raw)
  if (effect === null) return null

  const kind = asString(effect.kind)
  if (kind === null) return null

  const target = asString(effect.target)
  const statistic = asString(effect.statistic)
  const operation = asString(effect.operation)

  return [kind, statistic, operation, target].filter((part) => part !== null).join(' · ')
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
        ? 'Todos los héroes'
        : compatibleSubtypes.length > 0
          ? compatibleSubtypes.join(', ')
          : null,
    slot: asString(values?.slot),
    abilities,
    effects,
  }
}
