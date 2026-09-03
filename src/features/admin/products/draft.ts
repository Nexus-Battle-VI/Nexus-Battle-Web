import type {
  ArmorSlot,
  CompatibilityScope,
  Currency,
  EffectKind,
  EffectOperation,
  EffectTarget,
  MagnitudeMode,
  ProductType,
  Statistic,
} from './contract'

/**
 * Estado del formulario, en el formato en que lo produce el navegador.
 *
 * TODO NUMERO VIVE COMO TEXTO, y es deliberado. Un `<input type="number">`
 * entrega cadena, y el vacio y el cero son cosas distintas: guardarlos ya
 * convertidos obligaria a representar «no escrito» con `NaN` o con `null` y a
 * distinguirlos en cada comparacion. La conversion ocurre en un solo sitio, al
 * construir la peticion, donde ademas se valida.
 */
export interface MagnitudeDraft {
  readonly mode: MagnitudeMode
  readonly amount: string
  readonly basisPoints: string
  readonly diceCount: string
  readonly diceSides: string
}

export interface EffectDraft {
  readonly kind: EffectKind
  readonly target: EffectTarget
  readonly statistic: Statistic
  readonly operation: EffectOperation
  readonly magnitude: MagnitudeDraft
  readonly immunityCode: string
  readonly statusCode: string
  readonly durationTurns: string
}

/** Perfil de heroe: el dominio admite ofensivo o sanador, nunca ambos. */
export type HeroProfile = 'OFFENSIVE' | 'HEALING'

export interface ProductDraft {
  readonly name: string
  readonly description: string
  readonly imageUrl: string
  readonly type: ProductType | ''

  readonly heroSubtype: string
  readonly basePower: string
  readonly baseHealth: string
  readonly baseDefense: string
  readonly heroProfile: HeroProfile
  readonly baseAttack: MagnitudeDraft
  readonly baseDamage: MagnitudeDraft
  readonly baseHealing: MagnitudeDraft
  readonly abilities: readonly [string, string, string]

  readonly compatibleHeroSubtypes: string
  readonly powerCostMode: 'FIXED' | 'ALL_AVAILABLE'
  readonly powerCost: string

  readonly compatibilityScope: CompatibilityScope
  readonly armorSlot: ArmorSlot
  readonly setCode: string

  readonly effects: readonly EffectDraft[]

  readonly compatibleHeroSubtype: string
  readonly generalEffectEnabled: boolean
  readonly generalEffect: EffectDraft
  readonly specificEffect: EffectDraft

  /**
   * Modalidad del tiraje, ELEGIDA y no deducida de un numero.
   *
   * El servicio recibe `-1` para infinito, pero pedirle eso a una persona
   * invita a escribir `0` o `-5` y descubrir el 422 despues. La pantalla
   * pregunta cual de las dos modalidades es, y la traduccion a `-1` la hace el
   * codigo.
   */
  readonly printRunMode: 'LIMITED' | 'INFINITE'
  readonly printRun: string
  readonly creditsPrice: string
  readonly premium: boolean
  readonly realMoneyAmount: string
  readonly realMoneyCurrency: Currency
}

export const emptyMagnitude = (): MagnitudeDraft => ({
  mode: 'FIXED',
  amount: '',
  basisPoints: '',
  diceCount: '',
  diceSides: '',
})

export const emptyEffect = (): EffectDraft => ({
  kind: 'STAT_MODIFIER',
  target: 'OPPONENT',
  statistic: 'POWER',
  operation: 'INCREASE',
  magnitude: emptyMagnitude(),
  immunityCode: '',
  statusCode: '',
  durationTurns: '',
})

export const emptyDraft = (): ProductDraft => ({
  name: '',
  description: '',
  imageUrl: '',
  type: '',

  heroSubtype: '',
  basePower: '',
  baseHealth: '',
  baseDefense: '',
  heroProfile: 'OFFENSIVE',
  baseAttack: emptyMagnitude(),
  baseDamage: emptyMagnitude(),
  baseHealing: emptyMagnitude(),
  abilities: ['', '', ''],

  compatibleHeroSubtypes: '',
  powerCostMode: 'FIXED',
  powerCost: '',

  compatibilityScope: 'ALL_HEROES',
  armorSlot: 'CHEST',
  setCode: '',

  effects: [emptyEffect()],

  compatibleHeroSubtype: '',
  generalEffectEnabled: false,
  generalEffect: emptyEffect(),
  specificEffect: emptyEffect(),

  printRunMode: 'LIMITED',
  printRun: '',
  creditsPrice: '',
  premium: false,
  realMoneyAmount: '',
  realMoneyCurrency: 'COP',
})

/** Tipos que se describen con una lista de efectos y un ambito de compatibilidad. */
export const USES_EFFECT_LIST = new Set<ProductType>(['HABILIDAD', 'ARMA', 'ARMADURA', 'ITEM'])

/**
 * Lista de subtipos escrita como texto separado por comas.
 *
 * Se acepta texto libre porque NO existe todavia un catalogo de subtipos que
 * consultar: inventar un desplegable con valores fijos aqui seria adivinar. El
 * formato exigido por el dominio (`MAYUSCULAS_CON_GUION_BAJO`) si se valida.
 */
export const parseSubtypeList = (raw: string): readonly string[] =>
  raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value !== '')
