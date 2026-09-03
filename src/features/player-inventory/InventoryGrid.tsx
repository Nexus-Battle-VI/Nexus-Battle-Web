import clsx from 'clsx'

import type { OwnedInventoryItem } from './api'
import { ProductThumb } from './ProductThumb'
import { typeLabel } from './typeLabels'

export interface InventoryGridProps {
  readonly items: readonly OwnedInventoryItem[]
  readonly selectedItemId: string | null
  readonly onSelect: (itemId: string) => void
}

/**
 * Rejilla de hasta 16 objetos poseidos (RF-27). Al elegir una tarjeta se
 * actualiza el panel de detalle en la MISMA vista: no se navega a otra pantalla,
 * para no obligar a bajar y volver a subir.
 */
export const InventoryGrid = ({
  items,
  selectedItemId,
  onSelect,
}: InventoryGridProps): React.JSX.Element => (
  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
    {items.map((item) => {
      const selected = item.itemId === selectedItemId
      const name = item.product?.name ?? item.itemId

      return (
        <li key={item.itemId}>
          <button
            type="button"
            onClick={() => {
              onSelect(item.itemId)
            }}
            aria-pressed={selected}
            data-testid={`inventory-item-${item.itemId}`}
            className={clsx(
              'flex h-full w-full flex-col gap-2 rounded-lg border bg-surface-raised p-3 text-left transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
              selected ? 'border-brand ring-1 ring-brand' : 'border-border hover:border-brand',
            )}
          >
            <ProductThumb src={item.product?.imageUrl ?? null} alt={name} />

            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-ink" title={name}>
                {name}
              </h3>
              <p className="mt-0.5 text-xs text-muted">
                {item.product === null ? 'Producto no disponible' : typeLabel(item.product.type)}
                {' · '}
                <span className="tabular-nums">x{item.quantity}</span>
              </p>
            </div>
          </button>
        </li>
      )
    })}
  </ul>
)
