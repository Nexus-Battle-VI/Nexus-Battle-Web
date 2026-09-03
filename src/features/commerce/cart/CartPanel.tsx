import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { formatMoney } from '@/lib/format'
import { ProductImage } from '@/features/commerce/ProductImage'
import type { Cart } from './api'

export interface CartPanelProps {
  readonly cart: Cart | null
  readonly expanded: boolean
  readonly onToggle: () => void
  readonly onChangeQuantity: (sku: string, quantity: number) => void
  readonly onRemove: (sku: string) => void
  readonly onCheckout?: () => void
  /** Referencia sobre la que hay una operacion en curso. */
  readonly busySku?: string | null
  readonly disabled?: boolean
}

/** Cantidad maxima que admite el servicio. */
const MAX_QUANTITY = 999

interface QuantityFieldProps {
  readonly sku: string
  readonly name: string
  readonly quantity: number
  readonly disabled: boolean
  readonly onCommit: (sku: string, quantity: number) => void
}

/**
 * Campo de cantidad que confirma al salir o con Enter, no en cada tecla.
 *
 * Enviar en cada pulsacion parece mas inmediato pero es peor: escribir «12»
 * produciria dos peticiones, la primera pidiendo una cantidad de 1 que nadie
 * quiso. El borrador vive aqui hasta que quien escribe termina.
 *
 * Se vuelve a sincronizar con la cantidad del servicio cuando esta cambia, de
 * modo que si el servicio ajusta o rechaza el valor, el campo muestra lo que
 * de verdad hay en el carrito y no lo que se intento poner.
 */
const QuantityField = ({
  sku,
  name,
  quantity,
  disabled,
  onCommit,
}: QuantityFieldProps): React.JSX.Element => {
  const [draft, setDraft] = useState(String(quantity))
  const [lastSynced, setLastSynced] = useState(quantity)

  if (quantity !== lastSynced) {
    setLastSynced(quantity)
    setDraft(String(quantity))
  }

  const commit = (): void => {
    const next = Number(draft)

    // Un campo vacio o no numerico no es una peticion de cantidad cero: se
    // descarta el borrador y se recupera lo que hay en el carrito.
    if (draft.trim() === '' || !Number.isInteger(next)) {
      setDraft(String(quantity))

      return
    }

    if (next !== quantity) {
      onCommit(sku, next)
    }
  }

  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      <span className="sr-only">Cantidad de {name}</span>
      <input
        type="number"
        min={1}
        max={MAX_QUANTITY}
        value={draft}
        disabled={disabled}
        aria-label={`Cantidad de ${name}`}
        onChange={(event) => {
          setDraft(event.target.value)
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit()
          }
        }}
        className="w-16 rounded border border-border bg-surface px-2 py-1 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      />
    </label>
  )
}

/**
 * Carrito de compras, en sus dos vistas.
 *
 * **Minimizada:** solo el icono y el numero de productos agregados, que es
 * exactamente lo que pide RF-58. **Desplegada:** por cada producto su imagen,
 * nombre, precio unitario, cantidad y subtotal, mas el total y el boton para
 * proceder al pago.
 *
 * Ningun importe se calcula aqui: todos vienen del servicio. La interfaz
 * tampoco decide si una cantidad es valida; envia la que se pide y deja que el
 * servicio la rechace si procede, para no acabar con dos reglas que puedan
 * discrepar.
 */
export const CartPanel = ({
  cart,
  expanded,
  onToggle,
  onChangeQuantity,
  onRemove,
  onCheckout,
  busySku = null,
  disabled = false,
}: CartPanelProps): React.JSX.Element => {
  const itemCount = cart?.itemCount ?? 0

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={false}
        // El nombre accesible dice el numero, no solo lo pinta: quien navega
        // con lector de pantalla necesita saber cuantos productos lleva.
        aria-label={`Carrito, ${String(itemCount)} productos`}
        aria-haspopup="dialog"
        className="commerce-cart-bubble inline-flex items-center gap-3 rounded-full border border-brand/40 bg-brand px-5 py-3 text-sm font-semibold text-brand-ink shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <ShoppingCart aria-hidden="true" className="size-5" />
        <span>Carrito</span>
        <span
          data-testid="cart-item-count"
          className="min-w-6 rounded-full bg-surface px-1.5 py-0.5 text-center text-xs font-semibold text-ink"
        >
          {itemCount}
        </span>
      </button>
    )
  }

  return (
    <section
      aria-label="Carrito de compras"
      className="rounded-lg border border-border bg-surface-raised p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">
          Carrito{' '}
          <span data-testid="cart-item-count" className="text-sm font-normal text-muted">
            ({itemCount})
          </span>
        </h2>
        <Button variant="secondary" onClick={onToggle} aria-expanded>
          Minimizar
        </Button>
      </div>

      {cart === null || cart.lines.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Tu carrito esta vacio.</p>
      ) : (
        <>
          <ul
            aria-label="Productos del carrito"
            tabIndex={0}
            className="commerce-cart-lines mt-4 flex max-h-[32dvh] flex-col gap-3 overflow-y-auto overscroll-contain pr-1 focus-visible:outline-2 focus-visible:outline-brand"
          >
            {cart.lines.map((line) => (
              <li
                key={line.sku}
                className="flex flex-wrap items-center gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0"
              >
                <ProductImage
                  {...(line.imageUrl === undefined ? {} : { source: line.imageUrl })}
                  name={line.name ?? line.sku}
                  className="size-12 shrink-0 rounded border border-border bg-surface object-cover"
                />

                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-ink">
                    {line.name ?? line.sku}
                  </p>
                  <p className="text-xs text-muted">
                    {formatMoney(line.unitPrice, cart.currency)} por unidad
                  </p>
                </div>

                <QuantityField
                  sku={line.productId ?? line.sku}
                  name={line.name ?? line.sku}
                  quantity={line.quantity}
                  disabled={disabled || busySku === (line.productId ?? line.sku)}
                  onCommit={onChangeQuantity}
                />

                <p
                  data-testid={`subtotal-${line.sku}`}
                  className="w-24 text-right text-sm font-medium text-ink tabular-nums"
                >
                  {formatMoney(line.subtotal, cart.currency)}
                </p>

                <Button
                  variant="secondary"
                  onClick={() => {
                    onRemove(line.productId ?? line.sku)
                  }}
                  disabled={disabled || busySku === (line.productId ?? line.sku)}
                  aria-label={`Quitar ${line.name ?? line.sku} del carrito`}
                >
                  Quitar
                </Button>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-sm text-muted">
              Total{' '}
              <span
                data-testid="cart-total"
                className="text-base font-semibold text-ink tabular-nums"
              >
                {formatMoney(cart.total, cart.currency)}
              </span>
            </p>
            <Button onClick={onCheckout} disabled={disabled || onCheckout === undefined}>
              Proceder al pago
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
