import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { QueryState } from '@/components/ui/QueryState'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { countLabel } from '@/shared/i18n/format'

import type { ProductType } from './api'
import type { EquipmentSlotId } from './equipment/api'
import { HeroConfigurator } from './equipment/HeroConfigurator'
import { SLOT_META_BY_ID } from './equipment/slots'
import { InventoryGrid } from './InventoryGrid'
import { InventoryPagination } from './InventoryPagination'
import { InventoryToolbar } from './InventoryToolbar'
import { ItemDetailPanel } from './ItemDetailPanel'
import { typeLabel } from './typeLabels'
import { useHeroSelection } from './useHeroSelection'
import { effectiveSearch, useOwnedInventory } from './useOwnedInventory'

/** Ancla de la ficha: en pantallas estrechas va debajo del listado. */
const DETAIL_ANCHOR = 'inventory-item-detail'

/**
 * "Mi Inventario" (HU-27 / HU-27.3 / HU-28 / HU-07), en cuatro zonas:
 *
 * ┌ A. Gestion del heroe ─┬ B. Gestor de equipamiento ──┐
 * ├ C. Inventario ────────┴─────────────┬ D. Ficha ─────┤
 *
 * Solo cambia la COMPOSICION. Consulta paginada (16), busqueda desde 4
 * caracteres y filtro por tipo; elegir una ranura realza los productos
 * compatibles; con un producto compatible elegido, "Equipar" ejecuta la
 * operacion en Player-Inventory, que sigue siendo la autoridad de las
 * capacidades 2/6/2, la compatibilidad, las estadisticas y la preparacion.
 *
 * Escritorio: 2×2. Tablet: A|B y debajo inventario y ficha a ancho completo.
 * Movil: A, B, C, D apilados, sin scroll interno.
 */
export const PlayerInventoryPage = (): React.JSX.Element => {
  const { t } = useTranslation()
  const selectionQuery = useHeroSelection()
  const preparedHeroName = selectionQuery.data?.configuration.hero.name ?? null

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

  const highlightType =
    selectedSlot === null ? null : (SLOT_META_BY_ID.get(selectedSlot)?.productType ?? null)
  const selectedItem = items.find((item) => item.itemId === selectedItemId)
  const selectedProductType = selectedItem?.product?.type ?? null
  const selectedProductName = selectedItem?.product?.name ?? null

  return (
    <section aria-label={t('inventory:page.title')} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised p-5">
        <div>
          <h1 className="text-xl font-semibold text-ink">{t('inventory:page.title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('inventory:page.description')}</p>
        </div>
        {preparedHeroName !== null && (
          <p className="shrink-0 text-sm font-medium text-ink">
            {t('inventory:page.prepared')}{' '}
            <span className="rounded-full bg-success/15 px-2 py-0.5 text-success">
              {preparedHeroName} ✓
            </span>
          </p>
        )}
      </div>

      {/* A | B */}
      <div className="grid items-start gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <HeroConfigurator
          selectedProductReference={selectedItemId}
          selectedProductName={selectedProductName}
          selectedProductType={selectedProductType}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
        />
      </div>

      {/* C | D */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <section
          aria-label={t('inventory:catalog.label')}
          className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4"
        >
          <InventoryToolbar term={term} type={type} onTermChange={setTerm} onTypeChange={setType} />

          <p role="status" className="flex flex-wrap items-center gap-x-1 text-xs text-muted">
            <span>
              {query.isFetching && !query.isLoading ? t('inventory:catalog.updating') : ''}
              {countLabel(t, 'inventory:catalog.count', totalItems)}
              {data !== undefined &&
                data.totalPages > 1 &&
                t('inventory:catalog.pageOf', {
                  page: String(data.page),
                  total: String(data.totalPages),
                })}
              {highlightType !== null &&
                t('inventory:catalog.highlighted', { type: typeLabel(highlightType) })}
            </span>
            {selectedItemId !== null && (
              <a
                href={`#${DETAIL_ANCHOR}`}
                className="ml-auto inline-flex min-h-11 items-center rounded px-2 font-medium text-brand underline lg:hidden"
              >
                {t('inventory:catalog.viewDetail')}
              </a>
            )}
          </p>

          <QueryState
            isLoading={query.isLoading}
            error={query.error}
            isEmpty={data !== undefined && items.length === 0}
            emptyMessage={
              searching || type !== null
                ? t('inventory:catalog.emptyFiltered')
                : t('inventory:catalog.empty')
            }
          >
            <>
              {/* Scroll interno solo desde tablet: en movil, scroll normal de pagina. */}
              <div className="md:max-h-[28rem] md:overflow-y-auto md:pr-1">
                <InventoryGrid
                  items={items}
                  selectedItemId={selectedItemId}
                  highlightType={highlightType}
                  onSelect={setSelectedItemId}
                />
              </div>

              {data !== undefined && (
                <InventoryPagination
                  page={data.page}
                  totalPages={data.totalPages}
                  onChange={setPage}
                />
              )}
            </>
          </QueryState>
        </section>

        <div id={DETAIL_ANCHOR} className="min-w-0 scroll-mt-4 lg:sticky lg:top-4">
          <ItemDetailPanel itemReference={selectedItemId} selectedSlot={selectedSlot} />
        </div>
      </div>
    </section>
  )
}
