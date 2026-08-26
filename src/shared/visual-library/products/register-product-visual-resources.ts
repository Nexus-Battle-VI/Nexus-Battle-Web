import { PRODUCT_CATALOG } from './product-catalog'
import type { VisualResourceRegistry } from '../registry'
import type { ReadyVisualResourceDescriptor } from '../visual-resource'

/**
 * Registra los 72 productos oficiales (`PRODUCT_CATALOG`) como `READY` con un
 * recurso 2D procedural (ver `visual-resource.ts`, `VisualResourceReference`,
 * `source: 'procedural'`, ya extendido por EN-026.3). No registra heroes: eso
 * es responsabilidad de `registerHeroVisualResources` (EN-026.3).
 *
 * Es idempotente y no depende de ningun renderer: solo construye datos.
 */
export const registerProductVisualResources = (registry: VisualResourceRegistry): void => {
  for (const entry of PRODUCT_CATALOG) {
    const descriptor: ReadyVisualResourceDescriptor = {
      id: entry.id,
      category: entry.category,
      heroId: entry.heroId,
      status: 'READY',
      resource: { kind: 'image', source: 'procedural' },
    }
    registry.register(descriptor)
  }
}
