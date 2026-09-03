import { HERO_IDS, type HeroId } from '@/shared/visual-library/heroes'

/**
 * Correspondencia entre el identificador visual de héroe (`HERO_IDS`, kebab —
 * EN-026) y el código de subtipo canónico que Catalog publica en
 * `attributes.values.heroSubtype` (SCREAMING_SNAKE — `hero-subtypes-v1`).
 *
 * Es una transliteración directa `kebab <-> SNAKE` sobre el mismo conjunto de
 * ocho; no se inventa ningún noveno héroe ni se altera el registro.
 */
export const subtypeFromHeroId = (heroId: string): string =>
  heroId.replace(/-/gu, '_').toUpperCase()

export const heroIdFromSubtype = (subtype: string): HeroId | null => {
  const candidate = subtype.trim().toLowerCase().replace(/_/gu, '-')
  return (HERO_IDS as readonly string[]).includes(candidate) ? (candidate as HeroId) : null
}

/**
 * Devuelve el `HeroId` visual cuando una referencia de inventario (kebab, el
 * alias `sku` de Catalog) coincide con uno de los ocho héroes. `null` cuando no
 * hay correspondencia demostrada: no se adivina un modelo.
 */
export const heroIdFromReference = (reference: string): HeroId | null => {
  const candidate = reference.trim().toLowerCase()
  return (HERO_IDS as readonly string[]).includes(candidate) ? (candidate as HeroId) : null
}
