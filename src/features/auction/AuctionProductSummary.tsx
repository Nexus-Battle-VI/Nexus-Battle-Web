import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

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

  if (product === undefined) {
    return (
      <div>
        <p className="font-semibold text-ink">{t('auction:claims.productFallback')}</p>
        <p className="break-all text-xs text-muted">{productId}</p>
      </div>
    )
  }

  return (
    <div className="auction-product-summary flex min-w-0 items-center gap-3">
      {product.imageUrl !== '' && (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="auction-product-image size-12 shrink-0 rounded-md object-cover"
        />
      )}
      <div className="min-w-0">
        <p className="break-words font-semibold text-ink">{product.name}</p>
        <p className="text-sm text-muted">{product.type}</p>
      </div>
    </div>
  )
}
