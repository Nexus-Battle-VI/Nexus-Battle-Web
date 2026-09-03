import type {
  BaseCombatValue,
  CreateProductRequest,
  Magnitude,
  ProductEffect,
  ProductType,
} from './contract'
import { parseSubtypeList, USES_EFFECT_LIST, type EffectDraft, type MagnitudeDraft } from './draft'
import type { ProductDraft } from './draft'

/**
 * Traduce el formulario a la peticion que espera Catalog.
 *
 * Se ejecuta DESPUES de validar, nunca antes: aqui las conversiones numericas
 * se dan por buenas porque el paso anterior ya rechazo lo que no era entero.
 *
 * DOS REGLAS QUE NO SE VEN Y DEVUELVEN 422 SI SE INCUMPLEN:
 *
 * 1. El efecto no admite `stackable`. El dominio lo fija a `false` por su
 *    cuenta y rechaza toda clave que no reconozca.
 * 2. La magnitud solo admite las claves de SU modo. Un `amount` colado en una
 *    magnitud de dados no se ignora: invalida el efecto entero. Por eso cada
 *    modo se construye por separado en lugar de volcar el borrador completo.
 */

const toInteger = (raw: string): number => Number(raw.trim())

const magnitudeOf = (draft: MagnitudeDraft): Magnitude => {
  if (draft.mode === 'FIXED') {
    return { mode: 'FIXED', amount: toInteger(draft.amount) }
  }

  if (draft.mode === 'PERCENTAGE') {
    return { mode: 'PERCENTAGE', basisPoints: toInteger(draft.basisPoints) }
  }

  return { mode: 'DICE', count: toInteger(draft.diceCount), sides: toInteger(draft.diceSides) }
}

const combatValueOf = (draft: MagnitudeDraft): BaseCombatValue => {
  const magnitude = magnitudeOf(draft)

  if (magnitude.mode === 'PERCENTAGE') {
    // Inalcanzable con un borrador validado: la validacion no ofrece
    // porcentaje para los valores de combate. Se cierra el tipo en vez de
    // afirmarlo con un `as`, que apagaria el compilador sin resolver nada.
    throw new Error('Un valor base de combate solo admite cantidad fija o dados.')
  }

  return magnitude
}

export const effectOf = (draft: EffectDraft): ProductEffect => {
  const base = { target: draft.target } as const

  switch (draft.kind) {
    case 'STAT_MODIFIER':
      return {
        ...base,
        kind: 'STAT_MODIFIER',
        statistic: draft.statistic,
        operation: draft.operation,
        magnitude: magnitudeOf(draft.magnitude),
      }
    case 'DAMAGE':
      return { ...base, kind: 'DAMAGE', magnitude: magnitudeOf(draft.magnitude) }
    case 'HEALING':
      return { ...base, kind: 'HEALING', magnitude: magnitudeOf(draft.magnitude) }
    case 'IMMUNITY':
      return { ...base, kind: 'IMMUNITY', immunityCode: draft.immunityCode.trim() }
    case 'REFLECT_DAMAGE':
      return {
        ...base,
        kind: 'REFLECT_DAMAGE',
        magnitude: { mode: 'PERCENTAGE', basisPoints: toInteger(draft.magnitude.basisPoints) },
      }
    case 'REVIVE': {
      const magnitude = magnitudeOf(draft.magnitude)

      if (magnitude.mode === 'DICE') {
        throw new Error('Revivir no admite una magnitud de dados.')
      }

      return { ...base, kind: 'REVIVE', magnitude }
    }
    case 'TEMPORARY_STATUS':
      return {
        ...base,
        kind: 'TEMPORARY_STATUS',
        statusCode: draft.statusCode.trim(),
        durationTurns: toInteger(draft.durationTurns),
      }
  }
}

const compatibilityOf = (draft: ProductDraft): Record<string, unknown> => ({
  compatibilityScope: draft.compatibilityScope,
  ...(draft.compatibilityScope === 'SELECTED_SUBTYPES'
    ? { compatibleHeroSubtypes: parseSubtypeList(draft.compatibleHeroSubtypes) }
    : {}),
  effects: draft.effects.map(effectOf),
})

const attributeValuesOf = (draft: ProductDraft, type: ProductType): Record<string, unknown> => {
  switch (type) {
    case 'HEROE':
      return {
        kind: 'HEROE',
        heroSubtype: draft.heroSubtype.trim(),
        basePower: toInteger(draft.basePower),
        baseHealth: toInteger(draft.baseHealth),
        baseDefense: toInteger(draft.baseDefense),
        ...(draft.heroProfile === 'OFFENSIVE'
          ? {
              baseAttack: combatValueOf(draft.baseAttack),
              baseDamage: combatValueOf(draft.baseDamage),
            }
          : { baseHealing: combatValueOf(draft.baseHealing) }),
        abilities: draft.abilities.map((ability) => ability.trim()),
      }
    case 'HABILIDAD':
      return {
        kind: 'HABILIDAD',
        compatibleHeroSubtypes: parseSubtypeList(draft.compatibleHeroSubtypes),
        powerCostMode: draft.powerCostMode,
        // `powerCost` se OMITE con ALL_AVAILABLE. Enviarlo a cero no seria
        // «sin coste»: el dominio lo rechaza por incompatible con ese modo.
        ...(draft.powerCostMode === 'FIXED' ? { powerCost: toInteger(draft.powerCost) } : {}),
        chargeTurns: 1,
        effects: draft.effects.map(effectOf),
      }
    case 'ARMA': {
      const setCode = draft.setCode.trim()

      return {
        kind: 'ARMA',
        ...compatibilityOf(draft),
        ...(setCode === '' ? {} : { setCode }),
      }
    }
    case 'ARMADURA': {
      const setCode = draft.setCode.trim()

      return {
        kind: 'ARMADURA',
        ...compatibilityOf(draft),
        slot: draft.armorSlot,
        ...(setCode === '' ? {} : { setCode }),
      }
    }
    case 'ITEM':
      return { kind: 'ITEM', ...compatibilityOf(draft) }
    case 'EPICA':
      return {
        kind: 'EPICA',
        compatibleHeroSubtype: draft.compatibleHeroSubtype.trim(),
        ...(draft.generalEffectEnabled ? { generalEffect: effectOf(draft.generalEffect) } : {}),
        specificEffect: effectOf(draft.specificEffect),
        powerCost: 0,
        cooldownTurns: 2,
      }
  }
}

export const buildCreateRequest = (draft: ProductDraft): CreateProductRequest => {
  if (draft.type === '') {
    throw new Error('No se puede construir la peticion sin tipo de producto.')
  }

  return {
    name: draft.name.trim(),
    imageUrl: draft.imageUrl.trim(),
    description: draft.description.trim(),
    type: draft.type,
    attributes: { schemaVersion: '1', values: attributeValuesOf(draft, draft.type) },
    // `-1` es el valor que el contrato reserva para tiraje infinito. La
    // traduccion ocurre aqui, en un solo sitio, y no en la cabeza de quien
    // rellena el formulario.
    printRun: draft.printRunMode === 'INFINITE' ? -1 : toInteger(draft.printRun),
    creditsPrice: toInteger(draft.creditsPrice),
    premium: draft.premium,
    // `realMoneyPrice` se OMITE cuando no es premium. Mandarlo en `null`
    // tambien seria valido para el servicio, pero omitirlo deja el cuerpo
    // diciendo exactamente lo que ocurre: no hay precio en dinero real.
    ...(draft.premium
      ? {
          realMoneyPrice: {
            amount: toInteger(draft.realMoneyAmount),
            currency: draft.realMoneyCurrency,
          },
        }
      : {}),
  }
}

/** Los tipos cuyo paso 2 usa lista de efectos, expuesto para la vista. */
export { USES_EFFECT_LIST }
