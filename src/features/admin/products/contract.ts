import { i18n } from '@/shared/i18n/i18n'
import { localizedMessages } from '@/shared/i18n/messages'

/**
 * Contrato canonico de creacion de producto (ADR-013, HU-33).
 *
 * Refleja `POST /api/v1/catalog/products` de Catalog. Se declara aqui, del lado
 * del cliente, en vez de compartir un paquete: los ocho repositorios son
 * independientes a proposito y un paquete comun obligaria a desplegarlos
 * coordinados. El precio de esa decision es esta copia, y por eso el fichero
 * enumera los valores admitidos en lugar de escribir `string`: si Catalog
 * cambia un enum, aqui falla el compilador y no el usuario.
 *
 * UNA REGLA QUE NO SE VE Y ROMPE LA PETICION: el objeto de un efecto NO admite
 * `stackable`. El dominio lo fija a `false` por su cuenta y su validador
 * rechaza cualquier clave que no reconozca, asi que enviarlo -aunque valga
 * `false`- devuelve 422.
 */

export const PRODUCT_TYPES = ['HEROE', 'HABILIDAD', 'ARMA', 'ARMADURA', 'ITEM', 'EPICA'] as const
export type ProductType = (typeof PRODUCT_TYPES)[number]

/*
 * Las tablas de etiquetas se traducen AL LEERSE (`localizedMessages`): el
 * contrato `Record<Codigo, string>` no cambia y cada lectura habla el idioma
 * activo. El codigo que viaja a Catalog es siempre la clave, nunca la etiqueta.
 */
export const PRODUCT_TYPE_LABELS: Readonly<Record<ProductType, string>> = localizedMessages({
  HEROE: 'admin:products.types.HEROE',
  HABILIDAD: 'admin:products.types.HABILIDAD',
  ARMA: 'admin:products.types.ARMA',
  ARMADURA: 'admin:products.types.ARMADURA',
  ITEM: 'admin:products.types.ITEM',
  EPICA: 'admin:products.types.EPICA',
})

export const CURRENCIES = ['COP', 'USD', 'EUR'] as const
export type Currency = (typeof CURRENCIES)[number]

export const COMPATIBILITY_SCOPES = ['ALL_HEROES', 'SELECTED_SUBTYPES'] as const
export type CompatibilityScope = (typeof COMPATIBILITY_SCOPES)[number]

export const ARMOR_SLOTS = ['HEAD', 'CHEST', 'GLOVES', 'BRACERS', 'PANTS', 'SHOES'] as const
export type ArmorSlot = (typeof ARMOR_SLOTS)[number]

export const ARMOR_SLOT_LABELS: Readonly<Record<ArmorSlot, string>> = localizedMessages({
  HEAD: 'admin:products.slots.HEAD',
  CHEST: 'admin:products.slots.CHEST',
  GLOVES: 'admin:products.slots.GLOVES',
  BRACERS: 'admin:products.slots.BRACERS',
  PANTS: 'admin:products.slots.PANTS',
  SHOES: 'admin:products.slots.SHOES',
})

export const EFFECT_TARGETS = ['SELF', 'ALLY', 'ALLIED_GROUP', 'OPPONENT', 'ENEMY_GROUP'] as const
export type EffectTarget = (typeof EFFECT_TARGETS)[number]

export const EFFECT_TARGET_LABELS: Readonly<Record<EffectTarget, string>> = localizedMessages({
  SELF: 'admin:products.targets.SELF',
  ALLY: 'admin:products.targets.ALLY',
  ALLIED_GROUP: 'admin:products.targets.ALLIED_GROUP',
  OPPONENT: 'admin:products.targets.OPPONENT',
  ENEMY_GROUP: 'admin:products.targets.ENEMY_GROUP',
})

export const EFFECT_KINDS = [
  'STAT_MODIFIER',
  'DAMAGE',
  'HEALING',
  'IMMUNITY',
  'REFLECT_DAMAGE',
  'REVIVE',
  'TEMPORARY_STATUS',
] as const
export type EffectKind = (typeof EFFECT_KINDS)[number]

export const EFFECT_KIND_LABELS: Readonly<Record<EffectKind, string>> = localizedMessages({
  STAT_MODIFIER: 'admin:products.kinds.STAT_MODIFIER',
  DAMAGE: 'admin:products.kinds.DAMAGE',
  HEALING: 'admin:products.kinds.HEALING',
  IMMUNITY: 'admin:products.kinds.IMMUNITY',
  REFLECT_DAMAGE: 'admin:products.kinds.REFLECT_DAMAGE',
  REVIVE: 'admin:products.kinds.REVIVE',
  TEMPORARY_STATUS: 'admin:products.kinds.TEMPORARY_STATUS',
})

export const STATISTICS = [
  'POWER',
  'HEALTH',
  'DEFENSE',
  'ATTACK',
  'DAMAGE',
  'HEALING',
  'CRITICAL_CHANCE',
] as const
export type Statistic = (typeof STATISTICS)[number]

export const STATISTIC_LABELS: Readonly<Record<Statistic, string>> = localizedMessages({
  POWER: 'admin:products.statistics.POWER',
  HEALTH: 'admin:products.statistics.HEALTH',
  DEFENSE: 'admin:products.statistics.DEFENSE',
  ATTACK: 'admin:products.statistics.ATTACK',
  DAMAGE: 'admin:products.statistics.DAMAGE',
  HEALING: 'admin:products.statistics.HEALING',
  CRITICAL_CHANCE: 'admin:products.statistics.CRITICAL_CHANCE',
})

export const EFFECT_OPERATIONS = [
  'INCREASE',
  'DECREASE',
  'MULTIPLY',
  'SET',
  'BLOCK',
  'RESTORE',
] as const
export type EffectOperation = (typeof EFFECT_OPERATIONS)[number]

export const EFFECT_OPERATION_LABELS: Readonly<Record<EffectOperation, string>> = localizedMessages(
  {
    INCREASE: 'admin:products.operations.INCREASE',
    DECREASE: 'admin:products.operations.DECREASE',
    MULTIPLY: 'admin:products.operations.MULTIPLY',
    SET: 'admin:products.operations.SET',
    BLOCK: 'admin:products.operations.BLOCK',
    RESTORE: 'admin:products.operations.RESTORE',
  },
)

export const MAGNITUDE_MODES = ['FIXED', 'PERCENTAGE', 'DICE'] as const
export type MagnitudeMode = (typeof MAGNITUDE_MODES)[number]

export const MAGNITUDE_MODE_LABELS: Readonly<Record<MagnitudeMode, string>> = localizedMessages({
  FIXED: 'admin:products.modes.FIXED',
  PERCENTAGE: 'admin:products.modes.PERCENTAGE',
  DICE: 'admin:products.modes.DICE',
})

export type Magnitude =
  | { readonly mode: 'FIXED'; readonly amount: number }
  | { readonly mode: 'PERCENTAGE'; readonly basisPoints: number }
  | { readonly mode: 'DICE'; readonly count: number; readonly sides: number }

export type BaseCombatValue =
  | { readonly mode: 'FIXED'; readonly amount: number }
  | { readonly mode: 'DICE'; readonly count: number; readonly sides: number }

interface EffectCommon {
  readonly target: EffectTarget
  readonly durationTurns?: number
}

export type ProductEffect =
  | (EffectCommon & {
      readonly kind: 'STAT_MODIFIER'
      readonly statistic: Statistic
      readonly operation: EffectOperation
      readonly magnitude: Magnitude
    })
  | (EffectCommon & { readonly kind: 'DAMAGE'; readonly magnitude: Magnitude })
  | (EffectCommon & { readonly kind: 'HEALING'; readonly magnitude: Magnitude })
  | (EffectCommon & { readonly kind: 'IMMUNITY'; readonly immunityCode: string })
  | (EffectCommon & {
      readonly kind: 'REFLECT_DAMAGE'
      readonly magnitude: { readonly mode: 'PERCENTAGE'; readonly basisPoints: number }
    })
  | (EffectCommon & {
      readonly kind: 'REVIVE'
      readonly magnitude: Exclude<Magnitude, { mode: 'DICE' }>
    })
  | (EffectCommon & {
      readonly kind: 'TEMPORARY_STATUS'
      readonly statusCode: string
      readonly durationTurns: number
    })

export interface RealMoneyPrice {
  readonly amount: number
  readonly currency: Currency
}

export interface CreateProductRequest {
  readonly name: string
  readonly imageUrl: string
  readonly description: string
  readonly type: ProductType
  readonly attributes: { readonly schemaVersion: '1'; readonly values: Record<string, unknown> }
  readonly printRun: number
  readonly creditsPrice: number
  readonly premium: boolean
  readonly realMoneyPrice?: RealMoneyPrice
}

export interface CreatedProduct {
  readonly productId: string
  readonly name: string
  readonly type: ProductType
  readonly printRun: number
  readonly printRunMode: 'UNIQUE' | 'LIMITED' | 'INFINITE'
  readonly lifecycleStatus: 'ACTIVE' | 'SUSPENDED'
  readonly creditsPrice: number
  readonly premium: boolean
}

/**
 * Estado funcional inicial, proyectado desde el tiraje.
 *
 * Lo decide Catalog; aqui se calcula solo para ANTICIPARLO en el resumen. Es
 * una proyeccion de presentacion, no una regla: si el servicio respondiera otra
 * cosa, manda la respuesta.
 */
export const initialFunctionalStatus = (printRun: number): 'único' | 'activo' =>
  printRun === 1 ? 'único' : 'activo'

/** Etiqueta del estado inicial proyectado, en el idioma activo. */
export const initialFunctionalStatusLabel = (printRun: number): string =>
  i18n.t(
    initialFunctionalStatus(printRun) === 'único'
      ? 'admin:products.initialStatus.unique'
      : 'admin:products.initialStatus.active',
  )
