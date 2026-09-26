import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { QueryState } from '@/components/ui/QueryState'

import type { EquipmentCapacity } from '../heroSelectionApi'
import { typeLabel } from '../typeLabels'
import type { EquipmentSlotId, HeroEquipment } from './api'
import { EquipmentSlots } from './EquipmentSlots'
import { EquipmentEffectsList, HeroStatsTable } from './HeroStatsPanel'
import { slotLabel, type SlotMeta } from './slots'

export interface EquipmentManagerPanelProps {
  readonly heroName: string | null
  readonly hasHero: boolean
  readonly equipment: HeroEquipment | undefined
  readonly equipmentLoading: boolean
  readonly equipmentError: unknown
  readonly selectedSlot: EquipmentSlotId | null
  readonly slotMeta: SlotMeta | null
  readonly onSelectSlot: (slot: EquipmentSlotId) => void
  /** Producto elegido en el inventario (nombre y tipo, para el realce y el aviso). */
  readonly selectedProductName: string | null
  readonly selectedProductType: string | null
  readonly capacity: Readonly<Record<SlotMeta['group'], EquipmentCapacity>> | null
  readonly canEquip: boolean
  readonly equipping: boolean
  readonly equipError: string | null
  readonly onEquip: () => void
}

/**
 * B. Gestor de equipamiento (HU-28): diez ranuras compactas, la barra de
 * «Equipar», las estadisticas Base/Efectiva/Δ con el daño como magnitud y los
 * efectos. Todo sale del servicio; aqui solo se ordena para leerse de un
 * vistazo. En pantallas anchas, ranuras y estadisticas van lado a lado.
 */
export const EquipmentManagerPanel = ({
  heroName,
  hasHero,
  equipment,
  equipmentLoading,
  equipmentError,
  selectedSlot,
  slotMeta,
  onSelectSlot,
  selectedProductName,
  selectedProductType,
  capacity,
  canEquip,
  equipping,
  equipError,
  onEquip,
}: EquipmentManagerPanelProps): React.JSX.Element => {
  const { t } = useTranslation()
  const productFits =
    slotMeta !== null &&
    selectedProductName !== null &&
    selectedProductType === slotMeta.productType

  return (
    <section
      aria-labelledby="equipment-manager-title"
      className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4"
    >
      <h2 id="equipment-manager-title" className="text-sm font-semibold text-ink">
        {heroName === null
          ? t('inventory:equipment.title')
          : t('inventory:equipment.of', { name: heroName })}
      </h2>

      {!hasHero ? (
        <p className="text-xs text-muted">{t('inventory:equipment.chooseHero')}</p>
      ) : (
        <QueryState isLoading={equipmentLoading} error={equipmentError}>
          {equipment !== undefined && (
            <>
              <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="flex min-w-0 flex-col gap-3">
                  <EquipmentSlots
                    equipment={equipment}
                    selectedSlot={selectedSlot}
                    disabled={equipping}
                    compatibleType={selectedProductType}
                    capacity={capacity}
                    onSelectSlot={onSelectSlot}
                  />

                  <div
                    className={clsx(
                      'rounded-md border p-2 text-xs',
                      slotMeta === null ? 'border-dashed border-border' : 'border-border',
                    )}
                  >
                    {slotMeta === null ? (
                      <p className="text-muted">{t('inventory:equipment.pickSlotHint')}</p>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-muted">
                            {t('inventory:equipment.slotHint', {
                              slot: slotLabel(slotMeta.id),
                              type: typeLabel(slotMeta.productType),
                            })}
                          </p>
                          {productFits && (
                            <p className="truncate text-ink" title={selectedProductName}>
                              {t('inventory:equipment.selectedItem', {
                                item: selectedProductName,
                              })}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={!canEquip}
                          onClick={onEquip}
                          className={clsx(
                            'min-h-11 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white',
                            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                          )}
                        >
                          {equipping
                            ? t('inventory:equipment.equipping')
                            : t('inventory:equipment.equip')}
                        </button>
                      </div>
                    )}
                    {equipError !== null && (
                      <p role="alert" className="mt-1 text-danger">
                        {equipError}
                      </p>
                    )}
                  </div>
                </div>

                <HeroStatsTable equipment={equipment} />
              </div>

              <EquipmentEffectsList equipment={equipment} />
            </>
          )}
        </QueryState>
      )}
    </section>
  )
}
