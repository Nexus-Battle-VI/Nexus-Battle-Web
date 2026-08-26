import { HERO_IDS } from './hero-ids'
import type { VisualResourceRegistry } from '../registry'
import type { ReadyVisualResourceDescriptor } from '../visual-resource'

/**
 * Registra los ocho heroes como `READY` con un recurso procedural (ver
 * `visual-resource.ts`, `VisualResourceReference`). No registra armas,
 * armaduras, items, acciones ni epicas: esos productos corresponden
 * principalmente a `EN-026.4`.
 *
 * Es idempotente (llamarla varias veces sobre el mismo `registry` sobrescribe
 * cada `id` con el mismo descriptor) y no depende de Three.js: solo
 * construye datos, nunca geometria.
 */
export const registerHeroVisualResources = (registry: VisualResourceRegistry): void => {
  for (const id of HERO_IDS) {
    const descriptor: ReadyVisualResourceDescriptor = {
      id,
      category: 'hero',
      heroId: id,
      status: 'READY',
      resource: { kind: 'model3d', source: 'procedural' },
    }
    registry.register(descriptor)
  }
}
