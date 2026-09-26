import { parseSubtypeList, USES_EFFECT_LIST, type EffectDraft, type ProductDraft } from './draft'
import type { MagnitudeDraft } from './draft'
import { i18n } from '@/shared/i18n/i18n'

/**
 * Validacion del formulario de alta de producto.
 *
 * REPITE LAS REGLAS DEL SERVICIO A PROPOSITO, y conviene decir por que no es
 * duplicacion ociosa: Catalog es quien AUTORIZA -su 422 es el que manda-, pero
 * un formulario que solo descubre los errores despues de enviar obliga a
 * rellenar cuatro pasos para enterarse de que el tiraje era invalido. Estas
 * comprobaciones existen para responder antes, no para sustituir al servicio.
 *
 * Si las dos versiones divergieran, la del servicio gana: por eso el envio
 * traduce su respuesta en lugar de asumir que nunca llegara.
 */

/** Errores por campo. Vacio = el paso puede avanzar. */
export type FieldErrors = Readonly<Record<string, string>>

const CODE = /^[A-Z][A-Z0-9_]*$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const isInteger = (raw: string): boolean => /^-?\d+$/.test(raw.trim())

const integerError = (
  raw: string,
  { minimum, maximum }: { minimum?: number; maximum?: number } = {},
): string | null => {
  if (raw.trim() === '') {
    return i18n.t('admin:products.errors.required')
  }

  if (!isInteger(raw)) {
    return i18n.t('admin:products.errors.integer')
  }

  const value = Number(raw)

  if (minimum !== undefined && value < minimum) {
    return i18n.t('admin:products.errors.min', { min: String(minimum) })
  }

  if (maximum !== undefined && value > maximum) {
    return i18n.t('admin:products.errors.max', { max: String(maximum) })
  }

  return null
}

const assign = (errors: Record<string, string>, key: string, message: string | null): void => {
  if (message !== null) {
    errors[key] = message
  }
}

/** Paso 1. Datos comunes a cualquier tipo de producto. */
export const validateBasics = (draft: ProductDraft): FieldErrors => {
  const errors: Record<string, string> = {}
  const name = draft.name.trim()

  if (name.length < 3 || name.length > 80) {
    errors.name = i18n.t('admin:products.errors.name')
  }

  if (draft.type === '') {
    errors.type = i18n.t('admin:products.errors.type')
  }

  if (draft.description.trim() === '') {
    errors.description = i18n.t('admin:products.errors.description')
  }

  const image = draft.imageUrl.trim()

  if (image === '') {
    errors.imageUrl = i18n.t('admin:products.errors.imageRequired')
  } else if (
    !/^https?:\/\/\S+\/api\/v1\/catalog\/product-assets\/[0-9a-f-]+\/content$/i.test(image)
  ) {
    errors.imageUrl = i18n.t('admin:products.errors.imageUnvalidated')
  }

  return errors
}

const validateMagnitude = (
  magnitude: MagnitudeDraft,
  prefix: string,
  errors: Record<string, string>,
  allowed: readonly MagnitudeDraft['mode'][],
): void => {
  if (!allowed.includes(magnitude.mode)) {
    errors[`${prefix}.mode`] = i18n.t('admin:products.errors.magnitudeMode')
    return
  }

  if (magnitude.mode === 'FIXED') {
    assign(errors, `${prefix}.amount`, integerError(magnitude.amount, { minimum: 1 }))
    return
  }

  if (magnitude.mode === 'PERCENTAGE') {
    assign(
      errors,
      `${prefix}.basisPoints`,
      integerError(magnitude.basisPoints, { minimum: 1, maximum: 10_000 }),
    )
    return
  }

  assign(errors, `${prefix}.diceCount`, integerError(magnitude.diceCount, { minimum: 1 }))
  assign(errors, `${prefix}.diceSides`, integerError(magnitude.diceSides, { minimum: 2 }))
}

const ALL_MODES = ['FIXED', 'PERCENTAGE', 'DICE'] as const

export const validateEffect = (
  effect: EffectDraft,
  prefix: string,
  errors: Record<string, string>,
): void => {
  switch (effect.kind) {
    case 'STAT_MODIFIER':
    case 'DAMAGE':
    case 'HEALING':
      validateMagnitude(effect.magnitude, `${prefix}.magnitude`, errors, ALL_MODES)
      break
    case 'REFLECT_DAMAGE':
      // El dominio solo acepta porcentaje aqui: un daño reflejado fijo no
      // dependeria del golpe recibido, que es lo que «reflejar» significa.
      validateMagnitude(effect.magnitude, `${prefix}.magnitude`, errors, ['PERCENTAGE'])
      break
    case 'REVIVE':
      validateMagnitude(effect.magnitude, `${prefix}.magnitude`, errors, ['FIXED', 'PERCENTAGE'])
      break
    case 'IMMUNITY':
      if (!CODE.test(effect.immunityCode.trim())) {
        errors[`${prefix}.immunityCode`] = i18n.t('admin:products.errors.immunityCode')
      }
      break
    case 'TEMPORARY_STATUS':
      if (!CODE.test(effect.statusCode.trim())) {
        errors[`${prefix}.statusCode`] = i18n.t('admin:products.errors.statusCode')
      }
      assign(errors, `${prefix}.durationTurns`, integerError(effect.durationTurns, { minimum: 1 }))
      break
  }
}

const validateSubtypeList = (
  raw: string,
  key: string,
  errors: Record<string, string>,
  { requireOne }: { requireOne: boolean },
): void => {
  const values = parseSubtypeList(raw)

  if (values.length === 0) {
    if (requireOne) {
      errors[key] = i18n.t('admin:products.errors.subtypeRequired')
    }

    return
  }

  if (values.some((value) => !CODE.test(value))) {
    errors[key] = i18n.t('admin:products.errors.subtypeFormat')
    return
  }

  if (new Set(values).size !== values.length) {
    errors[key] = i18n.t('admin:products.errors.subtypeDuplicate')
  }
}

const validateHero = (draft: ProductDraft, errors: Record<string, string>): void => {
  if (!CODE.test(draft.heroSubtype.trim())) {
    errors.heroSubtype = i18n.t('admin:products.errors.codeFormat')
  }

  assign(errors, 'basePower', integerError(draft.basePower, { minimum: 0 }))
  assign(errors, 'baseHealth', integerError(draft.baseHealth, { minimum: 1 }))
  assign(errors, 'baseDefense', integerError(draft.baseDefense, { minimum: 0 }))

  if (draft.heroProfile === 'OFFENSIVE') {
    validateMagnitude(draft.baseAttack, 'baseAttack', errors, ['FIXED', 'DICE'])
    validateMagnitude(draft.baseDamage, 'baseDamage', errors, ['FIXED', 'DICE'])
  } else {
    validateMagnitude(draft.baseHealing, 'baseHealing', errors, ['FIXED', 'DICE'])
  }

  const abilities = draft.abilities.map((value) => value.trim())

  abilities.forEach((ability, index) => {
    if (ability === '') {
      errors[`abilities.${String(index)}`] = i18n.t('admin:products.errors.threeAbilities')
      return
    }

    if (!UUID.test(ability)) {
      errors[`abilities.${String(index)}`] = i18n.t('admin:products.errors.abilityUuid')
    }
  })

  const filled = abilities.filter((value) => value !== '')

  if (filled.length === 3 && new Set(filled).size !== 3) {
    errors['abilities.0'] = i18n.t('admin:products.errors.abilitiesDistinct')
  }
}

/** Paso 2. Atributos del tipo elegido. */
export const validateAttributes = (draft: ProductDraft): FieldErrors => {
  const errors: Record<string, string> = {}

  if (draft.type === '') {
    errors.type = i18n.t('admin:products.errors.typeFirst')
    return errors
  }

  if (draft.type === 'HEROE') {
    validateHero(draft, errors)
    return errors
  }

  if (draft.type === 'HABILIDAD') {
    validateSubtypeList(draft.compatibleHeroSubtypes, 'compatibleHeroSubtypes', errors, {
      requireOne: true,
    })

    if (draft.powerCostMode === 'FIXED') {
      assign(errors, 'powerCost', integerError(draft.powerCost, { minimum: 1 }))
    }
  }

  if (draft.type === 'EPICA') {
    if (!CODE.test(draft.compatibleHeroSubtype.trim())) {
      errors.compatibleHeroSubtype = i18n.t('admin:products.errors.codeFormat')
    }

    validateEffect(draft.specificEffect, 'specificEffect', errors)

    if (draft.generalEffectEnabled) {
      validateEffect(draft.generalEffect, 'generalEffect', errors)
    }

    return errors
  }

  if (draft.type === 'ARMA' || draft.type === 'ARMADURA' || draft.type === 'ITEM') {
    if (draft.compatibilityScope === 'SELECTED_SUBTYPES') {
      validateSubtypeList(draft.compatibleHeroSubtypes, 'compatibleHeroSubtypes', errors, {
        requireOne: true,
      })
    } else if (parseSubtypeList(draft.compatibleHeroSubtypes).length > 0) {
      // El dominio RECHAZA la lista cuando el ambito es «todos los héroes»: es
      // una contradiccion, no un dato de mas.
      errors.compatibleHeroSubtypes = i18n.t('admin:products.errors.allHeroesList')
    }

    const setCode = draft.setCode.trim()

    if (setCode !== '' && !CODE.test(setCode)) {
      errors.setCode = i18n.t('admin:products.errors.setCode')
    }
  }

  if (USES_EFFECT_LIST.has(draft.type)) {
    if (draft.effects.length === 0) {
      errors.effects = i18n.t('admin:products.errors.effectRequired')
    }

    draft.effects.forEach((effect, index) => {
      validateEffect(effect, `effects.${String(index)}`, errors)
    })
  }

  return errors
}

/** Paso 3. Tiraje, precio y condicion premium. */
export const validatePricing = (draft: ProductDraft): FieldErrors => {
  const errors: Record<string, string> = {}
  const printRun = draft.printRun.trim()

  // Con tiraje infinito NO se pide cantidad, asi que tampoco se valida: exigir
  // un numero que la pantalla no muestra dejaria el formulario bloqueado sin
  // que se viera donde.
  if (draft.printRunMode === 'LIMITED') {
    if (printRun === '') {
      errors.printRun = i18n.t('admin:products.errors.required')
    } else if (!isInteger(printRun)) {
      errors.printRun = i18n.t('admin:products.errors.printRun')
    } else if (Number(printRun) < 1) {
      errors.printRun = i18n.t('admin:products.errors.printRun')
    }
  }

  assign(errors, 'creditsPrice', integerError(draft.creditsPrice, { minimum: 0 }))

  if (draft.premium) {
    assign(errors, 'realMoneyAmount', integerError(draft.realMoneyAmount, { minimum: 1 }))
  }

  return errors
}
