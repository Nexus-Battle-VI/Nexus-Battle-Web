import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { QueryState } from '@/components/ui/QueryState'
import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'
import { useWishlist } from '@/features/commerce/wishlist/useWishlist'
import { CommerceDialog } from '@/features/commerce/CommerceDialog'
import { useLanguage } from '@/shared/i18n/language'
import { describeFailure } from '@/shared/i18n/errors'
import { countLabel } from '@/shared/i18n/format'
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
  const subject = useSession((state) => state.subject)
  const { t } = useTranslation()
  const language = useLanguage((state) => state.language)
  const criteria = showcaseQuery(filters, page)
  const query = useQuery({
    queryKey: queryKeys.commerce.showcase(criteria),
    queryFn: ({ signal }) => fetchShowcase(criteria, signal),
  })
  const products = query.data?.items ?? []
  const wishlist = useWishlist(products.map((product) => product.productId))
  const wishlistError = wishlist.error ?? wishlist.mutationError
  // Sin sesion el control de deseos se muestra pero deshabilitado: la
  // consulta ya esta apagada en `useWishlist`, asi que este flag solo evita
  // que un clic anonimo dispare la mutacion (y su 401) contra Commerce.
  const wishlistUnavailable = subject === null || wishlist.isLoading || wishlist.error !== null
  const pageCount = Math.ceil((query.data?.total ?? 0) / SHOWCASE_PAGE_SIZE)
  const currentPage = query.data?.page ?? page
  const changeFilters = (next: ShowcaseFilters): void => {
    setFilters(next)
    setPage(1)
  }
  return (
    <section aria-label={t('commerce:showcase.label')} className="commerce-showcase">
      <div className="commerce-search-row rounded-xl border border-border bg-surface-raised">
        <h2 className="text-base font-semibold text-ink">{t('commerce:showcase.title')}</h2>
        <label className="commerce-search">
          <span className="sr-only">{t('commerce:showcase.search')}</span>
          <Search aria-hidden="true" className="size-4 shrink-0 text-muted" />
          <input
            type="search"
            value={filters.term}
            placeholder={t('commerce:showcase.searchPlaceholder')}
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
            emptyMessage={t('commerce:showcase.empty')}
          >
            <div className="commerce-result-status">
              <p role="status" className="text-xs text-muted">
                {countLabel(t, 'commerce:showcase.total', query.data?.total ?? 0)}
                {pageCount > 1 &&
                  t('commerce:showcase.pageOf', {
                    page: String(currentPage),
                    pages: String(pageCount),
                  })}
              </p>
              {wishlist.isLoading && (
                <p className="text-xs text-muted">{t('commerce:showcase.wishlistLoading')}</p>
              )}
              {wishlistError !== null && (
                <p role="alert" className="text-xs text-danger">
                  {wishlistError instanceof Error
                    ? describeFailure(wishlistError, t, language)
                    : t('commerce:showcase.wishlistFailed')}
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
              wishlistUnavailable={wishlistUnavailable}
            />
          </QueryState>
          <nav aria-label={t('commerce:showcase.pagination')} className="commerce-pagination">
            <Button
              variant="secondary"
              disabled={query.isLoading || currentPage <= 1}
              onClick={() => {
                setPage(currentPage - 1)
              }}
            >
              {t('commerce:showcase.previous')}
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
              {t('commerce:showcase.next')}
            </Button>
          </nav>
        </div>
      </div>
      {selected !== null && (
        <CommerceDialog
          title={t('commerce:showcase.detailDialog')}
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
