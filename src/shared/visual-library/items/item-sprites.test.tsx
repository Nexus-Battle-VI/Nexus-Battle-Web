import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { PRODUCT_CATALOG } from '../products'
import { ProductVisual } from '../ProductVisual'
import { ItemSprite } from './ItemSprite'
import { ITEM_SPRITE_SLUGS, itemSlug, itemSpriteFor, skuSlug } from './item-sprites'

describe('EN-031 — sprites animados de productos', () => {
  it('el slug sigue la regla del sku de Catalog: sin acentos, minusculas y guiones', () => {
    expect(itemSlug('Báculo de Permafrost')).toBe('baculo-de-permafrost')
    expect(itemSlug('Anillo para Piro-explosión')).toBe('anillo-para-piro-explosion')
    expect(itemSlug('Té changua')).toBe('te-changua')
    expect(skuSlug('mago-fuego-a511dda7')).toBe('mago-fuego')
    expect(skuSlug('reanimador-3000-840518a9')).toBe('reanimador-3000')
  })

  it('encuentra el arte por el sku de produccion (con sufijo) o por el nombre', () => {
    expect(itemSpriteFor({ sku: 'puno-lucido-d9b0478c' })).not.toBeNull()
    expect(itemSpriteFor({ name: 'Puño lúcido' })).toEqual(
      itemSpriteFor({ sku: 'puno-lucido-2aadc743' }),
    )
    expect(itemSpriteFor({ name: 'Agonía' })?.image).toBe('/assets/items/agonia.png')
  })

  it('un producto sin arte devuelve null (cae a su imagen)', () => {
    expect(itemSpriteFor({ name: 'Producto que nadie dibujó', sku: 'otro-12345678' })).toBeNull()
    expect(itemSpriteFor({})).toBeNull()
  })

  it('todos los productos oficiales (armas, armaduras, items, habilidades y epicas) tienen arte', () => {
    const missing = PRODUCT_CATALOG.filter((entry) => itemSpriteFor({ name: entry.name }) === null)

    expect(missing.map((entry) => entry.name)).toEqual([])
  })

  it('cada sprite tiene al menos dos fotogramas y una imagen bajo /assets/items', () => {
    for (const slug of ITEM_SPRITE_SLUGS) {
      const spec = itemSpriteFor({ name: slug })

      expect(spec?.image).toBe(`/assets/items/${slug}.png`)
      expect(spec?.frames).toBeGreaterThanOrEqual(2)
    }
  })

  it('ItemSprite expone el nombre y anima solo si se pide', () => {
    const spec = itemSpriteFor({ name: 'Agonía' })!
    const { rerender } = render(<ItemSprite spec={spec} label="Agonía" />)

    expect(screen.getByRole('img', { name: 'Agonía' })).toBeInTheDocument()
    expect(document.querySelector('.item-sprite-frame')).toHaveAttribute('data-animated', 'true')

    rerender(<ItemSprite spec={spec} label="Agonía" animated={false} />)
    expect(document.querySelector('.item-sprite-frame')).toHaveAttribute('data-animated', 'false')
  })
})

describe('EN-031 — ProductVisual', () => {
  const fallback = <span data-testid="respaldo">imagen</span>

  it('un heroe de produccion (sku con sufijo) se pinta con su sprite, no con la imagen', () => {
    render(
      <ProductVisual
        product={{ name: 'Mago Fuego', type: 'HEROE', sku: 'mago-fuego-a511dda7' }}
        fallback={fallback}
      />,
    )

    expect(document.querySelector('[data-hero="mago-fuego"]')).not.toBeNull()
    expect(screen.queryByTestId('respaldo')).toBeNull()
  })

  it('sin tipo (carrito, subasta) reconoce al heroe por su nombre', () => {
    render(<ProductVisual product={{ name: 'Chamán' }} fallback={fallback} />)

    expect(document.querySelector('[data-hero="chaman"]')).not.toBeNull()
  })

  it('un arma con arte se pinta con su sprite', () => {
    render(
      <ProductVisual
        product={{ name: 'Espada de Plata', type: 'ARMA', sku: 'espada-de-plata-b447c5c8' }}
        fallback={fallback}
      />,
    )

    expect(screen.getByRole('img', { name: 'Espada de Plata' })).toBeInTheDocument()
    expect(screen.queryByTestId('respaldo')).toBeNull()
  })

  it('un producto sin arte cae a su imagen de siempre', () => {
    render(
      <ProductVisual
        product={{ name: 'Producto nuevo', type: 'ARMA', sku: 'producto-nuevo-0a1b2c3d' }}
        fallback={fallback}
      />,
    )

    expect(screen.getByTestId('respaldo')).toBeInTheDocument()
  })

  it('un HEROE desconocido no se adivina: cae a su imagen', () => {
    render(
      <ProductVisual
        product={{ name: 'Noveno héroe', type: 'HEROE', sku: 'noveno-heroe-12345678' }}
        fallback={fallback}
      />,
    )

    expect(screen.getByTestId('respaldo')).toBeInTheDocument()
  })
})
