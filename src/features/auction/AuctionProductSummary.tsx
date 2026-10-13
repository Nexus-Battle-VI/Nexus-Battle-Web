import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Package } from '@/components/ui/icons'
import { ProductVisual } from '@/shared/visual-library/ProductVisual'
import { fetchCanonicalProduct } from '@/features/catalog/api'
import { queryKeys } from '@/shared/query-keys'

interface AuctionProductSummaryProps {
  readonly productId: string
}

/**
 * Resuelve la referencia que Auction conserva hacia el producto canónico.
 * El fallo de una ficha queda aislado en su tarjeta: no convierte el listado
 * completo de subastas en un estado de error.
 */
export const AuctionProductSummary = ({
  productId,
}: AuctionProductSummaryProps): React.JSX.Element => {
  const { t } = useTranslation()
  const productQuery = useQuery({
    queryKey: queryKeys.catalog.detail(productId),
    queryFn: ({ signal }) => fetchCanonicalProduct(productId, signal),
    retry: false,
  })
  const product = productQuery.data

  if (productQuery.isPending) {
    return (
      <div className="flex min-w-0 items-center gap-3" aria-busy="true">
        <span
          className="auction-product-image size-16 shrink-0 animate-pulse rounded-md bg-surface-muted"
          aria-hidden="true"
        />
        <p className="auction-meta text-muted">{t('auction:loading')}</p>
      </div>
    )
  }

  if (product === undefined) {
    return (
      <div>
        <p className="font-semibold text-ink">{t('auction:claims.productFallback')}</p>
        <p className="auction-meta break-all text-muted">{productId}</p>
      </div>
    )
  }

  return (
    <div className="auction-product-summary flex min-w-0 items-center gap-3">
      <ProductVisual
        product={product}
        className="auction-product-image size-16 shrink-0 rounded-md border border-border bg-surface-raised"
        fallback={
          product.imageUrl !== '' ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="auction-product-image size-16 shrink-0 rounded-md object-contain"
            />
          ) : (
            // Ni sprite (EN-031) ni `imageUrl` de Catalog: fallback neutral
            // decorativo -el nombre accesible ya lo aporta el <p> de al
            // lado-, nunca dejar la tarjeta sin ninguna identidad visual.
            <Package aria-hidden="true" className="m-auto size-7 text-muted" />
          )
        }
      />
      <div className="min-w-0">
        <p className="auction-product-name break-words">{product.name}</p>
        <p className="text-sm text-muted">{product.type}</p>
      </div>
    </div>
  )
}
