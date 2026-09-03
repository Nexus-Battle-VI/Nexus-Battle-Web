import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { QueryState } from '@/components/ui/QueryState'
import { queryKeys } from '@/shared/query-keys'
import { useWishlist } from '@/features/commerce/wishlist/useWishlist'
import { CommerceDialog } from '@/features/commerce/CommerceDialog'
import {
  fetchShowcase,
  NO_FILTERS,
  SHOWCASE_PAGE_SIZE,
  showcaseQuery,
  type ShowcaseFilters,
  type ShowcaseProduct,
} from './api'
import { ShowcaseFiltersBar } from './ShowcaseFiltersBar'
import { ShowcaseGrid } from './ShowcaseGrid'
import { ProductDetail } from './ProductDetail'

export interface ShowcaseProps {
  readonly onAddToCart: (product: ShowcaseProduct) => void
  readonly onOpenDetail?: (reference: string) => void
  readonly busySku?: string | null
  readonly disabled?: boolean
  readonly cartCurrency?: string | null
}

/** Catalog filtra; el adaptador reparte su resultado en pantallas de doce productos. */
export const Showcase = ({
  onAddToCart,
  onOpenDetail,
  busySku = null,
  disabled = false,
  cartCurrency = null,
}: ShowcaseProps): React.JSX.Element => {
  const [filters, setFilters] = useState<ShowcaseFilters>(NO_FILTERS)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string | null>(null)
  const criteria = showcaseQuery(filters, page)
  const query = useQuery({
    queryKey: queryKeys.commerce.showcase(criteria),
    queryFn: ({ signal }) => fetchShowcase(criteria, signal),
  })
  const products = query.data?.items ?? []
  const wishlist = useWishlist(products.map((product) => product.productId))
  const wishlistError = wishlist.error ?? wishlist.mutationError
  const pageCount = Math.ceil((query.data?.total ?? 0) / SHOWCASE_PAGE_SIZE)
  const currentPage = query.data?.page ?? page
  const changeFilters = (next: ShowcaseFilters): void => {
    setFilters(next)
    setPage(1)
  }
  return (
    <section aria-label="Vitrina de productos" className="commerce-showcase">
      <div className="commerce-search-row rounded-xl border border-border bg-surface-raised">
        <h2 className="text-base font-semibold text-ink">Vitrina</h2>
        <label className="commerce-search">
          <span className="sr-only">Buscar</span>
          <Search aria-hidden="true" className="size-4 shrink-0 text-muted" />
          <input
            type="search"
            value={filters.term}
            placeholder="Buscar por nombre, descripción o habilidad…"
            onChange={(event) => {
              changeFilters({ ...filters, term: event.target.value })
            }}
            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none"
          />
        </label>
      </div>
      <div className="commerce-showcase-body">
        <ShowcaseFiltersBar filters={filters} onChange={changeFilters} />
        <div className="commerce-results">
          <QueryState
            isLoading={query.isLoading}
            error={query.error}
            isEmpty={query.data?.total === 0}
            emptyMessage="Ningun producto cumple los criterios seleccionados."
          >
            <div className="commerce-result-status">
              <p role="status" className="text-xs text-muted">
                {query.data?.total ?? 0} productos
                {pageCount > 1 && ` · pagina ${String(currentPage)} de ${String(pageCount)}`}
              </p>
              {wishlist.isLoading && (
                <p className="text-xs text-muted">Consultando deseos y compras...</p>
              )}
              {wishlistError !== null && (
                <p role="alert" className="text-xs text-danger">
                  {wishlistError instanceof Error
                    ? wishlistError.message
                    : 'No se pudo consultar o actualizar tu lista de deseos.'}
                </p>
              )}
            </div>
            <ShowcaseGrid
              products={products}
              onAddToCart={onAddToCart}
              onOpenDetail={(reference) => {
                setSelected(reference)
                onOpenDetail?.(reference)
              }}
              busySku={busySku}
              disabled={disabled}
              cartCurrency={cartCurrency}
              isWished={wishlist.isWished}
              isOwned={wishlist.isOwned}
              onToggleWish={wishlist.toggle}
              wishBusySku={wishlist.busySku}
              wishlistUnavailable={wishlist.isLoading || wishlist.error !== null}
            />
          </QueryState>
          <nav aria-label="Paginacion" className="commerce-pagination">
            <Button
              variant="secondary"
              disabled={query.isLoading || currentPage <= 1}
              onClick={() => {
                setPage(currentPage - 1)
              }}
            >
              Anterior
            </Button>
            <span className="text-xs text-muted">
              {Math.min(currentPage, Math.max(1, pageCount))} / {Math.max(1, pageCount)}
            </span>
            <Button
              variant="secondary"
              disabled={query.isLoading || currentPage >= pageCount}
              onClick={() => {
                setPage(currentPage + 1)
              }}
            >
              Siguiente
            </Button>
          </nav>
        </div>
      </div>
      {selected !== null && (
        <CommerceDialog
          title="Detalle del producto"
          onClose={() => {
            setSelected(null)
          }}
        >
          <ProductDetail
            key={selected}
            reference={selected}
            onClose={() => {
              setSelected(null)
            }}
          />
        </CommerceDialog>
      )}
    </section>
  )
}
