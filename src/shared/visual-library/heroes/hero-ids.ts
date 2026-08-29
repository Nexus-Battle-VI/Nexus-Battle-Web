/**
 * Los ocho identificadores de heroe oficiales e iniciales de Nexus Battles VI
 * (EN-026.1, `docs/visual-library/inventario-heroes-productos.md`). Fuente
 * unica para cualquier codigo de EN-026.3 que necesite enumerar o validar los
 * heroes; no se declara un noveno id en ningun otro lugar de esta feature.
 */
export const HERO_IDS = [
  'guerrero-tanque',
  'guerrero-armas',
  'mago-fuego',
  'mago-hielo',
  'picaro-veneno',
  'picaro-machete',
  'chaman',
  'medico',
] as const

export type HeroId = (typeof HERO_IDS)[number]
