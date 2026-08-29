import type { VisualResourceDescriptor, VisualResourceId } from './visual-resource'

/**
 * Registro de recursos visuales vigentes.
 *
 * Es intencionalmente una lista plana en memoria, no una base de datos ni un
 * store de estado: EN-026.2 no produce todavia ningun recurso, asi que el
 * registro de aplicacion (`visualResourceRegistry`) arranca vacio. EN-026.3 y
 * EN-026.4 lo poblaran con `register()` a medida que produzcan recursos
 * reales. `resolveVisualResource` (ver `./resolve-visual-resource.ts`) ya
 * resuelve de forma segura un `id` ausente del registro.
 */
export interface VisualResourceRegistry {
  readonly register: (descriptor: VisualResourceDescriptor) => void
  readonly get: (id: VisualResourceId) => VisualResourceDescriptor | undefined
}

/**
 * Crea una instancia de registro aislada. Se usa para pruebas y para el
 * registro unico de la aplicacion (`visualResourceRegistry`), para no
 * compartir estado mutable entre pruebas.
 */
export const createVisualResourceRegistry = (): VisualResourceRegistry => {
  const entries = new Map<VisualResourceId, VisualResourceDescriptor>()

  return {
    register: (descriptor) => {
      entries.set(descriptor.id, descriptor)
    },
    get: (id) => entries.get(id),
  }
}

/** Registro unico consumido por la aplicacion. */
export const visualResourceRegistry: VisualResourceRegistry = createVisualResourceRegistry()
