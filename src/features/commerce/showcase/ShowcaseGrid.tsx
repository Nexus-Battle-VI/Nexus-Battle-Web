import { Button } from '@/components/ui/Button'
import { formatMoney } from '@/lib/format'
import type { ShowcaseProduct } from './api'

export interface ShowcaseGridProps {
  readonly products: readonly ShowcaseProduct[]
  readonly onAddToCart: (sku: string) => void
  readonly onOpenDetail: (sku: string) => void
  /** Referencia con una operacion en curso. */
  readonly busySku?: string | null
}

/**
 * Rejilla de productos de la vitrina.
 *
 * Muestra **lo que Catalog publica hoy**: nombre, tipo y precio. HU-57 pide
 * ademas imagen, descripcion y habilidades, y el porcentaje de descuento
 * cuando hay promocion; ninguno de esos campos existe todavia en
 * `GET /api/products`. No se rellenan con valores inventados: una tarjeta con
 * una descripcion de relleno seria indistinguible de una terminada, y esa
 * confusion es peor que una ausencia declarada.
 */
export const ShowcaseGrid = ({
  products,
  onAddToCart,
  onOpenDetail,
  busySku = null,
}: ShowcaseGridProps): React.JSX.Element => (
  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {products.map((product) => (
      <li key={product.sku}>
        <article
          data-testid={`product-${product.sku}`}
          // El resaltado al pasar el raton es CA-05. `focus-within` lo replica
          // para quien navega con teclado, que no genera eventos de raton.
          className="flex h-full flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4 transition-colors hover:border-brand focus-within:border-brand"
        >
          <button
            type="button"
            onClick={() => {
              onOpenDetail(product.sku)
            }}
            className="text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <h3 className="text-sm font-semibold text-ink">{product.name}</h3>
            <p className="mt-0.5 text-xs text-muted">{product.category}</p>
          </button>

          <p className="text-base font-semibold text-ink tabular-nums">
            {formatMoney(product.price.amount, product.price.currency)}
          </p>

          {product.isPremium && <p className="text-xs font-medium text-brand">Premium</p>}

          <Button
            className="mt-auto"
            onClick={() => {
              onAddToCart(product.sku)
            }}
            disabled={busySku === product.sku}
            aria-label={`Anadir ${product.name} al carrito`}
          >
            Anadir al carrito
          </Button>
        </article>
      </li>
    ))}
  </ul>
)
