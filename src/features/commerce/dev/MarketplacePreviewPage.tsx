import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/Button'
import { CommerceDialog } from '@/features/commerce/CommerceDialog'
import { CartPanel } from '@/features/commerce/cart/CartPanel'
import type { Cart, CartLine } from '@/features/commerce/cart/api'
import { ShowcaseGrid } from '@/features/commerce/showcase/ShowcaseGrid'
import { ProductDetail } from '@/features/commerce/showcase/ProductDetail'
import type { ListCommentsTransport } from '@/features/product-reviews/ProductCommentsList'
import type {
  PublishCommentTransport,
  SubmitRatingTransport,
} from '@/features/product-reviews/ProductCommentsAndRating'
import { queryKeys } from '@/shared/query-keys'
import '@/features/commerce/commerce.css'
import { MARKETPLACE_PREVIEW_PRODUCTS } from './marketplacePreviewFixtures'

/**
 * Harness de verificación visual, no una pantalla del producto (mismo
 * criterio que `ProductsDevPreview`/`HeroesDevPreview`, ver
 * `src/routes/dev-routes.tsx`): permite inspeccionar la Product Card, sus
 * botones/iconos PixelLab reales, el diálogo de detalle y el carrito (inline
 * Y flotante/modal) sin depender de que Catalog/Commerce/Community tengan
 * datos reales en el entorno local.
 *
 * Usa exactamente `ShowcaseGrid`, `ProductDetail`, `CartPanel` y
 * `CommerceDialog` -los componentes reales de producción-, nunca un mockup
 * aparte. Para `ProductDetail`:
 * - su propio `useQuery` contra `/v1/catalog/products/:reference` se resuelve
 *   desde la cache de TanStack Query, precargada con los fixtures antes de
 *   abrir el diálogo;
 * - `ProductCommentsList`/`ProductCommentsAndRating` (feature `product-reviews`,
 *   ajena a Commerce) reciben transportes fixture via las props inyectables
 *   que `ProductDetail` ya reenvía -mismo patrón que sus propios tests-, en
 *   vez de golpear a Community de verdad con un `productId` ficticio: esa
 *   llamada real era la causa exacta del "Internal server error" que
 *   aparecía en capturas previas del preview (Community valida el formato de
 *   `productId` y estos fixtures no son UUID reales de Catalog).
 *
 * El carrito es enteramente estado local de React -sin `useCart`/Commerce/
 * red-, con un selector DEV para pasar entre vacío, 1, 3 y 6 líneas, visible
 * tanto en el panel inline como en el mismo `CommerceDialog` flotante que usa
 * producción.
 *
 * Montada SOLO por `dev-routes.tsx` dentro de la rama `import.meta.env.DEV`
 * (ver ese archivo): Vite elimina esta ruta y este componente por completo
 * del bundle de producción, igual que el resto de harnesses `*DevPreview`.
 */
const CART_LINE_FIXTURES: readonly CartLine[] = MARKETPLACE_PREVIEW_PRODUCTS.slice(0, 6).map(
  (product, index) => ({
    productId: product.productId,
    sku: product.sku,
    name: product.name,
    imageUrl: product.imageUrl,
    unitPrice: product.realMoneyPrice?.amount ?? product.creditsPrice,
    quantity: index + 1,
    subtotal: (product.realMoneyPrice?.amount ?? product.creditsPrice) * (index + 1),
  }),
)

const CART_PREVIEW_COUNTS = [0, 1, 3, 6] as const

const cartFixture = (lineCount: number): Cart | null => {
  if (lineCount === 0) return null
  const lines = CART_LINE_FIXTURES.slice(0, lineCount)
  return {
    id: 'preview-cart',
    customerId: 'preview-customer',
    status: 'DRAFT',
    currency: 'COP',
    total: lines.reduce((sum, line) => sum + line.subtotal, 0),
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    lines,
  }
}

/** Sin comentarios reales que listar; una pagina vacia deja ver el estado "sin comentarios" real de `ProductCommentsList`, no un error. */
const previewListComments: ListCommentsTransport = () =>
  Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 })
/** Si alguien pulsa "Publicar" en el preview, falla de forma controlada -mismo camino que un 500 real- en vez de golpear Community. */
const previewPublishComment: PublishCommentTransport = () =>
  Promise.reject(new Error('Vista previa de desarrollo: sin publicacion real.'))
const previewSubmitRating: SubmitRatingTransport = () =>
  Promise.reject(new Error('Vista previa de desarrollo: sin calificacion real.'))

export const MarketplacePreviewPage = (): React.JSX.Element => {
  const queryClient = useQueryClient()
  const [wished, setWished] = useState<ReadonlySet<string>>(new Set())
  const [ownedId] = useState(() => MARKETPLACE_PREVIEW_PRODUCTS[0]?.productId ?? null)
  const [selected, setSelected] = useState<string | null>(null)
  const [cartLineCount, setCartLineCount] = useState<(typeof CART_PREVIEW_COUNTS)[number]>(0)
  const [cartInlineOpen, setCartInlineOpen] = useState(false)
  const [cartModalOpen, setCartModalOpen] = useState(false)
  const cart = useMemo(() => cartFixture(cartLineCount), [cartLineCount])

  useEffect(() => {
    for (const item of MARKETPLACE_PREVIEW_PRODUCTS) {
      queryClient.setQueryData(queryKeys.commerce.product(item.productId), item)
    }
  }, [queryClient])

  return (
    <div className="commerce-page">
      <p role="status" className="p-4 text-xs text-warning">
        Vista previa de desarrollo (`MarketplacePreviewPage`): productos, comentarios y carrito
        ficticios, ninguna llamada real a Catalog/Commerce/Community. No existe en producción.
      </p>
      <div className="mk-panel m-4 flex flex-wrap items-center gap-3 p-3">
        <span className="text-xs font-semibold text-muted">Carrito de prueba (solo DEV):</span>
        {CART_PREVIEW_COUNTS.map((count) => (
          <Button
            key={count}
            variant={cartLineCount === count ? 'marketplace' : 'secondary'}
            className="mk-btn-secondary"
            onClick={() => {
              setCartLineCount(count)
            }}
          >
            {count === 0 ? 'Vacío' : `${String(count)} línea${count > 1 ? 's' : ''}`}
          </Button>
        ))}
        <Button
          variant="secondary"
          className="mk-btn-secondary"
          onClick={() => {
            setCartInlineOpen((value) => !value)
          }}
        >
          {cartInlineOpen ? 'Ocultar carrito inline' : 'Mostrar carrito inline'}
        </Button>
        <Button
          variant="secondary"
          className="mk-btn-secondary"
          onClick={() => {
            setCartModalOpen(true)
          }}
        >
          Abrir carrito flotante (modal)
        </Button>
      </div>
      {cartInlineOpen && (
        <div className="m-4">
          <CartPanel
            cart={cart}
            expanded
            onToggle={() => {
              setCartInlineOpen(false)
            }}
            onChangeQuantity={() => {
              /* Preview visual: usa los botones de arriba para cambiar el numero de lineas. */
            }}
            onRemove={() => {
              /* Preview visual: usa los botones de arriba para cambiar el numero de lineas. */
            }}
          />
        </div>
      )}
      {cartModalOpen && (
        <CommerceDialog
          title="Carrito (vista previa)"
          floating
          onClose={() => {
            setCartModalOpen(false)
          }}
        >
          {/*
            Mismo `CommerceDialog floating` que usa `CommercePage.tsx` en
            produccion para el carrito real: valida aqui, con fixtures, que
            0/1/3/6 lineas quepan sin salirse del viewport y que la lista use
            scroll interno (ver `commerce.css`, `.commerce-cart-lines`).
          */}
          <CartPanel
            cart={cart}
            expanded
            showMinimize={false}
            onToggle={() => {
              setCartModalOpen(false)
            }}
            onChangeQuantity={() => {
              /* Preview visual: usa los botones de arriba para cambiar el numero de lineas. */
            }}
            onRemove={() => {
              /* Preview visual: usa los botones de arriba para cambiar el numero de lineas. */
            }}
          />
        </CommerceDialog>
      )}
      <div className="commerce-showcase">
        <div className="commerce-results">
          <ShowcaseGrid
            products={MARKETPLACE_PREVIEW_PRODUCTS}
            onAddToCart={() => {
              /* Preview visual: sin mutacion real, ver documentacion de este archivo. */
            }}
            onOpenDetail={setSelected}
            isWished={(reference) => wished.has(reference)}
            isOwned={(reference) => reference === ownedId}
            onToggleWish={(reference) => {
              setWished((current) => {
                const next = new Set(current)
                if (next.has(reference)) next.delete(reference)
                else next.add(reference)
                return next
              })
            }}
          />
        </div>
      </div>
      {selected !== null && (
        <CommerceDialog
          title="Detalle del producto (vista previa)"
          wide
          onClose={() => {
            setSelected(null)
          }}
        >
          <ProductDetail
            reference={selected}
            listComments={previewListComments}
            publishComment={previewPublishComment}
            submitRating={previewSubmitRating}
          />
        </CommerceDialog>
      )}
    </div>
  )
}
