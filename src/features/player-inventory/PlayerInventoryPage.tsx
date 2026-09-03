import { useState } from 'react'

import { QueryState } from '@/components/ui/QueryState'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { ProductType } from './api'
import type { EquipmentSlotId } from './equipment/api'
import { HeroConfigurator, type OwnedHero } from './equipment/HeroConfigurator'
import { SLOT_META_BY_ID } from './equipment/slots'
import { InventoryGrid } from './InventoryGrid'
import { InventoryPagination } from './InventoryPagination'
import { InventoryToolbar } from './InventoryToolbar'
import { ItemDetailPanel } from './ItemDetailPanel'
import { effectiveSearch, useOwnedInventory } from './useOwnedInventory'

/**
 * "Mi Inventario" y "Configurar héroe" (HU-27 / HU-27.3 / HU-28).
 *
 * Consulta paginada (16), búsqueda por nombre desde 4 caracteres y filtro por
 * tipo. En la MISMA vista conviven el configurador de equipamiento del héroe, el
 * listado y la ficha de detalle, para minimizar el scroll. Elegir una ranura en
 * el configurador realza los productos compatibles del listado; con un producto
 * propio compatible seleccionado, "Equipar" ejecuta la operación en el backend,
 * que es la autoridad de las capacidades 2/6/2 y de la compatibilidad
 * ranura/tipo.
 */
export const PlayerInventoryPage = (): React.JSX.Element => {
  const [term, setTerm] = useState('')
  const [type, setType] = useState<ProductType | null>(null)
  const [page, setPage] = useState(1)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlotId | null>(null)

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

  // Los héroes configurables son los productos de tipo HEROE visibles en esta
  // vista del inventario. La pertenencia final la confirma el backend al
  // consultar el equipamiento; aquí no se finge ninguna.
  const ownedHeroes: OwnedHero[] = items
    .filter((item) => item.product?.type === 'HEROE')
    .map((item) => ({ reference: item.itemId, name: item.product?.name ?? item.itemId }))

  const highlightType =
    selectedSlot === null ? null : (SLOT_META_BY_ID.get(selectedSlot)?.productType ?? null)
  const selectedProductType =
    items.find((item) => item.itemId === selectedItemId)?.product?.type ?? null

  return (
    <section aria-label="Mi Inventario" className="flex flex-col gap-4">
      <div className="rounded-lg border border-border bg-surface-raised p-5">
        <h1 className="text-xl font-semibold text-ink">Mi Inventario</h1>
        <p className="mt-1 text-sm text-muted">
          Los objetos que posees y en qué cantidad. Selecciona uno para ver su ficha o para
          equiparlo en un héroe.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)_19rem] lg:items-start">
        <div className="lg:sticky lg:top-4">
          <HeroConfigurator
            ownedHeroes={ownedHeroes}
            selectedProductReference={selectedItemId}
            selectedProductType={selectedProductType}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
          />
        </div>

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
            {highlightType !== null && <> · compatibles con {highlightType} resaltados</>}
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
                highlightType={highlightType}
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
