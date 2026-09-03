import type { EquipmentSlotId } from './api'

/**
 * Metadatos de presentación de cada ranura (HU-28).
 *
 * `productType` es el tipo canónico de Catalog que la ranura admite. Se usa
 * SOLO para realzar/atenuar productos en la rejilla y para el texto de ayuda:
 * el backend vuelve a validar todo. No introduce reglas nuevas.
 */
export interface SlotMeta {
  readonly id: EquipmentSlotId
  readonly label: string
  readonly group: 'weapons' | 'armor' | 'items'
  readonly productType: 'ARMA' | 'ARMADURA' | 'ITEM'
  /** Código `ArmorSlot` de Catalog que encaja, cuando aplica. */
  readonly armorSlot?: string
}

export const SLOT_META: readonly SlotMeta[] = [
  { id: 'WEAPON_1', label: 'Arma 1', group: 'weapons', productType: 'ARMA' },
  { id: 'WEAPON_2', label: 'Arma 2', group: 'weapons', productType: 'ARMA' },
  { id: 'HELMET', label: 'Casco', group: 'armor', productType: 'ARMADURA', armorSlot: 'HEAD' },
  { id: 'CHEST', label: 'Pecho', group: 'armor', productType: 'ARMADURA', armorSlot: 'CHEST' },
  { id: 'GLOVES', label: 'Guantes', group: 'armor', productType: 'ARMADURA', armorSlot: 'GLOVES' },
  {
    id: 'BRACERS',
    label: 'Brazaletes',
    group: 'armor',
    productType: 'ARMADURA',
    armorSlot: 'BRACERS',
  },
  { id: 'PANTS', label: 'Pantalón', group: 'armor', productType: 'ARMADURA', armorSlot: 'PANTS' },
  { id: 'SHOES', label: 'Zapatos', group: 'armor', productType: 'ARMADURA', armorSlot: 'SHOES' },
  { id: 'ITEM_1', label: 'Ítem 1', group: 'items', productType: 'ITEM' },
  { id: 'ITEM_2', label: 'Ítem 2', group: 'items', productType: 'ITEM' },
]

export const SLOT_META_BY_ID: ReadonlyMap<EquipmentSlotId, SlotMeta> = new Map(
  SLOT_META.map((meta) => [meta.id, meta]),
)

/** Familia de ranuras a la que pertenece un tipo canónico de producto. */
export const slotGroupForProductType = (
  productType: string | undefined,
): SlotMeta['group'] | null => {
  if (productType === 'ARMA') return 'weapons'
  if (productType === 'ARMADURA') return 'armor'
  if (productType === 'ITEM') return 'items'
  return null
}
