import { useEffect, useRef } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { QueryState } from '@/components/ui/QueryState'
import { queryKeys } from '@/shared/query-keys'
import { ProductImage } from '@/features/commerce/ProductImage'
import { Hero3D, heroIdOfProduct } from '@/shared/visual-library/heroes'
import {
  ProductCommentsAndRating,
  type PublishCommentTransport,
  type SubmitRatingTransport,
} from '@/features/product-reviews/ProductCommentsAndRating'
import {
  ProductCommentsList,
  type ListCommentsTransport,
} from '@/features/product-reviews/ProductCommentsList'
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

const heroIdOf = (
  type: string | undefined,
  sku: string | undefined,
  values: Readonly<Record<string, unknown>> | undefined,
): string | null =>
  type === undefined || sku === undefined ? null : heroIdOfProduct(type, sku, values)

export interface ProductDetailProps {
  readonly reference: string
  /**
   * Transportes inyectables de comentarios/calificacion (6a pasada): solo los
   * usa `MarketplacePreviewPage` (harness DEV) para precargar fixtures y
   * evitar que la lista de comentarios pegue de verdad contra Community con
   * un `productId` ficticio -causa real del "Internal server error" que
   * aparecia en el preview, ver informe-. En produccion nunca se pasan: cada
   * hijo cae a su transporte real por defecto, mismo comportamiento de
   * siempre.
   */
  readonly listComments?: ListCommentsTransport
  readonly publishComment?: PublishCommentTransport
  readonly submitRating?: SubmitRatingTransport
}

export const ProductDetail = ({
  reference,
  listComments,
  publishComment,
  submitRating,
}: ProductDetailProps): React.JSX.Element => {
  const region = useRef<HTMLElement>(null)
  const { t } = useTranslation()
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
      aria-label={t('commerce:detail.title')}
      className="mk-panel flex flex-col gap-3 p-5"
    >
      {/*
        6a pasada: se retira el boton "Cerrar detalle" -era una segunda
        accion de cierre redundante con la X real del `CommerceDialog` que
        siempre envuelve este componente (unico consumidor: `Showcase.tsx`,
        que ya le pasa su propio `onClose` a `CommerceDialog`)-. La prop
        `onClose` de este componente quedo sin ningun uso interno al quitar
        el boton, asi que se elimino de la interfaz en vez de dejarla muerta.
      */}
      <h2 className="font-game-display text-lg font-semibold tracking-wide text-ink uppercase">
        {t('commerce:detail.title')}
      </h2>
      <QueryState isLoading={query.isLoading} error={query.error}>
        {query.data !== undefined && (
          <>
            {/*
              7a pasada — rediseño principal: el modal era casi todo alto
              -imagen grande, luego nombre/precio/descripcion, luego
              atributos en una columna larga, luego comentarios- y exigia
              mucho scroll incluso en escritorio ancho. Esta fila superior
              pone la imagen (ahora compacta, `.commerce-detail-image`
              recorta su alto en vez de los `max-h-80` de antes) y la
              informacion principal LADO A LADO en pantallas que tienen
              ancho de sobra (`.commerce-detail-head`, ver `commerce.css`);
              en movil/tablet angosto colapsa de vuelta a una columna, nunca
              corta el boton de cerrar ni oculta contenido.
            */}
            <div className="commerce-detail-head">
              {(() => {
                const heroId = heroIdOf(
                  query.data.type,
                  query.data.sku,
                  query.data.attributes.values,
                )
                return heroId === null ? (
                  <ProductImage
                    source={query.data.imageUrl}
                    name={query.data.name}
                    className="commerce-detail-image rounded object-contain"
                  />
                ) : (
                  // El nombre ya se muestra debajo (`query.data.name`); se
                  // oculta la etiqueta que `Hero3D` repite por defecto.
                  <Hero3D heroId={heroId} className="commerce-detail-image [&>p]:hidden" />
                )
              })()}
              <div className="commerce-detail-main">
                <h3 className="font-game-display text-xl font-semibold text-ink">
                  {query.data.name}
                </h3>
                <p className="text-sm text-muted">{PRODUCT_TYPE_LABELS[query.data.type]}</p>
                <p className="whitespace-pre-wrap text-sm text-ink">{query.data.description}</p>
                <ProductPrice product={query.data} />
                <p className="text-xs text-muted">
                  {query.data.availableUnits === null
                    ? t('commerce:detail.unlimited')
                    : t('commerce:detail.available', {
                        units: String(query.data.availableUnits),
                      })}
                </p>
              </div>
            </div>
            {/*
              9a pasada (STEP 8): con el fixture rico ya se puede juzgar el
              panel con contenido real -antes estaba vacio-; se ajusta el
              espaciado vertical (`p-4`->`p-3`, `mb-3`->`mb-2`,
              `space-y-6`->`space-y-4` abajo) para quitar aire sobrante SIN
              recortar ningun dato ni cambiar la estructura de 2 columnas.
            */}
            <div className="commerce-scroll rounded-lg border border-border bg-surface p-3">
              <h4 className="font-game-display mb-2 text-sm font-semibold tracking-wide text-ink uppercase">
                {t('commerce:detail.attributes')}
              </h4>
              <ProductAttributes values={displayedValues ?? query.data.attributes.values} />
            </div>
            <div className="commerce-scroll space-y-4 rounded-lg border border-border bg-surface p-4">
              <ProductCommentsList
                productId={query.data.productId}
                {...(listComments === undefined ? {} : { listComments })}
              />
              <ProductCommentsAndRating
                productId={query.data.productId}
                {...(publishComment === undefined ? {} : { publishComment })}
                {...(submitRating === undefined ? {} : { submitRating })}
              />
            </div>
          </>
        )}
      </QueryState>
    </section>
  )
}
