import { PRODUCT_TYPES, PRODUCT_TYPE_LABELS, type Currency, type ShowcaseFilters } from './api'

export interface ShowcaseFiltersBarProps {
  readonly filters: ShowcaseFilters
  readonly onChange: (filters: ShowcaseFilters) => void
}
const FIELD =
  'rounded border border-border bg-surface px-2 py-1.5 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
const toAmount = (raw: string): number | null =>
  raw.trim() === '' ? null : Math.round(Number(raw) * 100)

export const ShowcaseFiltersBar = ({
  filters,
  onChange,
}: ShowcaseFiltersBarProps): React.JSX.Element => (
  <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface-raised p-4">
    <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs text-muted">
      Buscar
      <input
        type="search"
        value={filters.term}
        placeholder="Nombre, descripción, habilidad o precio"
        onChange={(event) => {
          onChange({ ...filters, term: event.target.value })
        }}
        className={FIELD}
      />
    </label>
    <label className="flex flex-col gap-1 text-xs text-muted">
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
    <label className="flex flex-col gap-1 text-xs text-muted">
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
    <label className="flex w-28 flex-col gap-1 text-xs text-muted">
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
    <label className="flex w-28 flex-col gap-1 text-xs text-muted">
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
    {filters.currency === null && (
      <p className="w-full text-xs text-muted">
        Selecciona una moneda para filtrar precios. Los importes se muestran en la moneda de cada
        producto.
      </p>
    )}
  </div>
)
