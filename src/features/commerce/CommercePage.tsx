import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { QueryState } from '@/components/ui/QueryState'
import { SignInPrompt } from '@/app/SignInPrompt'
import { useSession } from '@/shared/session'
import { CatalogBanner } from '@/features/notifications/CatalogBanner'
import { CatalogNotificationsSummary } from '@/features/notifications/CatalogNotificationsSummary'
import { useLanguage } from '@/shared/i18n/language'
import { describeFailure } from '@/shared/i18n/errors'
import { countLabel } from '@/shared/i18n/format'
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

/**
 * La vitrina conserva su espacio mientras carrito, detalle y pago se abren en una capa.
 *
 * NAVEGACION DE INVITADO: esta pantalla vive fuera de `RequireSession` (ver
 * `routes.tsx`) porque ver la vitrina y el detalle de un producto no exige
 * cuenta. Comprar si la exige -el carrito es por cuenta en Commerce-, asi que
 * el aviso de "inicia sesion o crea una cuenta" aparece justo al intentar
 * anadir algo al carrito, no antes: quien solo quiere mirar nunca lo ve.
 */
export const CommercePage = (): React.JSX.Element => {
  const subject = useSession((state) => state.subject)
  const { t } = useTranslation()
  const language = useLanguage((state) => state.language)
  const { cart, isLoading, error, busySku, isBusy, add, changeQuantity, remove, mutationError } =
    useCart()
  const savedCart = useSavedCart()
  const panel = useCartPanelState()
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null)
  const [signInPromptOpen, setSignInPromptOpen] = useState(false)
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
          <h1 className="text-xl font-semibold text-ink">{t('commerce:page.title')}</h1>
          <span className="hidden text-xs text-muted sm:inline">{t('commerce:page.tagline')}</span>
        </div>
        <p aria-live="polite" className="text-xs text-muted">
          {countLabel(t, 'commerce:page.cartCount', cart?.itemCount ?? 0)}
        </p>
      </header>
      <CatalogBanner />
      <CatalogNotificationsSummary />
      {cartError !== null && (
        <p role="alert" className="commerce-notice text-sm text-danger">
          {cartError instanceof Error
            ? describeFailure(cartError, t, language)
            : t('commerce:page.cartFailed')}
        </p>
      )}
      <Showcase
        onAddToCart={(product) => {
          if (subject === null) {
            setSignInPromptOpen(true)
            return
          }
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
      {signInPromptOpen && (
        <CommerceDialog
          title={t('commerce:page.signInTitle')}
          onClose={() => {
            setSignInPromptOpen(false)
          }}
        >
          <div className="flex justify-center p-6">
            <SignInPrompt
              description={t('commerce:page.signInDescription')}
              onCancel={() => {
                setSignInPromptOpen(false)
              }}
            />
          </div>
        </CommerceDialog>
      )}
      {panel.expanded && (
        <CommerceDialog title={t('commerce:page.cartDialog')} floating onClose={panel.toggle}>
          <QueryState isLoading={isLoading} error={error}>
            <CartPanel {...cartProps} expanded />
          </QueryState>
          {mutationError !== null && (
            <p role="alert" className="px-4 py-2 text-sm text-danger">
              {mutationError instanceof Error
                ? describeFailure(mutationError, t, language)
                : t('commerce:page.cartFailed')}
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
          title={t('commerce:page.checkoutDialog')}
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
