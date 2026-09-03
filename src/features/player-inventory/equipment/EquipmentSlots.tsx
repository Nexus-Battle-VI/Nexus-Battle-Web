import clsx from 'clsx'

import type { EquipmentSlotId, HeroEquipment } from './api'
import { ProductThumb } from '../ProductThumb'
import { SLOT_META, type SlotMeta } from './slots'

export interface EquipmentSlotsProps {
  readonly equipment: HeroEquipment | undefined
  readonly selectedSlot: EquipmentSlotId | null
  readonly disabled: boolean
  readonly onSelectSlot: (slot: EquipmentSlotId) => void
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

const GROUP_LABEL: Readonly<Record<SlotMeta['group'], string>> = {
  weapons: 'Armas',
  armor: 'Armadura',
  items: 'Ítems',
}

/**
 * Las diez ranuras funcionales de HU-28: 2 armas, 6 piezas de armadura —una por
 * ranura exacta— y 2 ítems. Cada ranura es un botón real: seleccionarla realza
 * en la rejilla los productos compatibles. Ocupada muestra el producto; vacía,
 * un marcador con el nombre de la ranura.
 */
export const EquipmentSlots = ({
  equipment,
  selectedSlot,
  disabled,
  onSelectSlot,
}: EquipmentSlotsProps): React.JSX.Element => {
  const groups: readonly SlotMeta['group'][] = ['weapons', 'armor', 'items']

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <div key={group}>
          <p className="text-xs text-muted">{GROUP_LABEL[group]}</p>
          <ul
            className={clsx('mt-1 grid gap-1.5', group === 'armor' ? 'grid-cols-3' : 'grid-cols-2')}
            aria-label={`Ranuras de ${GROUP_LABEL[group]}`}
          >
            {SLOT_META.filter((meta) => meta.group === group).map((meta) => {
              const equipped = equippedInSlot(equipment, meta)
              const selected = selectedSlot === meta.id

              return (
                <li key={meta.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    aria-pressed={selected}
                    aria-label={
                      equipped === null
                        ? `${meta.label}: vacío. Elegir esta ranura`
                        : `${meta.label}: ${equipped.name}. Elegir esta ranura`
                    }
                    data-testid={`slot-${meta.id}`}
                    onClick={() => {
                      onSelectSlot(meta.id)
                    }}
                    className={clsx(
                      'flex h-full w-full flex-col items-center gap-1 rounded border p-1.5 text-center transition-colors',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      selected
                        ? 'border-brand ring-1 ring-brand'
                        : 'border-border hover:border-brand',
                    )}
                  >
                    {equipped === null ? (
                      <>
                        <span
                          aria-hidden="true"
                          className="flex aspect-square w-full items-center justify-center rounded bg-surface text-lg text-muted"
                        >
                          +
                        </span>
                        <span className="text-[11px] leading-tight text-muted">{meta.label}</span>
                      </>
                    ) : (
                      <>
                        <ProductThumb src={equipped.imageUrl} alt={equipped.name} />
                        <span
                          className="w-full truncate text-[11px] leading-tight text-ink"
                          title={equipped.name}
                        >
                          {equipped.name}
                        </span>
                      </>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
