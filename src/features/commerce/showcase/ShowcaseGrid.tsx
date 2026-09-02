import { Button } from '@/components/ui/Button'
import { formatMoney } from '@/lib/format'
import type { ShowcaseProduct } from './api'

export interface ShowcaseGridProps {
  readonly products: readonly ShowcaseProduct[]
  readonly onAddToCart: (sku: string) => void
  readonly onOpenDetail: (sku: string) => void
  /** Referencia con una operacion en curso. */
  readonly busySku?: string | null
  /** HU-56. Ausentes cuando la lista de deseos no esta disponible. */
  readonly isWished?: (sku: string) => boolean
  readonly isOwned?: (sku: string) => boolean
  readonly onToggleWish?: (sku: string) => void
  readonly wishBusySku?: string | null
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
  isWished,
  isOwned,
  onToggleWish,
  wishBusySku = null,
}: ShowcaseGridProps): React.JSX.Element => (
  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {products.map((product) => {
      const wished = isWished?.(product.sku) ?? false
      const owned = isOwned?.(product.sku) ?? false

      return (
        <li key={product.sku}>
          <article
            data-testid={`product-${product.sku}`}
            // El resaltado al pasar el raton es CA-05. `focus-within` lo replica
            // para quien navega con teclado, que no genera eventos de raton.
            className="flex h-full flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4 transition-colors hover:border-brand focus-within:border-brand"
          >
            <div className="flex items-start justify-between gap-2">
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

              {onToggleWish !== undefined && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleWish(product.sku)
                  }}
                  disabled={wishBusySku === product.sku}
                  // `aria-pressed` comunica el estado, que es lo que distingue
                  // «en deseos» de «no en deseos» para un lector de pantalla: el
                  // corazon relleno solo lo ve quien mira.
                  aria-pressed={wished}
                  aria-label={
                    wished
                      ? `Quitar ${product.name} de la lista de deseos`
                      : `Anadir ${product.name} a la lista de deseos`
                  }
                  data-testid={`wish-${product.sku}`}
                  className="shrink-0 rounded p-1 text-lg leading-none transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <span aria-hidden="true">{wished ? '♥' : '♡'}</span>
                </button>
              )}
            </div>

            <p className="text-base font-semibold text-ink tabular-nums">
              {formatMoney(product.price.amount, product.price.currency)}
            </p>

            <div className="flex flex-wrap gap-2">
              {product.isPremium && <span className="text-xs font-medium text-brand">Premium</span>}

              {/*
              Dos marcas distintas porque son dos conceptos distintos, y CA-05
              lo exige: anadir a deseos no marca nada como adquirido. Un
              producto puede estar en deseos, adquirido, ambas cosas o ninguna.
            */}
              {wished && (
                <span
                  data-testid={`badge-deseos-${product.sku}`}
                  className="rounded-full border border-brand px-2 py-0.5 text-xs font-medium text-brand"
                >
                  En deseos
                </span>
              )}

              {owned && (
                <span
                  data-testid={`badge-propio-${product.sku}`}
                  className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium text-muted"
                >
                  Propio
                </span>
              )}
            </div>

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
      )
    })}
  </ul>
)
