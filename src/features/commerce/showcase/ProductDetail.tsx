import { useEffect, useRef } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/Button'
import { QueryState } from '@/components/ui/QueryState'
import { queryKeys } from '@/shared/query-keys'
import { ProductImage } from '@/features/commerce/ProductImage'
import { ProductCommentsAndRating } from '@/features/product-reviews/ProductCommentsAndRating'
import { ProductCommentsList } from '@/features/product-reviews/ProductCommentsList'
import { fetchProduct, PRODUCT_TYPE_LABELS } from './api'
import { ProductAttributes } from './ProductAttributes'
import { ProductPrice } from './ProductPrice'

/**
 * `attributes.values.abilities` de un HEROE es un arreglo de `productId` de
 * sus habilidades (referencias de Catalog), no de nombres: `ProductAttributes`
 * es un volcado generico del esquema y no sabe que esos strings son claves
 * foraneas. Se resuelven aqui, una vez, a su nombre visible.
 */
const heroAbilityIds = (
  values: Readonly<Record<string, unknown>> | undefined,
): readonly string[] => {
  if (values?.kind !== 'HEROE' || !Array.isArray(values.abilities)) return []
  return values.abilities.filter((entry): entry is string => typeof entry === 'string')
}

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

  const abilityIds = heroAbilityIds(query.data?.attributes.values)
  const abilityQueries = useQueries({
    queries: abilityIds.map((id) => ({
      queryKey: queryKeys.commerce.product(id),
      queryFn: ({ signal }: { signal?: AbortSignal }) => fetchProduct(id, signal),
    })),
  })
  const displayedValues =
    query.data === undefined
      ? undefined
      : abilityIds.length === 0
        ? query.data.attributes.values
        : {
            ...query.data.attributes.values,
            abilities: abilityIds.map((id, index) => abilityQueries[index]?.data?.name ?? id),
          }
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
            <div className="rounded-lg border border-border bg-surface p-4">
              <h4 className="mb-3 text-sm font-semibold text-ink">Atributos</h4>
              <ProductAttributes values={displayedValues ?? query.data.attributes.values} />
            </div>
            <div className="space-y-6 rounded-lg border border-border bg-surface p-4">
              <ProductCommentsList productId={query.data.productId} />
              <ProductCommentsAndRating productId={query.data.productId} />
            </div>
          </>
        )}
      </QueryState>
    </section>
  )
}
