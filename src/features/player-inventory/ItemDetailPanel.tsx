import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { QueryState } from '@/components/ui/QueryState'
import { formatMoney } from '@/lib/format'
import { formatInteger } from '@/shared/i18n/format'

import type { EquipmentSlotId } from './equipment/api'
import { SLOT_META_BY_ID, slotLabel } from './equipment/slots'
import { useOwnedItemDetail } from './useOwnedInventory'
import { useAvailableHeroes } from './useHeroSelection'
import { ProductThumb } from './ProductThumb'
import { summarizeAttributes } from './attributesSummary'
import { lifecycleLabel, typeLabel } from './typeLabels'

export interface ItemDetailPanelProps {
  readonly itemReference: string | null
  /** Ranura elegida en el gestor de equipamiento, para decir si el objeto encaja. */
  readonly selectedSlot?: EquipmentSlotId | null
}

/**
 * Nombre de cada habilidad segun el contrato de heroes (`GET /inventories/me/heroes`,
 * `abilities[].name`). Solo empareja la MISMA referencia: si no hay nombre, se
 * muestra la referencia tal cual; no se inventa ninguna asociacion.
 */
const useAbilityNames = (): ReadonlyMap<string, string> => {
  const heroes = useAvailableHeroes()
  const names = new Map<string, string>()

  for (const hero of heroes.data ?? []) {
    for (const ability of hero.abilities) {
      if (ability.name !== null) names.set(ability.reference, ability.name)
    }
  }

  return names
}

/**
 * D. Ficha del objeto seleccionado (RF-27).
 *
 * Vive en la misma vista que el listado: elegir una tarjeta la actualiza sin
 * navegar. Compone la pertenencia (cantidad) con la información vigente del
 * producto que devuelve Player/Inventory. NO muestra calificación ni
 * comentarios: por decisión funcional pertenecen a E-commerce/Subasta. El
 * nombre y la descripcion son contenido de Catalog y no se traducen.
 */
export const ItemDetailPanel = ({
  itemReference,
  selectedSlot = null,
}: ItemDetailPanelProps): React.JSX.Element => {
  const { t } = useTranslation()
  const query = useOwnedItemDetail(itemReference)
  const abilityNames = useAbilityNames()

  if (itemReference === null) {
    return (
      <aside
        aria-label={t('inventory:detail.label')}
        className="rounded-lg border border-dashed border-border bg-surface-raised p-4"
      >
        <p className="text-sm text-muted">{t('inventory:detail.empty')}</p>
      </aside>
    )
  }

  const detail = query.data
  const attributes = detail === undefined ? null : summarizeAttributes(detail.product.attributes)
  const slotMeta = selectedSlot === null ? null : (SLOT_META_BY_ID.get(selectedSlot) ?? null)

  return (
    <aside
      aria-label={t('inventory:detail.label')}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4"
    >
      <QueryState isLoading={query.isLoading} error={query.error}>
        {detail !== undefined && attributes !== null && (
          <>
            <div className="flex items-start gap-3">
              <ProductThumb
                src={detail.product.imageUrl}
                alt={detail.product.name}
                className="max-w-28 shrink-0 basis-28"
              />

              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-ink">{detail.product.name}</h2>
                <p className="mt-0.5 text-xs text-muted">
                  {typeLabel(detail.product.type)} ·{' '}
                  <span className="tabular-nums">
                    {t('inventory:detail.quantity', { value: formatInteger(detail.quantity) })}
                  </span>{' '}
                  · {lifecycleLabel(detail.product.lifecycleStatus)}
                </p>
                {slotMeta !== null && (
                  <p
                    className={clsx(
                      'mt-1 inline-block rounded-full px-2 py-0.5 text-xs',
                      detail.product.type === slotMeta.productType
                        ? 'bg-success/15 text-success'
                        : 'bg-surface text-muted',
                    )}
                  >
                    {detail.product.type === slotMeta.productType
                      ? t('inventory:detail.fitsSlot', { slot: slotLabel(slotMeta.id) })
                      : t('inventory:detail.notForSlot', { slot: slotLabel(slotMeta.id) })}
                  </p>
                )}
              </div>
            </div>

            <p className="text-sm text-ink">{detail.product.description}</p>

            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <dt className="text-muted">{t('inventory:detail.creditsPrice')}</dt>
              <dd className="tabular-nums text-ink">
                {formatInteger(detail.product.creditsPrice)}
              </dd>

              {detail.product.premium && detail.product.realMoneyPrice !== null && (
                <>
                  <dt className="text-muted">{t('inventory:detail.realPrice')}</dt>
                  <dd className="tabular-nums text-ink">
                    {formatMoney(
                      detail.product.realMoneyPrice.amount,
                      detail.product.realMoneyPrice.currency,
                    )}
                  </dd>
                </>
              )}

              {attributes.slot !== null && (
                <>
                  <dt className="text-muted">{t('inventory:detail.slot')}</dt>
                  <dd className="text-ink">{attributes.slot}</dd>
                </>
              )}

              {attributes.compatibility !== null && (
                <>
                  <dt className="text-muted">{t('inventory:detail.compatibility')}</dt>
                  <dd className="text-ink">{attributes.compatibility}</dd>
                </>
              )}

              {attributes.heroSubtype !== null && (
                <>
                  <dt className="text-muted">{t('inventory:detail.heroSubtype')}</dt>
                  <dd className="text-ink">{attributes.heroSubtype}</dd>
                </>
              )}
            </dl>

            {attributes.effects.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted">
                  {t('inventory:detail.effects')}
                </h3>
                <ul className="mt-1 list-disc pl-4 text-sm text-ink">
                  {attributes.effects.map((effect, index) => (
                    <li key={`${effect}-${String(index)}`}>{effect}</li>
                  ))}
                </ul>
              </div>
            )}

            {attributes.abilities.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted">
                  {t('inventory:detail.abilities')}
                </h3>
                <ul className="mt-1 list-disc pl-4 text-sm text-ink">
                  {attributes.abilities.map((ability) => {
                    const name = abilityNames.get(ability)

                    return (
                      <li key={ability} className={name === undefined ? 'break-all' : undefined}>
                        {name ?? ability}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </QueryState>
    </aside>
  )
}
