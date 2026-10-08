import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { QueryState } from '@/components/ui/QueryState'

import type { HeroEpic, HeroEpicState } from './epicApi'
import { ProductThumb } from '../ProductThumb'
import { describeEquipmentEffect } from './effectPresentation'

export interface EpicManagerPanelProps {
  readonly heroName: string | null
  readonly hasHero: boolean
  readonly epic: HeroEpicState | undefined
  readonly epicLoading: boolean
  readonly epicError: unknown
  /** `true` mientras el jugador esta elegiendo una epica del inventario para equiparla. */
  readonly selecting: boolean
  readonly onToggleSelecting: () => void
  /** Producto elegido en el inventario (nombre, para el aviso de "seleccionado"). */
  readonly selectedProductName: string | null
  readonly selectedProductType: string | null
  readonly canEquip: boolean
  readonly equipping: boolean
  readonly equipError: string | null
  readonly onEquip: () => void
  /** HU-29: `true` mientras el heroe participa en una batalla activa. */
  readonly locked: boolean
}

const EpicEffectRow = ({
  labelKey,
  labelValues,
  effect,
  applied,
}: {
  readonly labelKey: string
  readonly labelValues?: Readonly<Record<string, unknown>>
  readonly effect: HeroEpic['baseEffect']
  readonly applied: boolean
}): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 rounded border border-border px-2 py-1">
      <span className="text-muted">
        {labelValues === undefined ? t(labelKey) : t(labelKey, labelValues)}
      </span>
      <span className={clsx('text-right', applied ? 'text-ink' : 'text-muted line-through')}>
        {effect === null ? t('inventory:epic.notApplicable') : describeEquipmentEffect(effect)}
      </span>
    </li>
  )
}

/**
 * Epica equipada del heroe (HU-31, contrato `hu-31-equipped-epic-v1`).
 *
 * Presenta exactamente lo que el backend ya resolvio: el efecto general, el
 * especifico, y cual de los dos esta REALMENTE aplicado (`applied.*`) segun
 * el subtipo del heroe. No compara subtipos ni decide compatibilidad: si
 * `applied.additionalApplied` es `null`, el especifico se muestra tachado,
 * sin que este componente sepa (ni necesite saber) por que.
 *
 * Seleccionar una epica nueva reutiliza la MISMA rejilla de inventario que
 * armas/armadura/items (via `selecting`/`onToggleSelecting`, que el
 * contenedor traduce a `highlightType = 'EPICA'`); no es una pantalla
 * paralela.
 */
export const EpicManagerPanel = ({
  heroName,
  hasHero,
  epic,
  epicLoading,
  epicError,
  selecting,
  onToggleSelecting,
  selectedProductName,
  selectedProductType,
  canEquip,
  equipping,
  equipError,
  onEquip,
  locked,
}: EpicManagerPanelProps): React.JSX.Element => {
  const { t } = useTranslation()
  const current = epic?.epic ?? null
  const productFits = selecting && selectedProductName !== null && selectedProductType === 'EPICA'

  return (
    <section
      aria-labelledby="epic-manager-title"
      className="inventory-panel flex min-w-0 flex-col gap-3 p-4"
    >
      <h2 id="epic-manager-title" className="text-sm font-semibold text-ink">
        {heroName === null
          ? t('inventory:epic.title')
          : t('inventory:epic.title') + ' — ' + heroName}
      </h2>
      <span className="inventory-panel-divider" aria-hidden="true" />

      {!hasHero ? (
        <p className="text-xs text-muted">{t('inventory:epic.chooseHero')}</p>
      ) : (
        <QueryState isLoading={epicLoading} error={epicError}>
          {epic !== undefined && (
            <>
              {locked && (
                <p
                  role="status"
                  className="flex items-center gap-2 rounded-md border border-warning bg-warning/10 p-2 text-xs text-ink"
                >
                  <img
                    src="/assets/inventory/status-decorations/locked-badge-light.png"
                    alt=""
                    aria-hidden="true"
                    className="inventory-status-icon inventory-status-icon--locked"
                  />
                  {t('inventory:epic.battleLock.message')}
                </p>
              )}

              <div className="flex items-start gap-3">
                <span className="block size-11 shrink-0">
                  <ProductThumb src={current?.imageUrl ?? null} alt={current?.name ?? ''} />
                </span>
                <div className="min-w-0 flex-1">
                  {current === null ? (
                    <p className="text-xs text-muted">{t('inventory:epic.none')}</p>
                  ) : (
                    <>
                      <p className="truncate text-sm text-ink" title={current.name}>
                        {t('inventory:epic.equipped', { name: current.name })}
                      </p>
                      <p className="text-xs text-muted">
                        {(epic.epic?.applied.additionalApplied.length ?? 0) > 0
                          ? t('inventory:epic.compatible', {
                              subtype: current.compatibleHeroSubtype,
                            })
                          : t('inventory:epic.incompatible')}
                      </p>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  disabled={equipping || locked}
                  aria-pressed={selecting}
                  onClick={onToggleSelecting}
                  className={clsx(
                    'inventory-chip shrink-0 px-3 py-2 text-xs font-semibold',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                >
                  {selecting ? t('inventory:epic.cancelSelect') : t('inventory:epic.select')}
                </button>
              </div>

              {current !== null && (
                <ul className="flex flex-col gap-1 text-sm">
                  <EpicEffectRow
                    labelKey="inventory:epic.generalEffect"
                    effect={current.baseEffect}
                    applied={epic.epic?.applied.baseApplied !== null}
                  />
                  {current.specificEffects.map((effect, index) => (
                    <EpicEffectRow
                      key={`specific-${String(index)}`}
                      labelKey={
                        current.specificEffects.length > 1
                          ? 'inventory:epic.specificEffectN'
                          : 'inventory:epic.specificEffect'
                      }
                      effect={effect}
                      applied={(epic.epic?.applied.additionalApplied.length ?? 0) > 0}
                      {...(current.specificEffects.length > 1
                        ? { labelValues: { index: index + 1 } }
                        : {})}
                    />
                  ))}
                </ul>
              )}

              {selecting && (
                <div
                  className={clsx(
                    'rounded-md border p-2 text-xs',
                    productFits ? 'border-border' : 'border-dashed border-border',
                  )}
                >
                  <p className="text-muted">{t('inventory:epic.selectHint')}</p>
                  {productFits && (
                    <p className="truncate text-ink" title={selectedProductName}>
                      {t('inventory:epic.selectedItem', { item: selectedProductName })}
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={!canEquip}
                    onClick={onEquip}
                    className={clsx(
                      'inventory-btn-primary mt-2 min-h-11 px-4 py-2 text-sm font-semibold',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                    )}
                  >
                    {equipping ? t('inventory:epic.equipping') : t('inventory:epic.equip')}
                  </button>
                  {equipError !== null && (
                    <p role="alert" className="mt-1 text-danger">
                      {equipError}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </QueryState>
      )}
    </section>
  )
}
