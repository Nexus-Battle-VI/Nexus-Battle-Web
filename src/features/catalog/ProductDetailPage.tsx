import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { useTranslation } from 'react-i18next'

import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Card } from '@/components/ui/Card'
import { QueryState } from '@/components/ui/QueryState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Star } from '@/components/ui/icons'
import { formatMoney } from '@/lib/format'
import { queryKeys } from '@/shared/query-keys'
import { ProductCommentsAndRating } from '@/features/product-reviews/ProductCommentsAndRating'
import { ProductCommentsList } from '@/features/product-reviews/ProductCommentsList'
import { countLabel, formatDecimal, formatInteger } from '@/shared/i18n/format'
import { fetchCanonicalProduct } from './api'

/**
 * Ficha de un producto canónico, con sus comentarios y su calificación
 * (HU-40). No entra en `NAVIGATION`: se llega con un producto concreto en la
 * mano, mismo criterio que `admin/products/:productId/inventory` (HU-34).
 */
export const ProductDetailPage = (): React.JSX.Element => {
  const { productId = '' } = useParams()
  const { t } = useTranslation()

  const query = useQuery({
    queryKey: queryKeys.catalog.detail(productId),
    queryFn: ({ signal }) => fetchCanonicalProduct(productId, signal),
    enabled: productId !== '',
  })

  const product = query.data

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Breadcrumb
        items={[
          { label: t('catalog:detail.home'), to: '/ecommerce' },
          { label: t('catalog:detail.catalog'), to: '/catalog' },
          { label: product?.name ?? t('catalog:detail.product') },
        ]}
      />

      <div className="mt-6 space-y-6">
        <QueryState isLoading={query.isPending} error={query.error}>
          {product !== undefined && (
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-2xl font-semibold text-ink">{product.name}</h1>
                  <p className="mt-1 text-sm text-muted">{product.description}</p>
                </div>
                <StatusBadge status={product.lifecycleStatus} />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4">
                <span className="text-lg font-medium tabular-nums text-ink">
                  {product.realMoneyPrice !== null
                    ? formatMoney(product.realMoneyPrice.amount, product.realMoneyPrice.currency)
                    : countLabel(t, 'common:count.credits', product.creditsPrice)}
                </span>

                <span className="inline-flex items-center gap-1 text-sm text-muted">
                  <Star
                    aria-hidden="true"
                    className={
                      product.averageRating === null
                        ? 'size-4 fill-none text-muted'
                        : 'size-4 fill-brand text-brand'
                    }
                  />
                  {product.averageRating === null
                    ? t('catalog:detail.noRatings')
                    : t('catalog:detail.rating', {
                        count: product.reviewCount,
                        value: formatInteger(product.reviewCount),
                        average: formatDecimal(product.averageRating, 1),
                      })}
                </span>
              </div>
            </Card>
          )}
        </QueryState>

        {product !== undefined && (
          <Card>
            <div className="space-y-6">
              <ProductCommentsList productId={product.productId} />
              <ProductCommentsAndRating productId={product.productId} />
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
