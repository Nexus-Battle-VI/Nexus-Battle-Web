import { Card } from '@/components/ui/Card'
import { QueryState } from '@/components/ui/QueryState'
import { CartPanel } from './cart/CartPanel'
import { useCartPanelState } from './cart/useCartPanelState'
import { useCart } from './cart/useCart'
import { Showcase } from './showcase/Showcase'
import { useWishlist } from './wishlist/useWishlist'

/**
 * Pantalla del bounded context Commerce.
 *
 * Reune la vitrina (HU-57) y el carrito (HU-58). El carrito permanece visible
 * en la pantalla, que es lo que pide RF-58 con «disponible en todas las vistas
 * del modulo».
 */
export const CommercePage = (): React.JSX.Element => {
  const { cart, isLoading, error, busySku, add, changeQuantity, remove, mutationError } = useCart()
  const wishlist = useWishlist()
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

      <Showcase
        onAddToCart={(sku) => {
          add({ sku, quantity: 1 })
        }}
        busySku={busySku}
        isWished={wishlist.isWished}
        isOwned={wishlist.isOwned}
        onToggleWish={wishlist.toggle}
        wishBusySku={wishlist.busySku}
      />

      {wishlist.mutationError !== null && (
        <p role="alert" className="text-sm text-danger">
          {wishlist.mutationError instanceof Error
            ? wishlist.mutationError.message
            : 'No se pudo actualizar la lista de deseos.'}
        </p>
      )}

      <Card title="Pendiente en la vitrina">
        <p className="text-sm text-muted">
          La vitrina muestra el nombre, el tipo y el precio de cada producto. La imagen, la
          descripcion, las habilidades y el marcador de promocion todavia no se pueden mostrar
          porque el servicio
          <code className="mx-1 rounded bg-surface px-1.5 py-0.5 text-xs">
            Nexus-Battle-Catalog
          </code>
          no los publica en su API. El detalle de producto y el pago corresponden a HU-59.
        </p>
      </Card>
    </div>
  )
}
