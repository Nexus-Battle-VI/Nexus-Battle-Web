import { useState } from 'react'

import { Card } from '@/components/ui/Card'
import { QueryState } from '@/components/ui/QueryState'
import { CartPanel } from './cart/CartPanel'
import { useCartPanelState } from './cart/useCartPanelState'
import { useCart } from './cart/useCart'
import { CheckoutPanel } from './checkout/CheckoutPanel'
import { useCheckout } from './checkout/useCheckout'

/**
 * Pantalla del bounded context Commerce.
 *
 * Presenta el carrito (HU-58) y, al proceder al pago, el resumen de compra y
 * el formulario de pago simulado (HU-59). La vitrina desde la que se anaden
 * productos es HU-57 y todavia no existe, asi que **aqui no se simula una**:
 * una rejilla de productos inventados seria indistinguible de la real, y esa
 * confusion es peor que declarar lo que falta.
 */
export const CommercePage = (): React.JSX.Element => {
  const { cart, isLoading, error, busySku, changeQuantity, remove, mutationError } = useCart()
  const panel = useCartPanelState(true)

  /** Pedido que se esta pagando. `null` mientras se navega el carrito. */
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null)
  const checkout = useCheckout(payingOrderId)

  return (
    <div className="flex flex-col gap-4">
      <QueryState isLoading={isLoading} error={error}>
        <CartPanel
          cart={cart}
          expanded={panel.expanded}
          onToggle={panel.toggle}
          onChangeQuantity={changeQuantity}
          onRemove={remove}
          busySku={busySku}
          {...(cart === null || cart.lines.length === 0
            ? {}
            : {
                onCheckout: (): void => {
                  setPayingOrderId(cart.id)
                },
              })}
        />
      </QueryState>

      {mutationError !== null && (
        <p role="alert" className="text-sm text-danger">
          {mutationError instanceof Error
            ? mutationError.message
            : 'No se pudo actualizar el carrito.'}
        </p>
      )}

      {payingOrderId !== null && (
        <QueryState isLoading={checkout.isLoading} error={checkout.error}>
          {checkout.summary === null ? (
            <p className="text-sm text-muted">No hay resumen de compra que mostrar.</p>
          ) : (
            <CheckoutPanel
              summary={checkout.summary}
              onPay={checkout.pay}
              onCancel={() => {
                setPayingOrderId(null)
              }}
              isPaying={checkout.isPaying}
              error={checkout.paymentError}
              result={checkout.result}
            />
          )}
        </QueryState>
      )}

      <Card title="Vitrina" description="Busqueda y filtros de productos.">
        <p className="text-sm text-muted">
          La vitrina todavia no esta implementada: corresponde a HU-57. Hasta entonces el carrito se
          puede consultar y modificar, pero los productos se anaden desde el servicio
          <code className="mx-1 rounded bg-surface px-1.5 py-0.5 text-xs">
            Nexus-Battle-Commerce
          </code>
          .
        </p>
      </Card>
    </div>
  )
}
