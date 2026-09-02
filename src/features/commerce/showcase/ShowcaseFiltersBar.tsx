import type { ShowcaseFilters } from './search'

export interface ShowcaseFiltersBarProps {
  readonly filters: ShowcaseFilters
  readonly categories: readonly string[]
  readonly onChange: (filters: ShowcaseFilters) => void
}

/** Convierte el texto de un campo numerico en importe, o `null` si esta vacio. */
const toAmount = (raw: string): number | null => {
  const trimmed = raw.trim()

  if (trimmed === '') {
    return null
  }

  const parsed = Number(trimmed)

  // Un texto que no es numero no filtra: vale mas no aplicar el criterio que
  // aplicar uno que quien escribe no pidio.
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null
}

/**
 * Busqueda y filtros de la vitrina.
 *
 * Los filtros se combinan entre si y con la busqueda (CA-11). Los importes se
 * escriben en la unidad mayor —pesos, no centavos— porque es como se piensa un
 * precio; la conversion ocurre aqui, en un solo sitio.
 *
 * **Falta el filtro por estado de promocion** que pide CA-10: Catalog no
 * publica todavia si un producto esta en promocion, asi que no hay dato sobre
 * el que filtrar. Ofrecer el control sin efecto seria peor que no ofrecerlo.
 */
export const ShowcaseFiltersBar = ({
  filters,
  categories,
  onChange,
}: ShowcaseFiltersBarProps): React.JSX.Element => (
  <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface-raised p-4">
    <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs text-muted">
      Buscar
      <input
        type="search"
        value={filters.term}
        placeholder="Nombre, tipo o precio"
        onChange={(event) => {
          onChange({ ...filters, term: event.target.value })
        }}
        className="rounded border border-border bg-surface px-2 py-1.5 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      />
    </label>

    <label className="flex flex-col gap-1 text-xs text-muted">
      Tipo de producto
      <select
        value={filters.category ?? ''}
        onChange={(event) => {
          onChange({
            ...filters,
            category: event.target.value === '' ? null : event.target.value,
          })
        }}
        className="rounded border border-border bg-surface px-2 py-1.5 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <option value="">Todos</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </label>

    <label className="flex w-28 flex-col gap-1 text-xs text-muted">
      Precio desde
      <input
        type="number"
        min={0}
        inputMode="decimal"
        value={filters.minPrice === null ? '' : String(filters.minPrice / 100)}
        onChange={(event) => {
          onChange({ ...filters, minPrice: toAmount(event.target.value) })
        }}
        className="rounded border border-border bg-surface px-2 py-1.5 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      />
    </label>

    <label className="flex w-28 flex-col gap-1 text-xs text-muted">
      Precio hasta
      <input
        type="number"
        min={0}
        inputMode="decimal"
        value={filters.maxPrice === null ? '' : String(filters.maxPrice / 100)}
        onChange={(event) => {
          onChange({ ...filters, maxPrice: toAmount(event.target.value) })
        }}
        className="rounded border border-border bg-surface px-2 py-1.5 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      />
    </label>
  </div>
)
