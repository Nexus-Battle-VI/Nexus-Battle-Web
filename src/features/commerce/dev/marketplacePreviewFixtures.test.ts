import { describe, expect, it } from 'vitest'

import { MARKETPLACE_PREVIEW_PRODUCTS } from './marketplacePreviewFixtures'

/*
 * 8a pasada (STEP 8/13-D): antes de este cambio, TODOS los productos del
 * preview heredaban `attributes.values: {}` de `base` sin sobrescribirlo --
 * por eso el panel de Atributos de `ProductDetail` no mostraba nada util al
 * abrirlo desde `/__dev/ecommerce/marketplace-preview`. Este test fija que
 * al menos un producto del fixture (solo DEV, nunca produccion) trae una
 * ficha de atributos real y suficientemente rica para juzgar el diseño.
 */
describe('Fixture de preview — al menos un producto con atributos ricos', () => {
  const rich = MARKETPLACE_PREVIEW_PRODUCTS.find(
    (product) => Object.keys(product.attributes.values).length > 0,
  )

  it('existe un producto con attributes.values no vacio', () => {
    expect(rich).toBeDefined()
  })

  it('cubre las claves reales del esquema de ARMADURA (tipo, parte de armadura, compatibilidad, apilable, efectos)', () => {
    expect(rich?.attributes.values).toMatchObject({
      kind: 'ARMADURA',
      slot: 'CHEST',
      compatibilityScope: 'SELECTED_SUBTYPES',
      compatibleHeroSubtypes: ['GUERRERO', 'MAGO'],
      stackable: false,
    })
  })

  it('trae al menos un efecto con objetivo, estadistica, operacion y magnitud reales', () => {
    const effects = rich?.attributes.values.effects as readonly Record<string, unknown>[]
    expect(Array.isArray(effects)).toBe(true)
    expect(effects.length).toBeGreaterThanOrEqual(1)
    expect(effects[0]).toMatchObject({
      kind: 'STAT_MODIFIER',
      target: 'SELF',
      statistic: 'DEFENSE',
      operation: 'INCREASE',
    })
    expect(effects[0]?.magnitude).toMatchObject({ mode: 'FIXED', amount: 18 })
  })

  it('el resto de productos del preview sigue intacto (no se removio ninguno)', () => {
    expect(MARKETPLACE_PREVIEW_PRODUCTS.length).toBeGreaterThanOrEqual(9)
  })
})
