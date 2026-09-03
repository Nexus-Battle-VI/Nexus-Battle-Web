import { QueryState } from '@/components/ui/QueryState'
import { formatMoney } from '@/lib/format'
import { useOwnedItemDetail } from './useOwnedInventory'
import { ProductThumb } from './ProductThumb'
import { summarizeAttributes } from './attributesSummary'
import { lifecycleLabel, typeLabel } from './typeLabels'

export interface ItemDetailPanelProps {
  readonly itemReference: string | null
}

/**
 * Panel fijo del objeto seleccionado (RF-27).
 *
 * Vive en la misma vista que el listado: elegir una tarjeta lo actualiza sin
 * navegar. Compone la pertenencia (cantidad) con la información vigente del
 * producto que devuelve Player/Inventory. NO muestra calificación ni
 * comentarios: por decisión funcional pertenecen a E-commerce/Subasta.
 */
export const ItemDetailPanel = ({ itemReference }: ItemDetailPanelProps): React.JSX.Element => {
  const query = useOwnedItemDetail(itemReference)

  if (itemReference === null) {
    return (
      <aside
        aria-label="Detalle del objeto"
        className="rounded-lg border border-border bg-surface-raised p-4"
      >
        <p className="text-sm text-muted">Selecciona un objeto para ver su ficha.</p>
      </aside>
    )
  }

  const detail = query.data
  const attributes = detail === undefined ? null : summarizeAttributes(detail.product.attributes)

  return (
    <aside
      aria-label="Detalle del objeto"
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4"
    >
      <QueryState isLoading={query.isLoading} error={query.error}>
        {detail !== undefined && attributes !== null && (
          <>
            <ProductThumb
              src={detail.product.imageUrl}
              alt={detail.product.name}
              className="mx-auto max-w-52"
            />

            <div>
              <h2 className="text-lg font-semibold text-ink">{detail.product.name}</h2>
              <p className="mt-0.5 text-xs text-muted">
                {typeLabel(detail.product.type)} ·{' '}
                <span className="tabular-nums">x{detail.quantity}</span> en tu inventario ·{' '}
                {lifecycleLabel(detail.product.lifecycleStatus)}
              </p>
            </div>

            <p className="text-sm text-ink">{detail.product.description}</p>

            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <dt className="text-muted">Precio en créditos</dt>
              <dd className="tabular-nums text-ink">{detail.product.creditsPrice}</dd>

              {detail.product.premium && detail.product.realMoneyPrice !== null && (
                <>
                  <dt className="text-muted">Precio real</dt>
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
                  <dt className="text-muted">Ranura</dt>
                  <dd className="text-ink">{attributes.slot}</dd>
                </>
              )}

              {attributes.compatibility !== null && (
                <>
                  <dt className="text-muted">Compatibilidad</dt>
                  <dd className="text-ink">{attributes.compatibility}</dd>
                </>
              )}

              {attributes.heroSubtype !== null && (
                <>
                  <dt className="text-muted">Subtipo de héroe</dt>
                  <dd className="text-ink">{attributes.heroSubtype}</dd>
                </>
              )}
            </dl>

            {attributes.effects.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted">Efectos</h3>
                <ul className="mt-1 list-disc pl-4 text-xs text-ink">
                  {attributes.effects.map((effect, index) => (
                    <li key={`${effect}-${String(index)}`}>{effect}</li>
                  ))}
                </ul>
              </div>
            )}

            {attributes.abilities.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted">Habilidades vinculadas</h3>
                <ul className="mt-1 list-disc pl-4 text-xs text-ink">
                  {attributes.abilities.map((ability) => (
                    <li key={ability} className="break-all">
                      {ability}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </QueryState>
    </aside>
  )
}
