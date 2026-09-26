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
        {t('inventory:catalog.search')}
        <input
          type="search"
          value={term}
          placeholder={t('inventory:catalog.searchPlaceholder')}
          onChange={(event) => {
            onTermChange(event.target.value)
          }}
          aria-describedby={showHint ? 'inventory-search-hint' : undefined}
          className="min-h-11 rounded border border-border bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        />
        {showHint && (
          <span id="inventory-search-hint" role="status" className="text-xs text-muted">
            {t('inventory:catalog.searchHint', { min: String(MIN_SEARCH_LENGTH) })}
          </span>
        )}
      </label>

      <div
        role="group"
        aria-label={t('inventory:catalog.filterLabel')}
        className="flex flex-wrap gap-2"
      >
        {TYPE_FILTERS.map((option) => {
          const active = option.value === type

          return (
            <button
              key={option.labelKey}
              type="button"
              onClick={() => {
                onTypeChange(option.value)
              }}
              aria-pressed={active}
              className={clsx(
                'min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                active
                  ? 'border-brand bg-brand text-brand-ink'
                  : 'border-border text-ink hover:bg-surface',
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
