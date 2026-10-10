import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { QueryState } from '@/components/ui/QueryState'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { countLabel } from '@/shared/i18n/format'

import type { ProductType } from './api'
import type { EquipmentSlotId, HeroEquipment } from './equipment/api'
import { HeroConfigurator } from './equipment/HeroConfigurator'
import { SLOT_META_BY_ID } from './equipment/slots'
import { InventoryGrid } from './InventoryGrid'
import { InventoryPagination } from './InventoryPagination'
import { InventoryToolbar } from './InventoryToolbar'
import { ItemDetailPanel } from './ItemDetailPanel'
import './inventory.css'

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
  // HU-31: mutuamente excluyente con `selectedSlot` -la epica no es una de
  // las 2/6/2 ranuras de HU-28, pero comparte la misma rejilla de inventario
  // para elegir el producto-.
  const [selectingEpic, setSelectingEpic] = useState(false)
  // Ancla DOM real donde `HeroConfigurator` portalea "Equipar" + Estadisticas
  // + Efectos (ver `HeroConfigurator`, `detailAnchor`): un `ref` callback vía
  // `useState` para re-renderizar en cuanto el nodo exista, sin `useEffect`.
  const [detailAnchor, setDetailAnchor] = useState<HTMLDivElement | null>(null)
  // Ancla DOM real de la columna izquierda donde `HeroConfigurator` portalea
  // la seccion de Épica (HU-31), debajo de Inventario -- mismo patron que
  // `detailAnchor` arriba.
  const [epicAnchor, setEpicAnchor] = useState<HTMLDivElement | null>(null)
  // Equipamiento REAL del heroe activo, solo para marcar en la rejilla que
  // objetos estan puestos ahora mismo (presentacion pura).
  const [activeEquipment, setActiveEquipment] = useState<HeroEquipment | undefined>(undefined)
  // Drag & Drop (HU-28, metodo ALTERNATIVO al click+click+Equipar, que
  // SIGUE intacto): tipo canonico del producto que se esta arrastrando
  // ahora mismo, o `null` sin drag activo. Se usa SOLO para resaltar las
  // ranuras compatibles en vivo -misma logica visual que ya existe al
  // elegir un producto por click (`highlightType`/`compatibleType`),
  // nunca una regla nueva de compatibilidad-.
  const [draggedProductType, setDraggedProductType] = useState<string | null>(null)
  const equippedItemIds = useMemo(() => {
    if (activeEquipment === undefined) return undefined
    const ids = [
      ...activeEquipment.equipment.weapons.map((entry) => entry.itemId),
      ...Object.values(activeEquipment.equipment.armor)
        .filter((entry) => entry !== null)
        .map((entry) => entry.itemId),
      ...activeEquipment.equipment.items.map((entry) => entry.itemId),
    ]
    return new Set(ids)
  }, [activeEquipment])

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

  const highlightType = selectingEpic
    ? 'EPICA'
    : selectedSlot === null
      ? null
      : (SLOT_META_BY_ID.get(selectedSlot)?.productType ?? null)
  const selectedItem = items.find((item) => item.itemId === selectedItemId)
  const selectedProductType = selectedItem?.product?.type ?? null
  const selectedProductName = selectedItem?.product?.name ?? null

  return (
    <section aria-label={t('inventory:page.title')} className="inventory-page flex flex-col gap-4">
      <div className="inventory-topbar">
        <h1 className="inventory-title">{t('inventory:page.title')}</h1>
        {preparedHeroName !== null && (
          <p className="shrink-0 text-sm font-medium text-ink">
            <span className="inventory-prepared-label">{t('inventory:page.prepared')}</span>{' '}
            <span className="inventory-prepared-badge">{preparedHeroName} ✓</span>
          </p>
        )}
      </div>

      {/*
       * Orden en el DOM (= orden movil, instruccion explicita del brief):
       * Heroe+Equipo+Epica -> Inventario -> Ficha. En tablet/desktop, CSS
       * Grid reposiciona cada columna por clase (`grid-column`), INDEPENDIENTE
       * del orden del DOM -no se usa la propiedad `order` de flex/grid, que
       * desincroniza el orden visual del orden de tabulacion-, asi que el
       * foco de teclado sigue el mismo orden logico en todos los anchos.
       */}
      <div className="inventory-columns">
        <div className="inventory-col inventory-col--center">
          <HeroConfigurator
            selectedProductReference={selectedItemId}
            selectedProductName={selectedProductName}
            selectedProductType={selectedProductType}
            selectedSlot={selectedSlot}
            onSelectSlot={(slot) => {
              setSelectedSlot(slot)
              if (slot !== null) setSelectingEpic(false)
            }}
            selectingEpic={selectingEpic}
            onToggleSelectingEpic={() => {
              setSelectingEpic((active) => !active)
              setSelectedSlot(null)
            }}
            onSelectEquippedItem={(itemId) => {
              // Gate: elegir una ranura OCUPADA muestra en la Ficha el
              // objeto REALMENTE equipado (su `itemId` real), nunca el
              // ultimo elegido del catalogo. Reutiliza el MISMO selector de
              // ficha que ya usan las tarjetas del inventario.
              if (itemId !== null) setSelectedItemId(itemId)
            }}
            onEquipmentChange={setActiveEquipment}
            detailAnchor={detailAnchor}
            epicAnchor={epicAnchor}
            draggedProductType={draggedProductType}
            onDropEquip={(slot, itemId) => {
              // Mismo gate "ver el objeto real equipado" que al elegir una
              // ranura por click: tras un drop valido, la Ficha pasa a
              // mostrar la ficha de ESE producto (no el ultimo del catalogo).
              setSelectedItemId(itemId)
              setSelectedSlot(slot)
            }}
          />
        </div>

        <div className="inventory-col inventory-col--left">
          <section
            aria-label={t('inventory:catalog.label')}
            className="inventory-panel flex min-w-0 flex-col gap-3 p-4"
          >
            <InventoryToolbar
              term={term}
              type={type}
              onTermChange={setTerm}
              onTypeChange={setType}
            />

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
                <InventoryGrid
                  items={items}
                  selectedItemId={selectedItemId}
                  highlightType={highlightType}
                  onSelect={setSelectedItemId}
                  equippedItemIds={equippedItemIds}
                  onDragStartItem={(_itemId, productType) => {
                    setDraggedProductType(productType)
                  }}
                  onDragEndItem={() => {
                    setDraggedProductType(null)
                  }}
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
          </section>

          {/*
           * HU-31 (6a pasada): la Épica deja de vivir debajo del centro y
           * pasa a vivir AQUI, debajo de Inventario -- `HeroConfigurator`
           * la portalea a este `<div>` (`epicAnchor`), misma tecnica de
           * portal ya usada para "Equipar"+Stats+Effects hacia la Ficha.
           * `EpicManagerPanel` YA trae su propio `<section
           * className="inventory-panel">`: este `<div>` es solo el ANCLA
           * real del DOM, sin envoltorio extra que duplicaria el panel.
           */}
          <div ref={setEpicAnchor} />
        </div>

        <div id={DETAIL_ANCHOR} className="inventory-col inventory-col--right min-w-0 scroll-mt-4">
          <ItemDetailPanel
            itemReference={selectedItemId}
            selectedSlot={selectedSlot}
            onEquipAnchorReady={setDetailAnchor}
          />
        </div>
      </div>
    </section>
  )
}
