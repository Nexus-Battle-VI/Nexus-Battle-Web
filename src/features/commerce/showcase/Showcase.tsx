import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/Button'
import { QueryState } from '@/components/ui/QueryState'
import { queryKeys } from '@/shared/query-keys'
import { fetchShowcase } from './api'
import { ShowcaseFiltersBar } from './ShowcaseFiltersBar'
import { ShowcaseGrid } from './ShowcaseGrid'
import { applyFilters, categoriesOf, NO_FILTERS, paginate, type ShowcaseFilters } from './search'

export interface ShowcaseProps {
  readonly onAddToCart: (sku: string) => void
  readonly onOpenDetail?: (sku: string) => void
  readonly busySku?: string | null
}

/**
 * Vitrina de E-commerce (HU-57).
 *
 * El filtrado y la paginacion ocurren en el cliente porque
 * `GET /api/products` solo admite filtrar por categoria: no acepta termino de
 * busqueda, ni rango de precio, ni pagina. Mientras Catalog no los ofrezca,
 * hacerlo aqui es lo unico que permite cumplir CA-06 a CA-12. Es una solucion
 * correcta para el volumen actual del catalogo y **no escala**: cuando el
 * catalogo crezca, el filtrado tiene que bajar al servicio.
 */
export const Showcase = ({
  onAddToCart,
  onOpenDetail,
  busySku = null,
}: ShowcaseProps): React.JSX.Element => {
  const [filters, setFilters] = useState<ShowcaseFilters>(NO_FILTERS)
  const [page, setPage] = useState(1)

  const query = useQuery({
    queryKey: queryKeys.commerce.showcase,
    queryFn: ({ signal }) => fetchShowcase(signal),
  })

  const products = useMemo(() => query.data ?? [], [query.data])
  const categories = useMemo(() => categoriesOf(products), [products])
  const filtered = useMemo(() => applyFilters(products, filters), [products, filters])
  const current = useMemo(() => paginate(filtered, page), [filtered, page])

  const changeFilters = (next: ShowcaseFilters): void => {
    setFilters(next)
    // Al cambiar los criterios se vuelve a la primera pagina: quedarse en la
    // cuarta de un resultado que ahora tiene una sola pagina mostraria un
    // vacio que parece un fallo.
    setPage(1)
  }

  return (
    <section aria-label="Vitrina de productos" className="flex flex-col gap-4">
      <div className="rounded-lg border border-border bg-surface-raised p-6">
        <h2 className="text-xl font-semibold text-ink">Vitrina</h2>
        <p className="mt-1 text-sm text-muted">
          Explora los productos disponibles y anadelos a tu carrito.
        </p>
      </div>

      <ShowcaseFiltersBar filters={filters} categories={categories} onChange={changeFilters} />

      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        isEmpty={current.total === 0}
        emptyMessage="Ningun producto cumple los criterios seleccionados."
      >
        <>
          <p role="status" className="text-xs text-muted">
            {current.total} producto{current.total === 1 ? '' : 's'}
            {current.pageCount > 1 &&
              ` · pagina ${String(current.page)} de ${String(current.pageCount)}`}
          </p>

          <ShowcaseGrid
            products={current.items}
            onAddToCart={onAddToCart}
            onOpenDetail={onOpenDetail ?? ((): void => undefined)}
            busySku={busySku}
          />

          {current.pageCount > 1 && (
            <nav aria-label="Paginacion" className="flex items-center justify-center gap-3">
              <Button
                variant="secondary"
                disabled={current.page === 1}
                onClick={() => {
                  setPage(current.page - 1)
                }}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                disabled={current.page === current.pageCount}
                onClick={() => {
                  setPage(current.page + 1)
                }}
              >
                Siguiente
              </Button>
            </nav>
          )}
        </>
      </QueryState>
    </section>
  )
}
