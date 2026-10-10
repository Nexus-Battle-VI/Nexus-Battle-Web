import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import type { EquipmentCapacity } from '../heroSelectionApi'
import { ProductThumb } from '../ProductThumb'
import type { EquipmentSlotId, HeroEquipment } from './api'
import { SLOT_META, slotLabel, type SlotMeta } from './slots'

type SlotGroup = SlotMeta['group']

export interface EquipmentSlotsProps {
  readonly equipment: HeroEquipment | undefined
  readonly selectedSlot: EquipmentSlotId | null
  readonly disabled: boolean
  readonly onSelectSlot: (slot: EquipmentSlotId) => void
  /**
   * Tipo del producto elegido en el inventario. Las ranuras que lo admiten se
   * marcan como compatibles (misma regla de presentacion de `slots.ts`; el
   * backend vuelve a validar al equipar).
   */
  readonly compatibleType?: string | null
  /** Ocupacion 2/6/2 tal como la informa el servicio (solo del heroe preparado). */
  readonly capacity?: Readonly<Record<SlotGroup, EquipmentCapacity>> | null
  /**
   * Al elegir una ranura OCUPADA, tambien se informa el `itemId` real del
   * producto equipado (campo real de `EquippedProduct`, nunca inventado) para
   * que la Ficha pueda mostrar ese objeto en vez del ultimo elegido en el
   * catalogo -- gate "selecciona un slot ocupado -> Detail debe mostrar el
   * item equipado real". `null` si la ranura estaba vacia.
   */
  readonly onSelectEquippedItem?: (itemId: string | null) => void
  /**
   * Drag & Drop (metodo ALTERNATIVO al click, que SIGUE intacto): se
   * dispara SOLO cuando el drop fue sobre una ranura compatible -este
   * componente ya valido `productType === meta.productType` antes de
   * llamarlo, igual que ya hace para pintar el resaltado verde-.
   */
  readonly onDropItem?:
    ((slot: EquipmentSlotId, itemId: string, productType: string) => void) | undefined
}

/** Mismo MIME que `InventoryGrid.tsx` -- el payload del drag es SOLO
 * `{itemId, productType}`, nunca datos de negocio nuevos. */
const DRAG_MIME = 'application/x-nexus-inventory-item'

interface DragPayload {
  readonly itemId: string
  readonly productType: string
}

const parseDragPayload = (raw: string): DragPayload | null => {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'itemId' in parsed &&
      'productType' in parsed &&
      typeof parsed.itemId === 'string' &&
      typeof parsed.productType === 'string'
    ) {
      return { itemId: parsed.itemId, productType: parsed.productType }
    }
  } catch {
    /* Un payload invalido simplemente no suelta nada: no revienta la UI. */
  }
  return null
}

const equippedInSlot = (
  equipment: HeroEquipment | undefined,
  meta: SlotMeta,
): HeroEquipment['equipment']['weapons'][number] | null => {
  if (equipment === undefined) return null
  if (meta.group === 'armor') return equipment.equipment.armor[meta.id] ?? null
  const list = meta.group === 'weapons' ? equipment.equipment.weapons : equipment.equipment.items
  return list.find((entry) => entry.slot === meta.id) ?? null
}

const GROUP_KEYS: Readonly<Record<SlotGroup, string>> = {
  weapons: 'inventory:equipment.groups.weapons',
  armor: 'inventory:equipment.groups.armor',
  items: 'inventory:equipment.groups.items',
}

interface SlotGroupListProps extends Omit<EquipmentSlotsProps, 'capacity'> {
  readonly group: SlotGroup
  readonly capacity: EquipmentCapacity | null
  readonly columns: string
  /**
   * Subconjunto REAL de `SLOT_META` a renderizar (mismos objetos, misma
   * fuente de verdad) -- permite componer layouts (ej. armadura partida en
   * dos columnas alrededor del heroe) sin inventar ranuras ni duplicar
   * metadatos. Por defecto, todas las del grupo.
   */
  readonly slots?: readonly SlotMeta[]
  /** Oculta el encabezado "Grupo · usado/max" cuando el layout externo ya lo muestra. */
  readonly hideHeader?: boolean
}

export const SlotGroupList = ({
  group,
  capacity,
  columns,
  slots,
  hideHeader = false,
  equipment,
  selectedSlot,
  disabled,
  onSelectSlot,
  onSelectEquippedItem,
  compatibleType = null,
  onDropItem,
}: SlotGroupListProps): React.JSX.Element => {
  const { t } = useTranslation()
  const groupLabel = t(GROUP_KEYS[group])
  const groupSlots = slots ?? SLOT_META.filter((meta) => meta.group === group)

  return (
    <div className="min-w-0">
      {!hideHeader && (
        <p className="flex items-baseline justify-between gap-2 text-xs text-muted">
          <span>{groupLabel}</span>
          {capacity !== null && (
            <span
              className="tabular-nums"
              aria-label={t('inventory:equipment.capacityLabel', {
                group: groupLabel,
                used: String(capacity.used),
                max: String(capacity.max),
              })}
            >
              {t('inventory:equipment.capacity', {
                used: String(capacity.used),
                max: String(capacity.max),
              })}
            </span>
          )}
        </p>
      )}
      <ul
        className={clsx('mt-1 grid gap-1.5', columns)}
        aria-label={t('inventory:equipment.slotsOf', { group: groupLabel })}
      >
        {groupSlots.map((meta) => {
          const equipped = equippedInSlot(equipment, meta)
          const selected = selectedSlot === meta.id
          const compatible = compatibleType !== null && compatibleType === meta.productType
          const label = slotLabel(meta.id)

          return (
            <li key={meta.id}>
              <button
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                aria-label={
                  equipped === null
                    ? t('inventory:equipment.slotEmpty', { slot: label })
                    : t('inventory:equipment.slotFilled', { slot: label, item: equipped.name })
                }
                aria-describedby={compatible ? 'equipment-slot-compatible' : undefined}
                data-testid={`slot-${meta.id}`}
                data-compatible={compatible ? 'true' : undefined}
                data-filled={equipped !== null ? 'true' : undefined}
                title={equipped?.name ?? label}
                onClick={() => {
                  onSelectSlot(meta.id)
                  onSelectEquippedItem?.(equipped?.itemId ?? null)
                }}
                /*
                 * Drag & Drop (HU-28, metodo ALTERNATIVO al click, que SIGUE
                 * intacto): toda la superficie del boton es el target de
                 * drop (gate "no solo el centro/el +"). `onDragOver` solo
                 * hace `preventDefault` -lo que habilita el drop- cuando el
                 * tipo arrastrado es REALMENTE compatible con esta ranura
                 * (misma condicion `compatible` que ya pinta el resaltado
                 * verde); si no, el navegador conserva el cursor "no
                 * permitido" por su cuenta, sin logica nueva.
                 */
                onDragOver={(event) => {
                  if (disabled || !compatible) return
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'copy'
                }}
                onDrop={(event) => {
                  if (disabled || !compatible) return
                  event.preventDefault()
                  const raw = event.dataTransfer.getData(DRAG_MIME)
                  const payload = raw === '' ? null : parseDragPayload(raw)
                  if (payload?.productType !== meta.productType) return
                  onDropItem?.(meta.id, payload.itemId, payload.productType)
                }}
                className={clsx(
                  'inventory-slot flex min-h-11 w-full flex-col items-center gap-1 p-1.5 text-center',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                )}
              >
                {/*
                 * CORRECCION (7a pasada): la pieza ornamental (Family 04)
                 * ahora pinta SOLO este `<span>` -el "media frame"-, nunca
                 * el `<button>` completo. El nombre deja de "vivir dentro"
                 * del asset (encima de las gemas) y pasa a vivir DEBAJO,
                 * en flujo normal, como hermano de este span.
                 */}
                <span className="inventory-slot-media flex size-[88px] shrink-0 items-center justify-center">
                  {equipped === null ? (
                    <span aria-hidden="true" className="text-xl text-muted">
                      +
                    </span>
                  ) : (
                    <span className="block size-full p-2">
                      <ProductThumb src={equipped.imageUrl} alt={equipped.name} />
                    </span>
                  )}
                </span>
                <span className="inventory-slot-label w-full">
                  {equipped === null ? label : equipped.name}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * Las diez ranuras funcionales de HU-28 en formato compacto: armas e ítems en
 * una fila, las seis piezas de armadura en una rejilla de 3×2. Cada ranura es
 * un boton real (`aria-pressed`, foco visible, ≥ 44 px): seleccionarla realza
 * en el inventario los productos compatibles. Ocupada muestra el producto;
 * vacia, un marcador con el nombre de la ranura.
 */
export const EquipmentSlots = ({
  capacity = null,
  ...props
}: EquipmentSlotsProps): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <SlotGroupList
          {...props}
          group="weapons"
          capacity={capacity?.weapons ?? null}
          columns="grid-cols-2"
        />
        <SlotGroupList
          {...props}
          group="items"
          capacity={capacity?.items ?? null}
          columns="grid-cols-2"
        />
      </div>
      <SlotGroupList
        {...props}
        group="armor"
        capacity={capacity?.armor ?? null}
        columns="grid-cols-3"
      />
      <span id="equipment-slot-compatible" className="sr-only">
        {t('inventory:equipment.slotCompatible')}
      </span>
    </div>
  )
}
