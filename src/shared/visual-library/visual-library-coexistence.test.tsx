import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Hero3D } from './heroes/Hero3D'
import { HERO_IDS } from './heroes/hero-ids'
import { PRODUCT_CATALOG } from './products/product-catalog'
import { ProductVisual2D } from './products/ProductVisual2D'
import { visualResourceRegistry } from './registry'
import { resolveVisualResource } from './resolve-visual-resource'

/**
 * EN-026.5: evidencia de que heroes (EN-026.3) y productos (EN-026.4)
 * conviven en el mismo `visualResourceRegistry` singleton de la aplicacion
 * sin registros paralelos ni colisiones. `Hero3D.tsx` y `ProductVisual2D.tsx`
 * registran sus recursos como efecto de modulo (ver ambos archivos); montar
 * un componente de cada dominio en la misma suite ejerce ese registro real,
 * no uno aislado creado a mano con `createVisualResourceRegistry`.
 */
describe('convivencia de heroes y productos en el registro compartido', () => {
  it('los 8 heroes y los 72 productos resuelven READY simultaneamente en el mismo registro, sin sobrescribirse', () => {
    render(<Hero3D heroId="medico" />)
    render(<ProductVisual2D resourceId="medico--epica--reanimador-3000" category="epic" />)

    for (const heroId of HERO_IDS) {
      const { descriptor, isFallback } = resolveVisualResource(
        visualResourceRegistry,
        heroId,
        'hero',
      )
      expect(isFallback).toBe(false)
      expect(descriptor.category).toBe('hero')
    }

    for (const entry of PRODUCT_CATALOG) {
      const { descriptor, isFallback } = resolveVisualResource(
        visualResourceRegistry,
        entry.id,
        entry.category,
      )
      expect(isFallback).toBe(false)
      expect(descriptor.category).toBe(entry.category)
      expect(descriptor.heroId).toBe(entry.heroId)
    }
  })

  it('ningun id de heroe colisiona con ningun id de producto en el registro compartido', () => {
    const productIds = new Set(PRODUCT_CATALOG.map((entry) => entry.id))
    for (const heroId of HERO_IDS) {
      expect(productIds.has(heroId)).toBe(false)
    }
  })
})
