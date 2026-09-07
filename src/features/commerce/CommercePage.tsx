import { useState } from 'react'

import { QueryState } from '@/components/ui/QueryState'
import { CartPanel } from './cart/CartPanel'
import { useCartPanelState } from './cart/useCartPanelState'
import { useCart } from './cart/useCart'
import { CheckoutPanel } from './checkout/CheckoutPanel'
import { useCheckout } from './checkout/useCheckout'
import { SavedCartPanel } from './saved-cart/SavedCartPanel'
import { useSavedCart } from './saved-cart/useSavedCart'
import { Showcase } from './showcase/Showcase'
import { CommerceDialog } from './CommerceDialog'
import './commerce.css'

/** La vitrina conserva su espacio mientras carrito, detalle y pago se abren en una capa. */
export const CommercePage = (): React.JSX.Element => {
  const { cart, isLoading, error, busySku, isBusy, add, changeQuantity, remove, mutationError } =
    useCart()
  const savedCart = useSavedCart()
  const panel = useCartPanelState()
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null)
  const checkout = useCheckout(payingOrderId)
  const locked = isBusy || savedCart.isBusy || checkout.isPaying
  const closePayment = (): void => {
    setPayingOrderId(null)
  }
  const cartProps = {
    cart,
    onToggle: panel.toggle,
    onChangeQuantity: changeQuantity,
    onRemove: remove,
    busySku,
    disabled: locked,
    ...(cart === null || cart.lines.length === 0
      ? {}
      : {
          onCheckout: () => {
            panel.toggle()
            setPayingOrderId(cart.id)
          },
        }),
  }
  const cartError = mutationError ?? error
  return (
    <div className="commerce-page">
      <header className="commerce-heading">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold text-ink">E-commerce</h1>
          <span className="hidden text-xs text-muted sm:inline">Equipa tu próxima batalla</span>
        </div>
        <p aria-live="polite" className="text-xs text-muted">
          {cart?.itemCount ?? 0} productos en tu carrito
        </p>
      </header>
      {cartError !== null && (
        <p role="alert" className="commerce-notice text-sm text-danger">
          {cartError instanceof Error ? cartError.message : 'No se pudo actualizar el carrito.'}
        </p>
      )}
      <Showcase
        onAddToCart={(product) => {
          if (product.realMoneyPrice !== null)
            add({
              productId: product.productId,
              quantity: 1,
              currency: product.realMoneyPrice.currency,
            })
        }}
        busySku={busySku}
        disabled={locked || isLoading || error !== null}
        cartCurrency={cart !== null && cart.lines.length > 0 ? cart.currency : null}
      />
      <div className="commerce-cart-launcher">
        <CartPanel {...cartProps} expanded={false} />
      </div>
      {panel.expanded && (
        <CommerceDialog title="Tu carrito" floating onClose={panel.toggle}>
          <QueryState isLoading={isLoading} error={error}>
            <CartPanel {...cartProps} expanded />
          </QueryState>
          {mutationError !== null && (
            <p role="alert" className="px-4 py-2 text-sm text-danger">
              {mutationError instanceof Error
                ? mutationError.message
                : 'No se pudo actualizar el carrito.'}
            </p>
          )}
          <QueryState isLoading={savedCart.isLoading} error={savedCart.error}>
            <SavedCartPanel
              saved={savedCart.saved}
              unavailable={savedCart.unavailable}
              canSave={cart !== null && cart.lines.length > 0}
              onSave={savedCart.save}
              onRestore={savedCart.restore}
              onDiscard={savedCart.discard}
              isBusy={locked}
              error={savedCart.actionError}
            />
          </QueryState>
        </CommerceDialog>
      )}
      {payingOrderId !== null && (
        <CommerceDialog
          title="Finalizar compra"
          onClose={closePayment}
          locked={checkout.isPaying && !checkout.processing}
        >
          <QueryState isLoading={checkout.isLoading} error={checkout.error}>
            {checkout.summary !== null && (
              <CheckoutPanel
                key={payingOrderId}
                summary={checkout.summary}
                onPay={checkout.pay}
                onCancel={() => {
                  closePayment()
                  if (checkout.result?.status !== 'COMPLETED') panel.toggle()
                }}
                isPaying={checkout.isPaying}
                processing={checkout.processing}
                disabled={isBusy || savedCart.isBusy || checkout.isRefreshing}
                error={checkout.paymentError}
                result={checkout.result}
              />
            )}
          </QueryState>
        </CommerceDialog>
      )}
    </div>
  )
}
