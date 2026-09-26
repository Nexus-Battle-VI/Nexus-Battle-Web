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
}

const SlotGroupList = ({
  group,
  capacity,
  columns,
  equipment,
  selectedSlot,
  disabled,
  onSelectSlot,
  compatibleType = null,
}: SlotGroupListProps): React.JSX.Element => {
  const { t } = useTranslation()
  const groupLabel = t(GROUP_KEYS[group])

  return (
    <div className="min-w-0">
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
      <ul
        className={clsx('mt-1 grid gap-1.5', columns)}
        aria-label={t('inventory:equipment.slotsOf', { group: groupLabel })}
      >
        {SLOT_META.filter((meta) => meta.group === group).map((meta) => {
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
                title={equipped?.name ?? label}
                onClick={() => {
                  onSelectSlot(meta.id)
                }}
                className={clsx(
                  'flex min-h-11 w-full flex-col items-center gap-1 rounded-md border p-1.5 text-center transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  selected
                    ? 'border-brand bg-brand/10 ring-1 ring-brand'
                    : compatible
                      ? 'border-dashed border-success hover:border-brand'
                      : 'border-border hover:border-brand',
                )}
              >
                {equipped === null ? (
                  <span
                    aria-hidden="true"
                    className="flex size-11 items-center justify-center rounded bg-surface text-lg text-muted"
                  >
                    +
                  </span>
                ) : (
                  <span className="block size-11 shrink-0">
                    <ProductThumb src={equipped.imageUrl} alt={equipped.name} />
                  </span>
                )}
                <span
                  className={clsx(
                    'w-full truncate text-xs leading-tight',
                    equipped === null ? 'text-muted' : 'text-ink',
                  )}
                >
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
