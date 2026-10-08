import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import type { ProductType } from './api'
import { MIN_SEARCH_LENGTH } from './useOwnedInventory'
import { TYPE_FILTERS } from './typeLabels'

export interface InventoryToolbarProps {
  readonly term: string
  readonly type: ProductType | null
  readonly onTermChange: (term: string) => void
  readonly onTypeChange: (type: ProductType | null) => void
}

/**
 * Búsqueda por nombre y filtro por tipo de "Mi Inventario".
 *
 * La búsqueda se envía al servicio solo desde 4 caracteres (RF-27); por debajo
 * se muestra una pista y no se dispara la consulta indexada. Los filtros de
 * tipo son los tipos canónicos de Catalog, no categorías inventadas.
 */
export const InventoryToolbar = ({
  term,
  type,
  onTermChange,
  onTypeChange,
}: InventoryToolbarProps): React.JSX.Element => {
  const { t } = useTranslation()
  const trimmed = term.trim()
  const showHint = trimmed.length > 0 && trimmed.length < MIN_SEARCH_LENGTH

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-xs text-muted">
        <span className="inventory-search-label">{t('inventory:catalog.search')}</span>
        <span className="relative flex items-center">
          <img
            src="/assets/inventory/filters-pagination/search-icon-light.png"
            alt=""
            aria-hidden="true"
            className="inventory-search-icon pointer-events-none absolute left-2"
          />
          <input
            type="search"
            value={term}
            placeholder={t('inventory:catalog.searchPlaceholder')}
            onChange={(event) => {
              onTermChange(event.target.value)
            }}
            aria-describedby={showHint ? 'inventory-search-hint' : undefined}
            className="min-h-11 w-full rounded border border-border bg-surface py-2 pl-8 pr-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          />
        </span>
        {showHint && (
          <span id="inventory-search-hint" role="status" className="text-xs text-muted">
            {t('inventory:catalog.searchHint', { min: String(MIN_SEARCH_LENGTH) })}
          </span>
        )}
      </label>

      <div
        role="group"
        aria-label={t('inventory:catalog.filterLabel')}
        className="inventory-filter-grid"
      >
        {/*
         * Geometria DETERMINISTA (nunca `flex-wrap` esperando que "se
         * acomode solo"): rejilla de 6 columnas virtuales. Fila 1 ("Todos",
         * "Héroes", "Armas") ocupa 2 columnas cada uno -mismo ancho entre
         * si, sea cual sea el idioma-; fila 2 ("Armaduras", "Ítems") se
         * centra tomando las columnas 2-4 y 4-6, quedando bajo el hueco
         * entre los 3 de arriba. Misma `min-height` para los 5 vía
         * `.inventory-chip`, asi que comparten alto real en pantalla.
         */}
        {TYPE_FILTERS.map((option, index) => {
          const active = option.value === type
          const isSecondRow = index >= 3
          const columnStart = isSecondRow ? (index - 3) * 2 + 2 : index * 2 + 1

          return (
            <button
              key={option.labelKey}
              type="button"
              onClick={() => {
                onTypeChange(option.value)
              }}
              aria-pressed={active}
              style={{ gridColumn: `${String(columnStart)} / span 2` }}
              className={clsx(
                'inventory-chip px-3 py-1.5 text-xs font-medium',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
              )}
            >
              {t(option.labelKey)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
