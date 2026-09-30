import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { formatMoney } from '@/lib/format'
import { ProductImage } from '@/features/commerce/ProductImage'
import { MarketplacePixelIcon } from '@/features/commerce/marketplace/MarketplacePixelIcon'
import { countLabel } from '@/shared/i18n/format'
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
  /**
   * Ultimo polish del carrito flotante: dentro de `CommerceDialog floating`
   * ya existe la X real para cerrar, asi que el boton "Minimizar" de este
   * panel es una segunda accion redundante alli (Richard lo pidio fuera del
   * modal). El carrito INLINE de `commerce-cart-launcher` y el panel inline
   * del preview DEV siguen necesitando su propio control, por eso el default
   * preserva el comportamiento existente y solo `CommercePage` lo desactiva
   * para la instancia que vive dentro del dialogo flotante.
   */
  readonly showMinimize?: boolean
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
  const { t } = useTranslation()
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
      <span className="sr-only">{t('commerce:cart.quantityOf', { name })}</span>
      <input
        type="number"
        min={1}
        max={MAX_QUANTITY}
        value={draft}
        disabled={disabled}
        aria-label={t('commerce:cart.quantityOf', { name })}
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
  showMinimize = true,
}: CartPanelProps): React.JSX.Element => {
  const itemCount = cart?.itemCount ?? 0
  const { t } = useTranslation()

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={false}
        // El nombre accesible dice el numero, no solo lo pinta: quien navega
        // con lector de pantalla necesita saber cuantos productos lleva.
        aria-label={countLabel(t, 'commerce:cart.bubble', itemCount)}
        aria-haspopup="dialog"
        className="commerce-cart-bubble"
      >
        <MarketplacePixelIcon icon="cart" size="md" />
        <span className="commerce-cart-bubble-label">{t('commerce:cart.title')}</span>
        <span data-testid="cart-item-count" className="commerce-cart-bubble-count">
          {itemCount}
        </span>
      </button>
    )
  }

  return (
    <section aria-label={t('commerce:cart.label')} className="mk-panel p-4">
      {/*
        Micro-polish final: dentro del modal flotante el contenido quedaba
        pegado al frame -el `border-width: 0` que ese contexto le impone a
        este `.mk-panel` (ver `commerce.css`) retira su propio marco
        decorativo, dejando solo el `p-4` del `<section>` como aire real. Este
        envoltorio anade el aire adicional que pidio Richard en UNA capa
        estructural reutilizable (`.commerce-cart-body`), en vez de tocar el
        padding linea por linea.
      */}
      <div className="commerce-cart-body">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-game-display text-base font-semibold text-ink">
            {t('commerce:cart.title')}{' '}
            <span data-testid="cart-item-count" className="text-sm font-normal text-muted">
              ({itemCount})
            </span>
          </h2>
          {showMinimize && (
            <Button variant="secondary" onClick={onToggle} aria-expanded>
              {t('commerce:cart.minimize')}
            </Button>
          )}
        </div>

        {cart === null || cart.lines.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{t('commerce:cart.empty')}</p>
        ) : (
          <>
            <ul
              aria-label={t('commerce:cart.lines')}
              tabIndex={0}
              className="commerce-cart-lines mt-4 flex max-h-[32dvh] flex-col gap-3 overflow-y-auto overscroll-contain pr-2 focus-visible:outline-2 focus-visible:outline-brand"
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
                      {t('commerce:cart.perUnit', {
                        price: formatMoney(line.unitPrice, cart.currency),
                      })}
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
                    aria-label={t('commerce:cart.removeLabel', { name: line.name ?? line.sku })}
                  >
                    {t('commerce:cart.remove')}
                  </Button>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-sm text-muted">
                <span className="font-game-display">{t('commerce:cart.total')}</span>{' '}
                <span
                  data-testid="cart-total"
                  className="text-base font-semibold text-ink tabular-nums"
                >
                  {formatMoney(cart.total, cart.currency)}
                </span>
              </p>
              <Button
                variant="marketplace"
                onClick={onCheckout}
                disabled={disabled || onCheckout === undefined}
              >
                {t('commerce:cart.checkout')}
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
