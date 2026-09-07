import { SlidersHorizontal } from 'lucide-react'
import {
  PRODUCT_TYPES,
  PRODUCT_TYPE_LABELS,
  NO_FILTERS,
  type Currency,
  type ShowcaseFilters,
} from './api'

export interface ShowcaseFiltersBarProps {
  readonly filters: ShowcaseFilters
  readonly onChange: (filters: ShowcaseFilters) => void
}
const FIELD =
  'w-full min-w-0 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50'
const toAmount = (raw: string): number | null =>
  raw.trim() === '' ? null : Math.round(Number(raw) * 100)

export const ShowcaseFiltersBar = ({
  filters,
  onChange,
}: ShowcaseFiltersBarProps): React.JSX.Element => (
  <aside
    aria-label="Filtros de productos"
    className="commerce-filters rounded-xl border border-border bg-surface-raised"
  >
    <div className="flex items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <SlidersHorizontal aria-hidden="true" className="size-4 text-brand" />
        Filtros
      </h3>
      <button
        type="button"
        onClick={() => {
          onChange(NO_FILTERS)
        }}
        className="rounded text-xs text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brand"
      >
        Limpiar
      </button>
    </div>
    <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted">
      Tipo de producto
      <select
        value={filters.type ?? ''}
        onChange={(event) => {
          onChange({ ...filters, type: event.target.value || null })
        }}
        className={FIELD}
      >
        <option value="">Todos</option>
        {PRODUCT_TYPES.map((type) => (
          <option key={type} value={type}>
            {PRODUCT_TYPE_LABELS[type]}
          </option>
        ))}
      </select>
    </label>
    <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted">
      Moneda del precio
      <select
        value={filters.currency ?? ''}
        onChange={(event) => {
          const currency = event.target.value === '' ? null : (event.target.value as Currency)
          onChange({
            ...filters,
            currency,
            ...(currency === null ? { minPrice: null, maxPrice: null } : {}),
          })
        }}
        className={FIELD}
      >
        <option value="">Todas</option>
        <option value="COP">COP</option>
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
      </select>
    </label>
    <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted">
      Precio desde
      <input
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        disabled={filters.currency === null}
        value={filters.minPrice === null ? '' : String(filters.minPrice / 100)}
        onChange={(event) => {
          onChange({ ...filters, minPrice: toAmount(event.target.value) })
        }}
        className={FIELD}
      />
    </label>
    <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted">
      Precio hasta
      <input
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        disabled={filters.currency === null}
        value={filters.maxPrice === null ? '' : String(filters.maxPrice / 100)}
        onChange={(event) => {
          onChange({ ...filters, maxPrice: toAmount(event.target.value) })
        }}
        className={FIELD}
      />
    </label>
    <p className="text-xs leading-relaxed text-muted">
      {filters.currency === null
        ? 'Selecciona una moneda para filtrar precios. Los importes se muestran en la moneda de cada producto.'
        : 'Los precios se muestran en la moneda publicada para cada producto.'}
    </p>
    <p className="commerce-filter-footnote text-xs leading-relaxed text-muted">
      Hasta 12 productos por página. Abre un producto para ver todos sus atributos.
    </p>
  </aside>
)
