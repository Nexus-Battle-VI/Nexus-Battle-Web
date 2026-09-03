import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/Button'
import { QueryState } from '@/components/ui/QueryState'
import { queryKeys } from '@/shared/query-keys'
import { ProductImage } from '@/features/commerce/ProductImage'
import { fetchProduct, PRODUCT_TYPE_LABELS } from './api'
import { ProductAttributes } from './ProductAttributes'
import { ProductPrice } from './ProductPrice'

export const ProductDetail = ({
  reference,
  onClose,
}: {
  readonly reference: string
  readonly onClose: () => void
}): React.JSX.Element => {
  const region = useRef<HTMLElement>(null)
  useEffect(() => {
    region.current?.focus()
  }, [])
  const query = useQuery({
    queryKey: queryKeys.commerce.product(reference),
    queryFn: ({ signal }) => fetchProduct(reference, signal),
  })
  return (
    <section
      ref={region}
      tabIndex={-1}
      aria-label="Detalle del producto"
      className="flex flex-col gap-4 rounded-lg border border-brand bg-surface-raised p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">Detalle del producto</h2>
        <Button variant="secondary" onClick={onClose}>
          Cerrar detalle
        </Button>
      </div>
      <QueryState isLoading={query.isLoading} error={query.error}>
        {query.data !== undefined && (
          <>
            <ProductImage
              source={query.data.imageUrl}
              name={query.data.name}
              className="max-h-80 w-full rounded object-contain"
            />
            <h3 className="text-xl font-semibold text-ink">{query.data.name}</h3>
            <p className="text-sm text-muted">{PRODUCT_TYPE_LABELS[query.data.type]}</p>
            <p className="whitespace-pre-wrap text-sm text-ink">{query.data.description}</p>
            <ProductPrice product={query.data} />
            <p className="text-xs text-muted">
              {query.data.availableUnits === null
                ? 'Disponibilidad ilimitada'
                : `Disponibles: ${String(query.data.availableUnits)}`}
            </p>
            <ProductAttributes values={query.data.attributes.values} />
          </>
        )}
      </QueryState>
    </section>
  )
}
