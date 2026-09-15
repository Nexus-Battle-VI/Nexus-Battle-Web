import { Button } from '@/components/ui/Button'
import { ProductImage } from '@/features/commerce/ProductImage'
import { PRODUCT_TYPE_LABELS, type ShowcaseProduct } from './api'
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
  <ul aria-label="Productos" className="commerce-product-grid">
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
      const reason = otherCurrency
        ? `Tu carrito está en ${cartCurrency}. Vacíalo antes de elegir otra moneda.`
        : !product.premium
          ? 'La compra con dinero está disponible para productos premium.'
          : unavailable
            ? 'Este producto no está disponible para comprar.'
            : undefined
      return (
        <li key={product.productId} className="min-h-0 min-w-0">
          <article
            data-testid={`product-${product.sku}`}
            className="commerce-product-card rounded-xl border border-border bg-surface-raised transition-colors hover:border-brand focus-within:border-brand"
          >
            <button
              type="button"
              aria-label={`Ver detalle de ${product.name}`}
              onClick={() => {
                onOpenDetail(product.productId)
              }}
              className="commerce-product-heading text-left focus-visible:outline-2 focus-visible:outline-brand"
            >
              <ProductImage
                source={product.imageUrl}
                name={product.name}
                className="commerce-product-image rounded-lg bg-surface object-contain"
              />
              <span className="min-w-0">
                <span
                  className="commerce-product-name text-sm font-semibold text-ink"
                  title={product.name}
                >
                  {product.name}
                </span>
                <span className="block text-xs text-muted">
                  {PRODUCT_TYPE_LABELS[product.type]}
                </span>
              </span>
            </button>
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
                className="commerce-wish rounded-full text-xl text-brand disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand"
              >
                <span aria-hidden="true">{wished ? '♥' : '♡'}</span>
              </button>
            )}
            <p
              className="commerce-product-description text-xs text-muted"
              title={product.description}
            >
              {product.description}
            </p>
            <div className="commerce-product-meta">
              <div className="commerce-product-price">
                <ProductPrice product={product} />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-medium">
                {product.premium && <span className="text-brand">Premium</span>}
                {wished && (
                  <span
                    data-testid={`badge-deseos-${product.sku}`}
                    className="rounded bg-brand/10 px-1 text-brand"
                  >
                    En deseos
                  </span>
                )}
                {owned && (
                  <span
                    data-testid={`badge-propio-${product.sku}`}
                    className="rounded bg-surface px-1 text-muted"
                  >
                    Propio
                  </span>
                )}
              </div>
            </div>
            <Button
              className="commerce-add"
              onClick={() => {
                onAddToCart(product)
              }}
              disabled={disabled || busySku === product.productId || unavailable || otherCurrency}
              aria-label={`Anadir ${product.name} al carrito`}
              aria-describedby={reason === undefined ? undefined : `reason-${product.productId}`}
              title={reason}
            >
              {otherCurrency
                ? 'Otra moneda'
                : product.availableUnits === 0
                  ? 'Agotado'
                  : unavailable
                    ? 'No disponible'
                    : 'Añadir al carrito'}
            </Button>
            {reason !== undefined && (
              <p id={`reason-${product.productId}`} className="sr-only">
                {reason}
              </p>
            )}
          </article>
        </li>
      )
    })}
  </ul>
)
