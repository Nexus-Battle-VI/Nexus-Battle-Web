/**
 * Punto unico de consumo publico de los heroes.
 *
 * EN-031: los heroes son sprites animados de PixelLab (`HeroSprite`). La version
 * procedural en Three.js (`Hero3D`) se retiro junto con la dependencia `three`.
 */
export { HERO_IDS } from './hero-ids'
export type { HeroId } from './hero-ids'

export { HERO_VISUAL_SPECS, HERO_VISUAL_SPECS_BY_ID } from './hero-definitions'
export type { HeroAccent, HeroSilhouette, HeroVisualSpec } from './hero-definitions'

export { HeroSprite } from './HeroSprite'
export type { HeroSpriteProps } from './HeroSprite'
export type { SpriteDirection } from './hero-sprite'

export { heroIdOfProduct } from './hero-product-visual'
