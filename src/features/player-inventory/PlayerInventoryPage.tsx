import { useState } from 'react'

import { QueryState } from '@/components/ui/QueryState'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { ProductType } from './api'
import { HeroAnchor } from './HeroAnchor'
import { InventoryGrid } from './InventoryGrid'
import { InventoryPagination } from './InventoryPagination'
import { InventoryToolbar } from './InventoryToolbar'
import { ItemDetailPanel } from './ItemDetailPanel'
import { effectiveSearch, useOwnedInventory } from './useOwnedInventory'

/**
 * "Mi Inventario" (HU-27 / HU-27.3).
 *
 * Consulta self-service, paginada (16) y con búsqueda por nombre desde 4
 * caracteres, más filtro por tipo canónico. La selección de una tarjeta
 * actualiza el panel de detalle en la MISMA vista, para minimizar el scroll: en
 * escritorio, el personaje de referencia, el listado y la ficha conviven sin
 * navegar. Equipar/desequipar es HU-28 y aquí solo se prepara la estructura.
 */
export const PlayerInventoryPage = (): React.JSX.Element => {
  const [term, setTerm] = useState('')
  const [type, setType] = useState<ProductType | null>(null)
  const [page, setPage] = useState(1)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  const debouncedTerm = useDebouncedValue(term, 300)
  const searching = effectiveSearch(debouncedTerm) !== ''

  // Al cambiar la búsqueda o el filtro se vuelve a la primera página y se suelta
  // la selección: mantenerla mostraría una ficha que ya no está en pantalla. Se
  // ajusta durante el render comparando con el criterio anterior — el patrón
  // recomendado por React frente a un efecto que llama a setState.
  const criterion = `${effectiveSearch(debouncedTerm)} ${type ?? ''}`
  const [appliedCriterion, setAppliedCriterion] = useState(criterion)

  if (criterion !== appliedCriterion) {
    setAppliedCriterion(criterion)
    setPage(1)
    setSelectedItemId(null)
  }

  const query = useOwnedInventory({ page, term: debouncedTerm, type })
  const data = query.data
  const items = data?.items ?? []
  const totalItems = data?.totalItems ?? 0

  return (
    <section aria-label="Mi Inventario" className="flex flex-col gap-4">
      <div className="rounded-lg border border-border bg-surface-raised p-5">
        <h1 className="text-xl font-semibold text-ink">Mi Inventario</h1>
        <p className="mt-1 text-sm text-muted">
          Los objetos que posees y en qué cantidad. Selecciona uno para ver su ficha.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)_19rem] lg:items-start">
        <HeroAnchor />

        <div className="flex flex-col gap-3">
          <InventoryToolbar term={term} type={type} onTermChange={setTerm} onTypeChange={setType} />

          <p role="status" className="text-xs text-muted">
            {query.isFetching && !query.isLoading ? 'Actualizando… ' : ''}
            {totalItems} objeto{totalItems === 1 ? '' : 's'}
            {data !== undefined && data.totalPages > 1 && (
              <>
                {' '}
                · página {data.page} de {data.totalPages}
              </>
            )}
          </p>

          <QueryState
            isLoading={query.isLoading}
            error={query.error}
            isEmpty={data !== undefined && items.length === 0}
            emptyMessage={
              searching || type !== null
                ? 'Ningún objeto de tu inventario coincide con la búsqueda o el filtro.'
                : 'Tu inventario está vacío.'
            }
          >
            <>
              <InventoryGrid
                items={items}
                selectedItemId={selectedItemId}
                onSelect={setSelectedItemId}
              />

              {data !== undefined && (
                <InventoryPagination
                  page={data.page}
                  totalPages={data.totalPages}
                  onChange={setPage}
                />
              )}
            </>
          </QueryState>
        </div>

        <div className="lg:sticky lg:top-4">
          <ItemDetailPanel itemReference={selectedItemId} />
        </div>
      </div>
    </section>
  )
}
