import { Card } from '@/components/ui/Card'
import { QueryState } from '@/components/ui/QueryState'
import { CartPanel } from './cart/CartPanel'
import { useCartPanelState } from './cart/useCartPanelState'
import { useCart } from './cart/useCart'
import { SavedCartPanel } from './saved-cart/SavedCartPanel'
import { useSavedCart } from './saved-cart/useSavedCart'

/**
 * Pantalla del bounded context Commerce.
 *
 * De momento presenta el carrito (HU-58). La vitrina desde la que se anaden
 * productos es HU-57 y todavia no existe, asi que **aqui no se simula una**:
 * una rejilla de productos inventados seria indistinguible de la real, y esa
 * confusion es peor que declarar lo que falta.
 */
export const CommercePage = (): React.JSX.Element => {
  const { cart, isLoading, error, busySku, changeQuantity, remove, mutationError } = useCart()
  const savedCart = useSavedCart()
  const panel = useCartPanelState(true)

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
        />
      </QueryState>

      {mutationError !== null && (
        <p role="alert" className="text-sm text-danger">
          {mutationError instanceof Error
            ? mutationError.message
            : 'No se pudo actualizar el carrito.'}
        </p>
      )}

      <SavedCartPanel
        saved={savedCart.saved}
        unavailable={savedCart.unavailable}
        canSave={cart !== null && cart.lines.length > 0}
        onSave={savedCart.save}
        onRestore={savedCart.restore}
        onDiscard={savedCart.discard}
        isBusy={savedCart.isBusy}
        error={savedCart.actionError ?? savedCart.error}
      />

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
