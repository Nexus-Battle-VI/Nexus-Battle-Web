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

export const PRODUCT_TYPE_LABELS: Readonly<Record<ProductType, string>> = {
  HEROE: 'Héroe',
  HABILIDAD: 'Habilidad',
  ARMA: 'Arma',
  ARMADURA: 'Armadura',
  ITEM: 'Ítem',
  EPICA: 'Épica',
}

export const CURRENCIES = ['COP', 'USD', 'EUR'] as const
export type Currency = (typeof CURRENCIES)[number]

export const COMPATIBILITY_SCOPES = ['ALL_HEROES', 'SELECTED_SUBTYPES'] as const
export type CompatibilityScope = (typeof COMPATIBILITY_SCOPES)[number]

export const ARMOR_SLOTS = ['HEAD', 'CHEST', 'GLOVES', 'BRACERS', 'PANTS', 'SHOES'] as const
export type ArmorSlot = (typeof ARMOR_SLOTS)[number]

export const ARMOR_SLOT_LABELS: Readonly<Record<ArmorSlot, string>> = {
  HEAD: 'Casco',
  CHEST: 'Pechera',
  GLOVES: 'Guantes',
  BRACERS: 'Brazaletes',
  PANTS: 'Pantalones',
  SHOES: 'Botas',
}

export const EFFECT_TARGETS = ['SELF', 'ALLY', 'ALLIED_GROUP', 'OPPONENT', 'ENEMY_GROUP'] as const
export type EffectTarget = (typeof EFFECT_TARGETS)[number]

export const EFFECT_TARGET_LABELS: Readonly<Record<EffectTarget, string>> = {
  SELF: 'A sí mismo',
  ALLY: 'A un aliado',
  ALLIED_GROUP: 'Al grupo aliado',
  OPPONENT: 'Al oponente',
  ENEMY_GROUP: 'Al grupo enemigo',
}

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

export const EFFECT_KIND_LABELS: Readonly<Record<EffectKind, string>> = {
  STAT_MODIFIER: 'Modificar estadística',
  DAMAGE: 'Daño',
  HEALING: 'Curación',
  IMMUNITY: 'Inmunidad',
  REFLECT_DAMAGE: 'Reflejar daño',
  REVIVE: 'Revivir',
  TEMPORARY_STATUS: 'Estado temporal',
}

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

export const STATISTIC_LABELS: Readonly<Record<Statistic, string>> = {
  POWER: 'Poder',
  HEALTH: 'Vida',
  DEFENSE: 'Defensa',
  ATTACK: 'Ataque',
  DAMAGE: 'Daño',
  HEALING: 'Curación',
  CRITICAL_CHANCE: 'Probabilidad crítica',
}

export const EFFECT_OPERATIONS = [
  'INCREASE',
  'DECREASE',
  'MULTIPLY',
  'SET',
  'BLOCK',
  'RESTORE',
] as const
export type EffectOperation = (typeof EFFECT_OPERATIONS)[number]

export const EFFECT_OPERATION_LABELS: Readonly<Record<EffectOperation, string>> = {
  INCREASE: 'Aumentar',
  DECREASE: 'Disminuir',
  MULTIPLY: 'Multiplicar',
  SET: 'Fijar',
  BLOCK: 'Bloquear',
  RESTORE: 'Restaurar',
}

export const MAGNITUDE_MODES = ['FIXED', 'PERCENTAGE', 'DICE'] as const
export type MagnitudeMode = (typeof MAGNITUDE_MODES)[number]

export const MAGNITUDE_MODE_LABELS: Readonly<Record<MagnitudeMode, string>> = {
  FIXED: 'Cantidad fija',
  PERCENTAGE: 'Porcentaje',
  DICE: 'Dados',
}

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
