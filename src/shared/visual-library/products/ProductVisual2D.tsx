import { useMemo } from 'react'
import clsx from 'clsx'

import { registerProductVisualResources } from './register-product-visual-resources'
import { PRODUCT_VISUAL_SPECS_BY_ID } from './product-visual-definitions'
import { renderProductGlyph } from './render-product-visual'
import type { ProductCategory } from './product-catalog'
import { visualResourceRegistry } from '../registry'
import { resolveVisualResource } from '../resolve-visual-resource'
import type { VisualResourceId } from '../visual-resource'

// Efecto de modulo: registra los 72 productos como READY la primera vez que
// algo importa `ProductVisual2D` (directamente o via `./index`), igual que
// `Hero3D.tsx` hace para los heroes. No depende de ningun renderer 3D.
registerProductVisualResources(visualResourceRegistry)

export interface ProductVisual2DProps {
  /** Identificador estable de EN-026.1, p.ej. `guerrero-tanque--arma--espada-de-una-mano`. */
  readonly resourceId: VisualResourceId
  readonly category: ProductCategory
  readonly className?: string
}

/**
 * Representacion 2D reutilizable de un producto (arma, armadura, item,
 * accion o habilidad epica). Unica implementacion para los 72 productos: no
 * existe un componente por producto ni por familia (ver
 * `render-product-visual.tsx`).
 *
 * Resuelve `resourceId` mediante la biblioteca visual de EN-026.2
 * (`resolveVisualResource`), nunca construye una ruta de asset a mano. No
 * importa Three.js ni depende de `Hero3D`/`mount-hero-view`: el renderer 2D
 * es SVG puro. Si el recurso no esta listo o el id es desconocido, muestra un
 * placeholder accesible sin lanzar.
 */
export const ProductVisual2D = ({
  resourceId,
  category,
  className,
}: ProductVisual2DProps): React.JSX.Element => {
  const resolution = useMemo(
    () => resolveVisualResource(visualResourceRegistry, resourceId, category),
    [resourceId, category],
  )
  const spec = PRODUCT_VISUAL_SPECS_BY_ID.get(resourceId)
  const displayName = spec?.displayName ?? resourceId
  const ready = resolution.descriptor.status === 'READY' && spec !== undefined

  return (
    <div className={clsx('flex flex-col items-center gap-1', className)}>
      <div
        className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-surface p-2"
        role="img"
        aria-label={displayName}
      >
        {ready ? (
          <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
            <circle cx="32" cy="32" r="30" fill={spec.primaryColor} opacity="0.16" />
            {renderProductGlyph(spec)}
          </svg>
        ) : (
          <p className="text-center text-xs text-muted">
            {resolution.isFallback
              ? `Vista previa no disponible para "${resourceId}".`
              : 'Vista previa no disponible.'}
          </p>
        )}
      </div>
      <p className="text-center text-xs font-medium text-ink">{displayName}</p>
    </div>
  )
}
