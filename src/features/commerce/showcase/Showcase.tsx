import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/Button'
import { QueryState } from '@/components/ui/QueryState'
import { queryKeys } from '@/shared/query-keys'
import { useWishlist } from '@/features/commerce/wishlist/useWishlist'
import {
  fetchShowcase,
  NO_FILTERS,
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

/** Catalog ejecuta la consulta completa; la UI nunca vuelve a filtrar ni paginar sus resultados. */
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
  const pageCount = Math.ceil((query.data?.total ?? 0) / 16)
  const currentPage = query.data?.page ?? page

  return (
    <section aria-label="Vitrina de productos" className="flex flex-col gap-4">
      <div className="rounded-lg border border-border bg-surface-raised p-6">
        <h2 className="text-xl font-semibold text-ink">Vitrina</h2>
        <p className="mt-1 text-sm text-muted">
          Explora los productos disponibles y anadelos a tu carrito.
        </p>
      </div>
      <ShowcaseFiltersBar
        filters={filters}
        onChange={(next) => {
          setFilters(next)
          setPage(1)
        }}
      />
      {selected !== null && (
        <ProductDetail
          key={selected}
          reference={selected}
          onClose={() => {
            setSelected(null)
          }}
        />
      )}
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        isEmpty={query.data?.total === 0}
        emptyMessage="Ningun producto cumple los criterios seleccionados."
      >
        <p role="status" className="text-xs text-muted">
          {query.data?.total ?? 0} productos
          {pageCount > 1 && ` · pagina ${String(currentPage)} de ${String(pageCount)}`}
        </p>
        {wishlist.isLoading && (
          <p className="text-xs text-muted">Consultando deseos y compras...</p>
        )}
        {wishlistError !== null && (
          <p role="alert" className="text-sm text-danger">
            {wishlistError instanceof Error
              ? wishlistError.message
              : 'No se pudo consultar o actualizar tu lista de deseos.'}
          </p>
        )}
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
        {pageCount > 1 && (
          <nav aria-label="Paginacion" className="flex items-center justify-center gap-3">
            <Button
              variant="secondary"
              disabled={currentPage === 1}
              onClick={() => {
                setPage(currentPage - 1)
              }}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              disabled={currentPage >= pageCount}
              onClick={() => {
                setPage(currentPage + 1)
              }}
            >
              Siguiente
            </Button>
          </nav>
        )}
      </QueryState>
    </section>
  )
}
