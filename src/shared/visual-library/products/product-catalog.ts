import type { HeroId } from '../heroes'

/**
 * Categoria visual de un producto. Es exactamente `VisualCategory` (EN-026.2)
 * sin `'hero'`: esta Task no produce heroes, solo equipamiento/acciones.
 */
export type ProductCategory = 'weapon' | 'armor' | 'item' | 'action' | 'epic'

/** Slots de armadura de la linea base (`docs/visual-library/inventario-heroes-productos.md`). */
export type ArmorSlot = 'Casco' | 'Pecho' | 'Guantes' | 'Brazaletes' | 'Pantalón' | 'Zapatos'

interface ProductCatalogEntryBase {
  /** Identificador estable de EN-026.1: `{heroe-slug}--{categoria}--{nombre-slug}`. */
  readonly id: string
  /** Nombre oficial, transcrito sin alterar desde el inventario (incluye posibles erratas de origen). */
  readonly name: string
  readonly category: ProductCategory
  readonly heroId: HeroId
}

/** Las armaduras son la unica categoria con un slot declarado en la linea base. */
export interface ArmorCatalogEntry extends ProductCatalogEntryBase {
  readonly category: 'armor'
  readonly slot: ArmorSlot
}

export interface NonArmorCatalogEntry extends ProductCatalogEntryBase {
  readonly category: Exclude<ProductCategory, 'armor'>
}

export type ProductCatalogEntry = ArmorCatalogEntry | NonArmorCatalogEntry

/**
 * Catalogo de los 72 productos oficiales aprobados por `EN-026.1`
 * (`docs/visual-library/inventario-heroes-productos.md`), transcrito una sola
 * vez desde esa fuente de verdad sellada. Ningun `id`, `name` ni `heroId` fue
 * inventado ni normalizado: se conservan exactamente como figuran en el
 * inventario, incluidas denominaciones que podrian parecer erratas
 * (`Machete vendito`, `Cierra sangrienta`, `Frio concentrado`, `Té changua`).
 *
 * Esta es la unica lista manual de los 72 productos en el repositorio:
 * `product-visual-definitions.ts`, `register-product-visual-resources.ts` y
 * todos los tests de esta feature se derivan de este arreglo en vez de
 * mantener una segunda lista divergente.
 */
export const PRODUCT_CATALOG: readonly ProductCatalogEntry[] = [
  // Acciones especiales (24) — 3 por heroe.
  {
    id: 'guerrero-tanque--accion--golpe-con-escudo',
    name: 'Golpe con escudo',
    category: 'action',
    heroId: 'guerrero-tanque',
  },
  {
    id: 'guerrero-tanque--accion--mano-de-piedra',
    name: 'Mano de piedra',
    category: 'action',
    heroId: 'guerrero-tanque',
  },
  {
    id: 'guerrero-tanque--accion--defensa-feroz',
    name: 'Defensa feroz',
    category: 'action',
    heroId: 'guerrero-tanque',
  },
  {
    id: 'guerrero-armas--accion--embate-sangriento',
    name: 'Embate sangriento',
    category: 'action',
    heroId: 'guerrero-armas',
  },
  {
    id: 'guerrero-armas--accion--lanza-de-los-dioses',
    name: 'Lanza de los dioses',
    category: 'action',
    heroId: 'guerrero-armas',
  },
  {
    id: 'guerrero-armas--accion--golpe-de-tormenta',
    name: 'Golpe de tormenta',
    category: 'action',
    heroId: 'guerrero-armas',
  },
  {
    id: 'mago-fuego--accion--misiles-de-magma',
    name: 'Misiles de magma',
    category: 'action',
    heroId: 'mago-fuego',
  },
  { id: 'mago-fuego--accion--vulcano', name: 'Vulcano', category: 'action', heroId: 'mago-fuego' },
  {
    id: 'mago-fuego--accion--pare-de-fuego',
    name: 'Pare de fuego',
    category: 'action',
    heroId: 'mago-fuego',
  },
  {
    id: 'mago-hielo--accion--lluvia-de-hielo',
    name: 'Lluvia de hielo',
    category: 'action',
    heroId: 'mago-hielo',
  },
  {
    id: 'mago-hielo--accion--cono-de-hielo',
    name: 'Cono de hielo',
    category: 'action',
    heroId: 'mago-hielo',
  },
  {
    id: 'mago-hielo--accion--bola-de-hielo',
    name: 'Bola de hielo',
    category: 'action',
    heroId: 'mago-hielo',
  },
  {
    id: 'picaro-veneno--accion--flor-de-loto',
    name: 'Flor de loto',
    category: 'action',
    heroId: 'picaro-veneno',
  },
  {
    id: 'picaro-veneno--accion--agonia',
    name: 'Agonía',
    category: 'action',
    heroId: 'picaro-veneno',
  },
  {
    id: 'picaro-veneno--accion--piquete',
    name: 'Piquete',
    category: 'action',
    heroId: 'picaro-veneno',
  },
  {
    id: 'picaro-machete--accion--cortada',
    name: 'Cortada',
    category: 'action',
    heroId: 'picaro-machete',
  },
  {
    id: 'picaro-machete--accion--machetazo',
    name: 'Machetazo',
    category: 'action',
    heroId: 'picaro-machete',
  },
  {
    id: 'picaro-machete--accion--planazo',
    name: 'Planazo',
    category: 'action',
    heroId: 'picaro-machete',
  },
  {
    id: 'chaman--accion--toque-de-la-vida',
    name: 'Toque de la Vida',
    category: 'action',
    heroId: 'chaman',
  },
  {
    id: 'chaman--accion--vinculo-natural',
    name: 'Vínculo Natural',
    category: 'action',
    heroId: 'chaman',
  },
  {
    id: 'chaman--accion--canto-del-bosque',
    name: 'Canto del Bosque',
    category: 'action',
    heroId: 'chaman',
  },
  {
    id: 'medico--accion--curacion-directa',
    name: 'Curación Directa',
    category: 'action',
    heroId: 'medico',
  },
  {
    id: 'medico--accion--neutralizacion-de-efectos',
    name: 'Neutralización de Efectos',
    category: 'action',
    heroId: 'medico',
  },
  {
    id: 'medico--accion--reanimacion',
    name: 'Reanimación',
    category: 'action',
    heroId: 'medico',
  },

  // Armas (16) — 2 por heroe.
  {
    id: 'guerrero-tanque--arma--espada-de-una-mano',
    name: 'Espada de una mano',
    category: 'weapon',
    heroId: 'guerrero-tanque',
  },
  {
    id: 'guerrero-tanque--arma--escudo-de-dragon',
    name: 'Escudo de dragón',
    category: 'weapon',
    heroId: 'guerrero-tanque',
  },
  {
    id: 'guerrero-armas--arma--espada-de-dos-manos',
    name: 'Espada de dos manos',
    category: 'weapon',
    heroId: 'guerrero-armas',
  },
  {
    id: 'guerrero-armas--arma--piedra-de-afilar',
    name: 'Piedra de afilar',
    category: 'weapon',
    heroId: 'guerrero-armas',
  },
  {
    id: 'mago-fuego--arma--orbe-de-manos-ardientes',
    name: 'Orbe de manos ardientes',
    category: 'weapon',
    heroId: 'mago-fuego',
  },
  {
    id: 'mago-fuego--arma--fuego-fatuo',
    name: 'Fuego fatuo',
    category: 'weapon',
    heroId: 'mago-fuego',
  },
  {
    id: 'mago-hielo--arma--baculo-de-permafrost',
    name: 'Báculo de Permafrost',
    category: 'weapon',
    heroId: 'mago-hielo',
  },
  {
    id: 'mago-hielo--arma--venas-heladas',
    name: 'Venas heladas',
    category: 'weapon',
    heroId: 'mago-hielo',
  },
  {
    id: 'picaro-veneno--arma--daga-purulenta',
    name: 'Daga purulenta',
    category: 'weapon',
    heroId: 'picaro-veneno',
  },
  {
    id: 'picaro-veneno--arma--vision-borrosa',
    name: 'Visión borrosa',
    category: 'weapon',
    heroId: 'picaro-veneno',
  },
  {
    id: 'picaro-machete--arma--machete-vendito',
    name: 'Machete vendito',
    category: 'weapon',
    heroId: 'picaro-machete',
  },
  {
    id: 'picaro-machete--arma--cierra-sangrienta',
    name: 'Cierra sangrienta',
    category: 'weapon',
    heroId: 'picaro-machete',
  },
  { id: 'chaman--arma--raiz-china', name: 'Raíz china', category: 'weapon', heroId: 'chaman' },
  { id: 'chaman--arma--yerbabuena', name: 'Yerbabuena', category: 'weapon', heroId: 'chaman' },
  {
    id: 'medico--arma--kit-de-urgencias',
    name: 'Kit de urgencias',
    category: 'weapon',
    heroId: 'medico',
  },
  { id: 'medico--arma--reanimador', name: 'Reanimador', category: 'weapon', heroId: 'medico' },

  // Armaduras (16) — 2 por heroe.
  {
    id: 'guerrero-tanque--armadura--defensa-del-enfurecido',
    name: 'Defensa del enfurecido',
    category: 'armor',
    heroId: 'guerrero-tanque',
    slot: 'Pecho',
  },
  {
    id: 'guerrero-tanque--armadura--magma-ardiente',
    name: 'Magma Ardiente',
    category: 'armor',
    heroId: 'guerrero-tanque',
    slot: 'Casco',
  },
  {
    id: 'guerrero-armas--armadura--puno-lucido',
    name: 'Puño lúcido',
    category: 'armor',
    heroId: 'guerrero-armas',
    slot: 'Guantes',
  },
  {
    id: 'guerrero-armas--armadura--punos-en-llamas',
    name: 'Puños en llamas',
    category: 'armor',
    heroId: 'guerrero-armas',
    slot: 'Brazaletes',
  },
  {
    id: 'mago-fuego--armadura--tunica-arcana',
    name: 'Túnica arcana',
    category: 'armor',
    heroId: 'mago-fuego',
    slot: 'Pecho',
  },
  {
    id: 'mago-fuego--armadura--caida-de-fuego',
    name: 'Caída de fuego',
    category: 'armor',
    heroId: 'mago-fuego',
    slot: 'Pantalón',
  },
  {
    id: 'mago-hielo--armadura--corona-de-hielo',
    name: 'Corona de hielo',
    category: 'armor',
    heroId: 'mago-hielo',
    slot: 'Casco',
  },
  {
    id: 'mago-hielo--armadura--ventisca',
    name: 'Ventisca',
    category: 'armor',
    heroId: 'mago-hielo',
    slot: 'Pecho',
  },
  {
    id: 'picaro-veneno--armadura--mano-del-desterrado',
    name: 'Mano del desterrado',
    category: 'armor',
    heroId: 'picaro-veneno',
    slot: 'Guantes',
  },
  {
    id: 'picaro-veneno--armadura--atadura-carmesi',
    name: 'Atadura carmesí',
    category: 'armor',
    heroId: 'picaro-veneno',
    slot: 'Pecho',
  },
  {
    id: 'picaro-machete--armadura--pie-de-atleta',
    name: 'Pie de atleta',
    category: 'armor',
    heroId: 'picaro-machete',
    slot: 'Zapatos',
  },
  {
    id: 'picaro-machete--armadura--sangre-cruel',
    name: 'Sangre cruel',
    category: 'armor',
    heroId: 'picaro-machete',
    slot: 'Brazaletes',
  },
  {
    id: 'chaman--armadura--piel-de-caminante-del-bosque',
    name: 'Piel de Caminante del Bosque',
    category: 'armor',
    heroId: 'chaman',
    slot: 'Pecho',
  },
  {
    id: 'chaman--armadura--casco-de-ecos-ancestrales',
    name: 'Casco de Ecos Ancestrales',
    category: 'armor',
    heroId: 'chaman',
    slot: 'Casco',
  },
  {
    id: 'medico--armadura--bata-de-cirujano',
    name: 'Bata de Cirujano',
    category: 'armor',
    heroId: 'medico',
    slot: 'Pecho',
  },
  {
    id: 'medico--armadura--pantalon-de-expedicion-medica',
    name: 'Pantalón de Expedición Médica',
    category: 'armor',
    heroId: 'medico',
    slot: 'Pantalón',
  },

  // Items (8) — 1 por heroe.
  {
    id: 'guerrero-tanque--item--pinchos-de-escudo',
    name: 'Pinchos de escudo',
    category: 'item',
    heroId: 'guerrero-tanque',
  },
  {
    id: 'guerrero-armas--item--empunadura-de-furia',
    name: 'Empuñadura de Furia',
    category: 'item',
    heroId: 'guerrero-armas',
  },
  {
    id: 'mago-fuego--item--anillo-para-piro-explosion',
    name: 'Anillo para Piro-explosión',
    category: 'item',
    heroId: 'mago-fuego',
  },
  {
    id: 'mago-hielo--item--libro-de-la-ventisca-helada',
    name: 'Libro de la ventisca helada',
    category: 'item',
    heroId: 'mago-hielo',
  },
  {
    id: 'picaro-veneno--item--veneno-lacerante',
    name: 'Veneno lacerante',
    category: 'item',
    heroId: 'picaro-veneno',
  },
  {
    id: 'picaro-machete--item--mancuerna-yugular',
    name: 'Mancuerna yugular',
    category: 'item',
    heroId: 'picaro-machete',
  },
  {
    id: 'chaman--item--pluma-sanadora',
    name: 'Pluma sanadora',
    category: 'item',
    heroId: 'chaman',
  },
  { id: 'medico--item--benditas', name: 'Benditas', category: 'item', heroId: 'medico' },

  // Habilidades epicas (8) — 1 por heroe.
  {
    id: 'guerrero-tanque--epica--golpe-de-defensa',
    name: 'Golpe de defensa',
    category: 'epic',
    heroId: 'guerrero-tanque',
  },
  {
    id: 'guerrero-armas--epica--segundo-impulso',
    name: 'Segundo impulso',
    category: 'epic',
    heroId: 'guerrero-armas',
  },
  {
    id: 'mago-fuego--epica--luz-cegadora',
    name: 'Luz cegadora',
    category: 'epic',
    heroId: 'mago-fuego',
  },
  {
    id: 'mago-hielo--epica--frio-concentrado',
    name: 'Frio concentrado',
    category: 'epic',
    heroId: 'mago-hielo',
  },
  {
    id: 'picaro-veneno--epica--toma-y-lleva',
    name: 'Toma y lleva',
    category: 'epic',
    heroId: 'picaro-veneno',
  },
  {
    id: 'picaro-machete--epica--intimidacion-sangrienta',
    name: 'Intimidación sangrienta',
    category: 'epic',
    heroId: 'picaro-machete',
  },
  { id: 'chaman--epica--te-changua', name: 'Té changua', category: 'epic', heroId: 'chaman' },
  {
    id: 'medico--epica--reanimador-3000',
    name: 'Reanimador 3000',
    category: 'epic',
    heroId: 'medico',
  },
]

/** Busqueda segura por un id arbitrario (no necesariamente uno de los 72). */
export const PRODUCT_CATALOG_BY_ID: ReadonlyMap<string, ProductCatalogEntry> = new Map(
  PRODUCT_CATALOG.map((entry) => [entry.id, entry]),
)
