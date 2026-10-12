import clsx from 'clsx'

import { HeroSprite, type HeroId } from './heroes'
import { heroIdFromReference, heroIdFromSubtype } from './heroes/hero-subtype'
import { ItemSprite } from './items/ItemSprite'
import { itemSlug, itemSpriteFor, skuSlug } from './items/item-sprites'

/** Lo minimo de un producto de Catalog para elegir su arte. */
export interface ProductVisualSubject {
  readonly name: string
  readonly type?: string | null | undefined
  readonly sku?: string | null | undefined
  /** Atributos de Catalog tal como llegan; solo se lee `values.heroSubtype`. */
  readonly attributes?: unknown
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * El heroe de un producto: por `heroSubtype`, por el `sku` sin su sufijo de Catalog
 * (`mago-fuego-a511dda7`) o por el nombre (`Mago Fuego`). Con tipo conocido solo
 * un HEROE es heroe; sin tipo (carrito, subasta) basta con que coincida.
 */
const heroIdOf = (product: ProductVisualSubject): HeroId | null => {
  if (product.type !== null && product.type !== undefined && product.type !== 'HEROE') return null
  const values =
    isRecord(product.attributes) && isRecord(product.attributes.values)
      ? product.attributes.values
      : undefined
  const subtype = values?.heroSubtype
  const bySubtype = typeof subtype === 'string' ? heroIdFromSubtype(subtype) : null
  const bySku =
    product.sku === null || product.sku === undefined
      ? null
      : heroIdFromReference(skuSlug(product.sku))

  return bySubtype ?? bySku ?? heroIdFromReference(itemSlug(product.name))
}

export interface ProductVisualProps {
  readonly product: ProductVisualSubject
  /** Lo que se pinta si el producto no tiene arte propio (normalmente su `imageUrl`). */
  readonly fallback: React.ReactNode
  /** Clases del contenedor (fija el tamano). */
  readonly className?: string
  /** `false` en listas largas: solo el primer fotograma. */
  readonly animated?: boolean
}

/**
 * Arte de un producto en TODAS las pantallas (EN-031): el heroe es su sprite
 * animado (ya no Three.js); armas, armaduras, items, habilidades y epicas usan su
 * sprite animado de PixelLab si existe (`item-sprites.json`, por slug del nombre o
 * prefijo del `sku`); cualquier otro producto (uno nuevo de la Consola) cae a
 * `fallback`, que es la imagen de siempre.
 */
export const ProductVisual = ({
  product,
  fallback,
  className,
  animated = true,
}: ProductVisualProps): React.JSX.Element => {
  const heroId = heroIdOf(product)

  if (heroId !== null) {
    return (
      <span className={clsx('product-visual inline-flex items-center justify-center', className)}>
        <HeroSprite heroId={heroId} direction="south-east" />
      </span>
    )
  }

  const spec = itemSpriteFor({ name: product.name, sku: product.sku })

  if (spec !== null) {
    return (
      <span className={clsx('product-visual inline-flex items-center justify-center', className)}>
        <ItemSprite spec={spec} label={product.name} animated={animated} />
      </span>
    )
  }

  return <>{fallback}</>
}
