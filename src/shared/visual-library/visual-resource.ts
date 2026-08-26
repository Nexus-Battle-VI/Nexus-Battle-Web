/**
 * Contratos de la biblioteca visual (EN-026.2).
 *
 * Estos tipos describen exclusivamente metadatos de resolucion visual, nunca
 * reglas de juego. `docs/visual-library/arquitectura-biblioteca-visual.md`
 * explica la relacion de `id`/`heroId` con `docs/visual-library/inventario-heroes-productos.md`
 * y el mapeo de categorias.
 */

/** Identificador estable definido por `EN-026.1`, p.ej. `guerrero-tanque` o `guerrero-tanque--arma--espada-de-una-mano`. */
export type VisualResourceId = string

/**
 * Categoria visual. Corresponde 1 a 1 con las categorias del inventario de
 * `EN-026.1` (`accion`, `arma`, `armadura`, `item`, `epica`), mas `hero` para
 * el propio heroe. Ver la tabla de mapeo en la documentacion de arquitectura.
 */
export type VisualCategory = 'hero' | 'action' | 'weapon' | 'armor' | 'item' | 'epic'

/**
 * Estado del recurso visual. Deliberadamente son solo dos valores: un
 * reemplazo de recurso no necesita un tercer estado ("reemplazado"), porque
 * el descriptor vigente de un `id` siempre refleja el recurso actual y el
 * historial de reemplazos ya lo conserva Git. Ver la justificacion completa
 * en la documentacion de arquitectura.
 */
export type VisualResourceStatus = 'NOT_PRODUCED' | 'READY'

/** Referencia opaca al recurso fisico. Ausente mientras el estado es `NOT_PRODUCED`. */
export interface VisualResourceReference {
  readonly kind: 'model3d' | 'image'
  readonly url: string
}

/** Metadatos comunes a cualquier estado de un recurso visual. */
interface VisualResourceDescriptorBase {
  readonly id: VisualResourceId
  readonly category: VisualCategory
  /** Heroe asociado. Para `category: 'hero'` es igual a `id`. */
  readonly heroId: VisualResourceId
  /**
   * Referencia opcional a una fila de `docs/assets/inventario-activos.md`
   * cuando el recurso incorpore un asset externo licenciado (EN-021). No
   * duplica ese modelo de datos, solo lo enlaza.
   */
  readonly assetInventoryId?: string
}

/** Recurso todavia no producido: no puede tener `resource`. */
export interface NotProducedVisualResourceDescriptor extends VisualResourceDescriptorBase {
  readonly status: 'NOT_PRODUCED'
  /** Nunca presente: un recurso `NOT_PRODUCED` no tiene referencia fisica. */
  readonly resource?: never
}

/** Recurso vigente: `resource` es obligatorio. */
export interface ReadyVisualResourceDescriptor extends VisualResourceDescriptorBase {
  readonly status: 'READY'
  readonly resource: VisualResourceReference
}

/**
 * Metadatos minimos para resolver y gestionar un recurso visual. No contiene
 * ninguna regla funcional (dano, vida, rareza, precio, cooldown): esas
 * pertenecen al dominio funcional, no a la biblioteca visual.
 *
 * Union discriminada por `status`: TypeScript impide construir un
 * `NOT_PRODUCED` con `resource`, y exige `resource` en todo `READY`.
 */
export type VisualResourceDescriptor =
  NotProducedVisualResourceDescriptor | ReadyVisualResourceDescriptor
