import { httpClient } from '@/lib/http'

/**
 * Cliente de "Configurar equipamiento del héroe" (HU-28).
 *
 * Consume Player/Inventory, que valida la pertenencia del héroe y del producto,
 * resuelve la información canónica en Catalog y recalcula las estadísticas. El
 * frontend NO calcula reglas: presenta lo que el backend devuelve. El backend
 * es la autoridad de las capacidades 2/6/2 y de la compatibilidad ranura/tipo.
 */

export const EQUIPMENT_SLOTS = [
  'WEAPON_1',
  'WEAPON_2',
  'HELMET',
  'CHEST',
  'GLOVES',
  'BRACERS',
  'PANTS',
  'SHOES',
  'ITEM_1',
  'ITEM_2',
] as const

export type EquipmentSlotId = (typeof EQUIPMENT_SLOTS)[number]

export interface EquippedProduct {
  readonly slot: EquipmentSlotId
  readonly itemId: string
  readonly productId: string
  readonly name: string
  readonly imageUrl: string
  readonly type: string
  readonly lifecycleStatus: string
}

export interface Magnitude {
  readonly mode: 'FIXED' | 'PERCENTAGE' | 'DICE'
  readonly amount?: number
  readonly basisPoints?: number
  readonly count?: number
  readonly sides?: number
}

export interface HeroStats {
  readonly power: number
  readonly health: number
  readonly defense: number
  readonly attack: number | null
  readonly damage: Magnitude | null
  readonly healing: Magnitude | null
}

export interface HeroStatDelta {
  readonly statistic: string
  readonly base: number
  readonly effective: number
  readonly delta: number
}

export interface EquippedEffect {
  readonly sourceSlot: EquipmentSlotId
  readonly sourceProductId: string
  readonly sourceProductReference: string
  readonly kind: string
  readonly target: string
  readonly statistic?: string
  readonly operation?: string
  readonly magnitude?: Magnitude
  readonly durationTurns?: number
  readonly hasActivationCondition: boolean
  /** `true` si el efecto ya se refleja en `effectiveStats`. */
  readonly appliedToStats: boolean
}

export interface HeroEquipment {
  readonly hero: {
    readonly heroId: string
    readonly reference: string
    readonly subtype: string
    readonly name: string
    readonly imageUrl: string
  }
  readonly equipment: {
    readonly weapons: readonly EquippedProduct[]
    readonly armor: Readonly<Record<string, EquippedProduct | null>>
    readonly items: readonly EquippedProduct[]
  }
  readonly baseStats: HeroStats
  readonly effectiveStats: HeroStats
  readonly deltas: readonly HeroStatDelta[]
  readonly activeEffects: readonly EquippedEffect[]
}

export const fetchHeroEquipment = (
  heroReference: string,
  signal?: AbortSignal,
): Promise<HeroEquipment> =>
  httpClient.get<HeroEquipment>(
    `/inventories/me/heroes/${encodeURIComponent(heroReference)}/equipment`,
    signal,
  )

export const equipItemOnHero = (params: {
  readonly heroReference: string
  readonly slot: EquipmentSlotId
  readonly productReference: string
}): Promise<HeroEquipment> =>
  httpClient.request<HeroEquipment>(
    `/inventories/me/heroes/${encodeURIComponent(params.heroReference)}/equipment/${params.slot}`,
    { method: 'PUT', body: { productReference: params.productReference } },
  )
