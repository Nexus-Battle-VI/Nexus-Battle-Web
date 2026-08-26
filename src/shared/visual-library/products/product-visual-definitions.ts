import { HERO_VISUAL_SPECS_BY_ID } from '../heroes'
import type { HeroId } from '../heroes'
import { PRODUCT_CATALOG } from './product-catalog'
import type { ProductCatalogEntry, ProductCategory } from './product-catalog'

/**
 * Colores de respaldo, solo para el caso teorico de un `heroId` sin
 * `HeroVisualSpec` (no ocurre para los 72 productos oficiales, cuyo `heroId`
 * siempre es uno de los ocho de EN-026.3; se conserva por seguridad de tipos,
 * no como dato de diseño real).
 */
const FALLBACK_PRIMARY_COLOR = '#6b7280'
const FALLBACK_ACCENT_COLOR = '#9ca3af'

/**
 * Datos exclusivamente visuales para representar un producto en 2D.
 * `seed` es un numero deterministico derivado del `id` (ver `hashId`), usado
 * unicamente para introducir una variacion geometrica decorativa estable
 * entre productos de la misma familia (p.ej. un angulo de rotacion distinto);
 * no tiene ningun significado funcional (no es rareza, poder ni probabilidad)
 * y dos ejecuciones distintas para el mismo `id` producen siempre el mismo
 * valor.
 */
export interface ProductVisualSpec {
  readonly id: string
  readonly displayName: string
  readonly category: ProductCategory
  readonly heroId: HeroId
  readonly primaryColor: string
  readonly accentColor: string
  readonly seed: number
}

/** Hash simple y deterministico de un string a un entero no negativo. Solo para variacion decorativa (ver `ProductVisualSpec.seed`). */
const hashId = (id: string): number => {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0
  }
  return hash
}

/**
 * Deriva un `ProductVisualSpec` de una fila del catalogo oficial. Reutiliza
 * el color de identidad del heroe asociado (`bodyColor`/`accentColor` de
 * `HeroVisualSpec`, EN-026.3) para mantener coherencia cromatica entre el
 * heroe 3D y sus productos 2D, sin importar Three.js: `hero-definitions.ts`
 * es un modulo de datos puro.
 */
export const buildProductVisualSpec = (entry: ProductCatalogEntry): ProductVisualSpec => {
  const heroSpec = HERO_VISUAL_SPECS_BY_ID.get(entry.heroId)
  return {
    id: entry.id,
    displayName: entry.name,
    category: entry.category,
    heroId: entry.heroId,
    primaryColor: heroSpec?.bodyColor ?? FALLBACK_PRIMARY_COLOR,
    accentColor: heroSpec?.accentColor ?? FALLBACK_ACCENT_COLOR,
    seed: hashId(entry.id),
  }
}

/** Las especificaciones visuales de los 72 productos, en el mismo orden que `PRODUCT_CATALOG`. */
export const PRODUCT_VISUAL_SPECS: readonly ProductVisualSpec[] =
  PRODUCT_CATALOG.map(buildProductVisualSpec)

/** Busqueda segura por un id arbitrario (no necesariamente uno de los 72). */
export const PRODUCT_VISUAL_SPECS_BY_ID: ReadonlyMap<string, ProductVisualSpec> = new Map(
  PRODUCT_VISUAL_SPECS.map((spec) => [spec.id, spec]),
)
