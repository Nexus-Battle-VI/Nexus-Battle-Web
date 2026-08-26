/**
 * Punto unico y controlado de la biblioteca visual.
 *
 * Las features consumen la biblioteca visual unicamente desde aqui, nunca
 * importando los modulos internos (`./registry`, `./resolve-visual-resource`,
 * `./visual-resource`) directamente. Mismo patron que
 * `src/components/ui/icons.ts` para `lucide-react`.
 */
export type {
  VisualCategory,
  VisualResourceDescriptor,
  VisualResourceId,
  VisualResourceReference,
  VisualResourceStatus,
} from './visual-resource'

export type { VisualResourceRegistry } from './registry'
export { createVisualResourceRegistry, visualResourceRegistry } from './registry'

export type { VisualResourceResolution } from './resolve-visual-resource'
export { resolveVisualResource } from './resolve-visual-resource'
