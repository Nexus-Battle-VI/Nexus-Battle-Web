/**
 * Punto unico de consumo publico de los heroes 3D (EN-026.3).
 *
 * Deliberadamente NO reexporta `create-hero-model.ts`, `create-hero-scene.ts`
 * ni `mount-hero-view.ts`: esos modulos importan `three` de forma estatica, y
 * solo deben alcanzarse mediante el `import()` dinamico interno de
 * `Hero3D.tsx`. Reexportarlos aqui incluiria Three.js en el grafo estatico de
 * cualquiera que importe este barril, incluso sin montar ningun heroe.
 */
export { HERO_IDS } from './hero-ids'
export type { HeroId } from './hero-ids'

export { HERO_VISUAL_SPECS, HERO_VISUAL_SPECS_BY_ID } from './hero-definitions'
export type { HeroAccent, HeroSilhouette, HeroVisualSpec } from './hero-definitions'

export { Hero3D } from './Hero3D'
export type { Hero3DProps } from './Hero3D'
