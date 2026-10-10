import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { QueryState } from '@/components/ui/QueryState'

import { typeLabel } from '../typeLabels'
import type { HeroEquipment } from './api'
import { EquipmentEffectsList, HeroStatsTable } from './HeroStatsPanel'
import { slotLabel, type SlotMeta } from './slots'

export interface EquipmentManagerPanelProps {
  readonly heroName: string | null
  readonly hasHero: boolean
  readonly equipment: HeroEquipment | undefined
  readonly equipmentLoading: boolean
  readonly equipmentError: unknown
  readonly slotMeta: SlotMeta | null
  /** Producto elegido en el inventario (nombre y tipo, para el realce y el aviso). */
  readonly selectedProductName: string | null
  readonly selectedProductType: string | null
  readonly canEquip: boolean
  readonly equipping: boolean
  readonly equipError: string | null
  readonly onEquip: () => void
  /** HU-29: `true` mientras el héroe participa en una batalla activa. */
  readonly locked: boolean
  /**
   * HU-28.4: `true` cuando la ranura elegida está OCUPADA y la Ficha muestra
   * EXACTAMENTE ese producto equipado (no otro del catálogo) — la acción
   * principal pasa a ser Desequipar en lugar de Equipar. Nunca ambos botones
   * a la vez, salvo que la lógica real lo exigiera (no es el caso aquí).
   */
  readonly isUnequipContext: boolean
  readonly canUnequip: boolean
  readonly unequipping: boolean
  readonly unequipError: string | null
  readonly onUnequip: () => void
}

/**
 * Accion de "Equipar" + Estadisticas Base/Efectiva/Δ + Efectos del
 * equipamiento del heroe activo (HU-28). Vive en la Ficha del objeto
 * (columna derecha, `ItemDetailPanel`/`PlayerInventoryPage`), NUNCA en el
 * centro -- el centro solo tiene el escenario del heroe y sus ranuras
 * (ver `HeroManagerPanel`). Misma mutacion real que antes
 * (`useEquipItem`, levantada a `PlayerInventoryPage` como unica fuente de
 * verdad), ninguna logica duplicada.
 */
export const EquipmentManagerPanel = ({
  heroName,
  hasHero,
  equipment,
  equipmentLoading,
  equipmentError,
  slotMeta,
  selectedProductName,
  selectedProductType,
  canEquip,
  equipping,
  equipError,
  onEquip,
  locked,
  isUnequipContext,
  canUnequip,
  unequipping,
  unequipError,
  onUnequip,
}: EquipmentManagerPanelProps): React.JSX.Element | null => {
  const { t } = useTranslation()
  const productFits =
    slotMeta !== null &&
    selectedProductName !== null &&
    selectedProductType === slotMeta.productType

  if (!hasHero) return null

  return (
    <QueryState isLoading={equipmentLoading} error={equipmentError}>
      {equipment !== undefined && (
        <div className="inventory-equip-action">
          <h2 id="equipment-manager-title" className="text-sm font-semibold text-ink">
            {heroName === null
              ? t('inventory:equipment.title')
              : t('inventory:equipment.of', { name: heroName })}
          </h2>
          <span className="inventory-panel-divider" aria-hidden="true" />

          {slotMeta !== null && (
            <div className="rounded-md border border-border p-2 text-xs">
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
                      {t('inventory:equipment.selectedItem', { item: selectedProductName })}
                    </p>
                  )}
                </div>
                {isUnequipContext ? (
                  <button
                    type="button"
                    disabled={!canUnequip}
                    onClick={onUnequip}
                    className={clsx(
                      'inventory-btn-primary inventory-btn-danger min-h-11 px-4 py-2 text-sm font-semibold',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                    )}
                  >
                    {unequipping
                      ? t('inventory:equipment.unequipping')
                      : t('inventory:equipment.unequip')}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!canEquip}
                    onClick={onEquip}
                    className={clsx(
                      'inventory-btn-primary min-h-11 px-4 py-2 text-sm font-semibold',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                    )}
                  >
                    {equipping
                      ? t('inventory:equipment.equipping')
                      : t('inventory:equipment.equip')}
                  </button>
                )}
              </div>
              {isUnequipContext
                ? unequipError !== null && (
                    <p role="alert" className="mt-1 text-danger">
                      {unequipError}
                    </p>
                  )
                : equipError !== null && (
                    <p role="alert" className="mt-1 text-danger">
                      {equipError}
                    </p>
                  )}
              {/* El aviso con `role="status"` ya vive una sola vez, arriba
               * del escenario del heroe (`HeroManagerPanel`) -- aqui solo un
               * recordatorio de texto plano, sin region ARIA duplicada, para
               * quien ya scrolleo mas alla de ese aviso. */}
              {locked && (
                <p className="mt-1 text-warning">{t('inventory:equipment.battleLock.message')}</p>
              )}
            </div>
          )}

          <div className="inventory-stats-ledger mt-3">
            <HeroStatsTable equipment={equipment} />
          </div>
          <div className="inventory-effects-ledger mt-3">
            <EquipmentEffectsList equipment={equipment} />
          </div>
        </div>
      )}
    </QueryState>
  )
}
