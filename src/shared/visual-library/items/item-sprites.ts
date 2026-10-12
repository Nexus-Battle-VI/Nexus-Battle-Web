import manifest from './item-sprites.json'

/**
 * Sprites animados de productos, habilidades y epicas (EN-031).
 *
 * Cada entrada es una tira horizontal de fotogramas de 64x64 en
 * `public/assets/items/` (la genera `scripts/process-item-assets.mjs`). La CLAVE
 * es el nombre del producto en forma de slug: Catalog construye el `sku` como
 * `<slug(nombre)>-<8 hex>`, asi que el prefijo del `sku` y el slug del nombre
 * coinciden. Las habilidades en combate solo traen el nombre, y con eso basta.
 *
 * Un producto sin entrada no tiene arte animado: quien lo pinta cae a su
 * `imageUrl` de siempre (un producto nuevo de la Consola sigue funcionando).
 */
export interface ItemSpriteSpec {
  readonly image: string
  readonly frames: number
}

/** Lado de cada fotograma, en pixeles. */
export const ITEM_SPRITE_CELL = 64

const SPRITES: Readonly<Record<string, ItemSpriteSpec | undefined>> = manifest

/** «Báculo de Permafrost» -> `baculo-de-permafrost`, igual que el `sku` de Catalog. */
export const itemSlug = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')

/** El sufijo que Catalog anade al `sku`: un guion y 8 hexadecimales. */
const SKU_SUFFIX = /-[0-9a-f]{8}$/u

/** `mago-fuego-a511dda7` -> `mago-fuego`: el `sku` sin el sufijo de Catalog. */
export const skuSlug = (sku: string): string => itemSlug(sku).replace(SKU_SUFFIX, '')

export const itemSpriteFor = ({
  name,
  sku,
}: {
  readonly name?: string | null | undefined
  readonly sku?: string | null | undefined
}): ItemSpriteSpec | null => {
  const bySku = sku === null || sku === undefined ? undefined : SPRITES[skuSlug(sku)]

  if (bySku !== undefined) return bySku

  return name === null || name === undefined ? null : (SPRITES[itemSlug(name)] ?? null)
}

/** Todas las claves con arte (vista previa y prueba de completitud). */
export const ITEM_SPRITE_SLUGS: readonly string[] = Object.keys(SPRITES)
