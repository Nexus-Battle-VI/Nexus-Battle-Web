import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { Hero3D, heroIdOfProduct } from '@/shared/visual-library/heroes'
import type { OwnedInventoryItem } from './api'
import { slotGroupForProductType } from './equipment/slots'
import { ProductThumb } from './ProductThumb'
import { typeLabel } from './typeLabels'

/**
 * MIME propio para el payload del drag (HU-28 Drag & Drop): `slotGroupFor
 * ProductType` -la MISMA fuente de verdad que ya usa el flujo de click- es
 * quien decide que es equipable, nunca una lista inventada aqui.
 */
const DRAG_MIME = 'application/x-nexus-inventory-item'

export interface InventoryGridProps {
  readonly items: readonly OwnedInventoryItem[]
  readonly selectedItemId: string | null
  /**
   * Tipo canónico compatible con la ranura elegida en el configurador (HU-28).
   * Cuando está informado, los productos de otro tipo se atenúan —sin ocultarse
   * ni deshabilitarse: el backend vuelve a validar—.
   */
  readonly highlightType?: string | null
  readonly onSelect: (itemId: string) => void
  /**
   * `itemId` reales (`EquippedProduct.itemId`) de lo que el heroe activo
   * lleva puesto ahora mismo, SOLO para el acento visual "equipada" de la
   * tarjeta -- presentacion pura derivada de `HeroEquipment`, nunca una
   * regla nueva. `undefined`/vacio si no aplica (sin heroe activo, etc.).
   */
  readonly equippedItemIds?: ReadonlySet<string> | undefined
  /**
   * Drag & Drop (HU-28, metodo ALTERNATIVO al flujo real de click+click+
   * Equipar, que SIGUE intacto): se dispara al empezar a arrastrar una
   * card con producto real, con el `itemId`/tipo exactos -nunca inventa
   * compatibilidad, la decide quien recibe esto comparando contra
   * `SLOT_META` real-. `onDragEnd` limpia el estado "arrastrando" aunque
   * el soltar ocurra fuera de cualquier ranura (cancelar = no-op).
   */
  readonly onDragStartItem?: (itemId: string, productType: string) => void
  readonly onDragEndItem?: () => void
}

/**
 * Rejilla de hasta 16 objetos poseidos (RF-27). Al elegir una tarjeta se
 * actualiza el panel de detalle en la MISMA vista y, si hay una ranura elegida
 * en el configurador de HU-28, se marcan los productos compatibles.
 */
export const InventoryGrid = ({
  items,
  selectedItemId,
  highlightType = null,
  onSelect,
  equippedItemIds,
  onDragStartItem,
  onDragEndItem,
}: InventoryGridProps): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    // Gate 8a pasada ("cards ligeramente mas anchas"): el gap baja de
    // 12px a 8px en desktop -espacio muerto entre tarjetas, no espacio
    // util- antes de robarle ancho a Hero Stage o a la Ficha.
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-2 lg:[grid-auto-rows:1fr]">
      {items.map((item) => {
        const selected = item.itemId === selectedItemId
        const name = item.product?.name ?? item.itemId
        const compatible = highlightType === null || item.product?.type === highlightType
        const equipped = equippedItemIds?.has(item.itemId) ?? false
        // Mismo criterio REAL que ya decide si una ranura admite el tipo
        // (`slotGroupForProductType`): solo arma/armadura/item son
        // arrastrables -un heroe o una epica en el inventario no van a
        // ninguna ranura de HU-28, igual que el click no los ofrece-.
        const draggableType =
          item.product !== null && slotGroupForProductType(item.product.type) !== null

        return (
          <li key={item.itemId}>
            <button
              type="button"
              onClick={() => {
                onSelect(item.itemId)
              }}
              draggable={draggableType}
              onDragStart={(event) => {
                if (item.product === null) return
                event.dataTransfer.effectAllowed = 'copy'
                event.dataTransfer.setData(
                  DRAG_MIME,
                  JSON.stringify({ itemId: item.itemId, productType: item.product.type }),
                )
                onDragStartItem?.(item.itemId, item.product.type)
              }}
              onDragEnd={() => {
                onDragEndItem?.()
              }}
              aria-pressed={selected}
              data-testid={`inventory-item-${item.itemId}`}
              data-compatible={highlightType === null ? undefined : String(compatible)}
              data-equipped={equipped ? 'true' : undefined}
              className={clsx(
                'inventory-card h-full w-full text-left',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                // Incompatible reduce protagonismo pero sigue siendo legible
                // (nombre/tipo deben poder leerse): 0.6, dentro del 0.55-0.7
                // pedido, nunca una opacidad extrema que lo vuelva invisible.
                !compatible && 'opacity-60',
                draggableType && 'cursor-grab active:cursor-grabbing',
              )}
            >
              <div className="inventory-card-art">
                {(() => {
                  const heroId =
                    item.product === null
                      ? null
                      : heroIdOfProduct(item.product.type, item.product.sku)
                  return heroId === null ? (
                    <ProductThumb src={item.product?.imageUrl ?? null} alt={name} />
                  ) : (
                    // El nombre ya lo muestra la tarjeta en el <h3> de abajo; se
                    // oculta la etiqueta que Hero3D repite por defecto.
                    <Hero3D heroId={heroId} className="h-full [&>p]:hidden" />
                  )
                })()}
              </div>

              <div className="min-w-0">
                {/*
                 * CORRECCION (7a pasada): el nombre a `text-sm` (0.875rem)
                 * robaba espacio real a la media area. Se reduce a un
                 * tamano cercano al de las etiquetas de ranura
                 * (`.inventory-slot-label`, 0.68rem) pero un poco mas
                 * reforzado para seguir leyendose como titulo de producto.
                 */}
                <h3
                  className="inventory-card-name text-[0.78rem] font-semibold text-ink"
                  title={name}
                >
                  {name}
                </h3>
                <p className="mt-0.5 text-[0.7rem] text-muted">
                  {item.product === null
                    ? t('inventory:catalog.unavailableProduct')
                    : typeLabel(item.product.type)}
                  {' · '}
                  <span className="tabular-nums">x{item.quantity}</span>
                </p>
                {/*
                 * Fila de status RESERVADA (gate: altura estable con o sin
                 * insignia, para que ninguna card cambie de composicion):
                 * siempre en el flujo normal, nunca `position:absolute`
                 * -asi nunca puede "montarse" sobre el nombre, el meta, ni
                 * la card vecina-.
                 */}
                <div className="inventory-card-status mt-1">
                  {equipped && (
                    <span className="inventory-equipped-badge inline-block text-[0.65rem] font-bold uppercase tracking-wide">
                      {t('inventory:catalog.equippedBadge')}
                    </span>
                  )}
                </div>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
