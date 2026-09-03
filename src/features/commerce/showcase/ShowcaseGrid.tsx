import { Button } from '@/components/ui/Button'
import { ProductImage } from '@/features/commerce/ProductImage'
import { PRODUCT_TYPE_LABELS, type ShowcaseProduct } from './api'
import { ProductAttributes } from './ProductAttributes'
import { ProductPrice } from './ProductPrice'

export interface ShowcaseGridProps {
  readonly products: readonly ShowcaseProduct[]
  readonly onAddToCart: (product: ShowcaseProduct) => void
  readonly onOpenDetail: (reference: string) => void
  readonly busySku?: string | null
  readonly disabled?: boolean
  readonly cartCurrency?: string | null
  readonly isWished?: (reference: string) => boolean
  readonly isOwned?: (reference: string) => boolean
  readonly onToggleWish?: (reference: string) => void
  readonly wishBusySku?: string | null
  readonly wishlistUnavailable?: boolean
}

export const ShowcaseGrid = ({
  products,
  onAddToCart,
  onOpenDetail,
  busySku = null,
  disabled = false,
  cartCurrency = null,
  isWished,
  isOwned,
  onToggleWish,
  wishBusySku = null,
  wishlistUnavailable = false,
}: ShowcaseGridProps): React.JSX.Element => (
  <ul
    aria-label="Productos"
    className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4"
  >
    {products.map((product) => {
      const wished = isWished?.(product.productId) ?? false
      const owned = isOwned?.(product.productId) ?? false
      const otherCurrency =
        cartCurrency !== null &&
        product.realMoneyPrice !== null &&
        product.realMoneyPrice.currency !== cartCurrency
      const unavailable =
        !product.premium ||
        product.realMoneyPrice === null ||
        product.availableUnits === 0 ||
        product.lifecycleStatus !== 'ACTIVE'
      return (
        <li key={product.productId}>
          <article
            data-testid={`product-${product.sku}`}
            className="flex h-full min-w-0 flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4 transition-colors hover:border-brand focus-within:border-brand"
          >
            <button
              type="button"
              aria-label={`Ver detalle de ${product.name}`}
              onClick={() => {
                onOpenDetail(product.productId)
              }}
              className="text-left focus-visible:outline-2 focus-visible:outline-brand"
            >
              <ProductImage source={product.imageUrl} name={product.name} />
              <h3 className="mt-3 text-base font-semibold text-ink">{product.name}</h3>
              <p className="text-xs text-muted">{PRODUCT_TYPE_LABELS[product.type]}</p>
            </button>
            <p className="whitespace-pre-wrap break-words text-sm text-muted">
              {product.description}
            </p>
            <ProductAttributes values={product.attributes.values} />
            <ProductPrice product={product} />
            <div className="flex flex-wrap items-center gap-2">
              {product.premium && <span className="text-xs font-medium text-brand">Premium</span>}
              {product.availableUnits === 0 && <span className="text-xs text-muted">Agotado</span>}
              {wished && (
                <span
                  data-testid={`badge-deseos-${product.sku}`}
                  className="rounded-full border border-brand px-2 py-0.5 text-xs text-brand"
                >
                  En deseos
                </span>
              )}
              {owned && (
                <span
                  data-testid={`badge-propio-${product.sku}`}
                  className="rounded-full border border-border px-2 py-0.5 text-xs text-muted"
                >
                  Propio
                </span>
              )}
              {onToggleWish !== undefined && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleWish(product.productId)
                  }}
                  disabled={wishlistUnavailable || wishBusySku === product.productId}
                  aria-pressed={wished}
                  aria-label={
                    wished
                      ? `Quitar ${product.name} de la lista de deseos`
                      : `Anadir ${product.name} a la lista de deseos`
                  }
                  data-testid={`wish-${product.sku}`}
                  className="rounded p-2 text-lg disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <span aria-hidden="true">{wished ? '♥' : '♡'}</span>
                </button>
              )}
            </div>
            <Button
              className="mt-auto"
              onClick={() => {
                onAddToCart(product)
              }}
              disabled={disabled || busySku === product.productId || unavailable || otherCurrency}
              aria-label={`Anadir ${product.name} al carrito`}
            >
              Anadir al carrito
            </Button>
            {!product.premium && (
              <p className="text-xs text-muted">
                La compra con dinero está disponible para productos premium.
              </p>
            )}
            {otherCurrency && (
              <p className="text-xs text-muted">
                Tu carrito está en {cartCurrency}. Vacíalo antes de elegir otra moneda.
              </p>
            )}
          </article>
        </li>
      )
    })}
  </ul>
)
