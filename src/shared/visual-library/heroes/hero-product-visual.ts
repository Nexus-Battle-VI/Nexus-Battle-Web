import { heroIdFromReference, heroIdFromSubtype } from './hero-subtype'
import type { HeroId } from './hero-ids'

/**
 * Resuelve el `HeroId` visual (EN-026) de un producto canonico de tipo HEROE.
 *
 * Un HEROE nunca tiene asset de imagen fisico (`imageUrl` es un relleno del
 * esquema): su render es 100% procedural por Three.js, resuelto por
 * `heroSubtype` o, en su defecto, por el `sku` (que Catalog fija igual al
 * `HeroId` para los ocho heroes oficiales). Devuelve `null` para cualquier
 * producto que no sea HEROE o cuyo id no coincida con ninguno de los ocho.
 */
export const heroIdOfProduct = (
  type: string,
  sku: string,
  values?: Readonly<Record<string, unknown>>,
): HeroId | null => {
  if (type !== 'HEROE') return null
  const subtype = values?.heroSubtype
  const bySubtype = typeof subtype === 'string' ? heroIdFromSubtype(subtype) : null
  return bySubtype ?? heroIdFromReference(sku)
}
