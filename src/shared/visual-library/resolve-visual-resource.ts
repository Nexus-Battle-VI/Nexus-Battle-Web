import type { VisualResourceRegistry } from './registry'
import type { VisualCategory, VisualResourceDescriptor, VisualResourceId } from './visual-resource'

export interface VisualResourceResolution {
  readonly descriptor: VisualResourceDescriptor
  /** `true` cuando el descriptor no proviene del registro sino del fallback seguro. */
  readonly isFallback: boolean
}

/**
 * Un `id` de recurso asociado a un heroe tiene la forma
 * `{heroSlug}--{categoria}--{nombre-slug}` (ver EN-026.1). El propio heroe no
 * lleva separador. Esta extraccion es deliberadamente simple: no valida el
 * `id` completo, solo aisla el heroe para el descriptor de fallback.
 */
const extractHeroId = (id: VisualResourceId): VisualResourceId => id.split('--')[0] ?? id

const buildFallbackDescriptor = (
  id: VisualResourceId,
  category: VisualCategory,
): VisualResourceDescriptor => ({
  id,
  category,
  heroId: extractHeroId(id),
  status: 'NOT_PRODUCED',
})

/**
 * Resuelve un `id` estable a su descriptor visual vigente.
 *
 * Es una funcion pura: mismo `registry`/`id`/`category` produce siempre el
 * mismo resultado, sin leer estado global ni conocer ninguna interfaz
 * concreta. Nunca lanza: un `id` no registrado (porque el recurso aun no fue
 * producido, porque la referencia es desconocida, o porque existe con otra
 * `category`) siempre resuelve a un descriptor `NOT_PRODUCED` seguro con
 * `isFallback: true`, para que la UI que lo consuma pueda seguir siendo
 * estable sin necesitar su propio manejo de errores.
 *
 * Un `id` registrado solo se devuelve como resultado real cuando su
 * `category` coincide con la solicitada: dos categorias distintas no
 * comparten espacio de `id`, y un `id` existente bajo otra categoria no debe
 * devolverse silenciosamente como si fuera el recurso pedido.
 */
export const resolveVisualResource = (
  registry: VisualResourceRegistry,
  id: VisualResourceId,
  category: VisualCategory,
): VisualResourceResolution => {
  const registered = registry.get(id)

  if (registered?.category === category) {
    return { descriptor: registered, isFallback: false }
  }

  return { descriptor: buildFallbackDescriptor(id, category), isFallback: true }
}
