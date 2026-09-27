/**
 * Reexporta la correspondencia kebab <-> SNAKE de `HeroId`/`heroSubtype`
 * (movida a `shared/visual-library/heroes/hero-subtype.ts`: es una utilidad
 * pura sobre `HERO_IDS`, sin nada especifico de player-inventory, y la capa
 * compartida no puede importar de una feature). Se conserva este modulo para
 * no romper a quienes ya importan desde aqui.
 */
export {
  heroIdFromReference,
  heroIdFromSubtype,
  subtypeFromHeroId,
} from '@/shared/visual-library/heroes/hero-subtype'
