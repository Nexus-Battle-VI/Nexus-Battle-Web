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

/** Entrada del jugador: productos canonicos, deseos, carrito y pago exclusivamente simulado. */
export const CommercePage = (): React.JSX.Element => {
  const { cart, isLoading, error, busySku, isBusy, add, changeQuantity, remove, mutationError } =
    useCart()
  const savedCart = useSavedCart()
  const panel = useCartPanelState(true)
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null)
  const checkout = useCheckout(payingOrderId)
  const locked = isBusy || savedCart.isBusy || checkout.isPaying

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-ink">E-commerce</h1>
      <QueryState isLoading={isLoading} error={error}>
        <CartPanel
          cart={cart}
          expanded={panel.expanded}
          onToggle={panel.toggle}
          onChangeQuantity={changeQuantity}
          onRemove={remove}
          busySku={busySku}
          disabled={locked}
          {...(cart === null || cart.lines.length === 0
            ? {}
            : {
                onCheckout: () => {
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
          {checkout.summary !== null && (
            <CheckoutPanel
              key={payingOrderId}
              summary={checkout.summary}
              onPay={checkout.pay}
              onCancel={() => {
                setPayingOrderId(null)
              }}
              isPaying={checkout.isPaying}
              processing={checkout.processing}
              disabled={isBusy || savedCart.isBusy || checkout.isRefreshing}
              error={checkout.paymentError}
              result={checkout.result}
            />
          )}
        </QueryState>
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
        disabled={locked}
        cartCurrency={cart !== null && cart.lines.length > 0 ? cart.currency : null}
      />
    </div>
  )
}
