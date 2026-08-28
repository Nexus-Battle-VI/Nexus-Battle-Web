import { describe, expect, it } from 'vitest'

import { createVisualResourceRegistry } from '../registry'
import { resolveVisualResource } from '../resolve-visual-resource'
import { PRODUCT_CATALOG } from './product-catalog'
import { registerProductVisualResources } from './register-product-visual-resources'

describe('registerProductVisualResources', () => {
  it('registra los 72 productos como READY con la categoria y el heroId oficiales, con recurso procedural sin url ficticia', () => {
    const registry = createVisualResourceRegistry()

    registerProductVisualResources(registry)

    for (const entry of PRODUCT_CATALOG) {
      const { descriptor, isFallback } = resolveVisualResource(registry, entry.id, entry.category)

      expect(isFallback).toBe(false)
      expect(descriptor.status).toBe('READY')
      expect(descriptor.category).toBe(entry.category)
      expect(descriptor.heroId).toBe(entry.heroId)
      expect(descriptor.resource).toEqual({ kind: 'image', source: 'procedural' })
    }
  })

  it('un id inexistente y un producto numero 73 caen al mismo fallback seguro, sin lanzar', () => {
    const registry = createVisualResourceRegistry()

    registerProductVisualResources(registry)

    const unknown = resolveVisualResource(registry, 'producto-inexistente', 'item')
    expect(unknown.isFallback).toBe(true)
    expect(unknown.descriptor.status).toBe('NOT_PRODUCED')
  })

  it('no registra ningun heroe: el registro de productos y el de heroes son independientes', () => {
    const registry = createVisualResourceRegistry()

    registerProductVisualResources(registry)

    const hero = resolveVisualResource(registry, 'guerrero-tanque', 'hero')
    expect(hero.isFallback).toBe(true)
  })

  it('es idempotente: registrar dos veces no cambia el resultado', () => {
    const registry = createVisualResourceRegistry()

    registerProductVisualResources(registry)
    registerProductVisualResources(registry)

    const first = PRODUCT_CATALOG[0]
    if (!first) {
      throw new Error('se esperaba al menos un producto en PRODUCT_CATALOG')
    }
    const { descriptor } = resolveVisualResource(registry, first.id, first.category)
    expect(descriptor.status).toBe('READY')
  })

  it('el mismo recurso se reutiliza (mismo objeto) cuando lo resuelven dos consumidores distintos', () => {
    const registry = createVisualResourceRegistry()
    registerProductVisualResources(registry)

    const first = PRODUCT_CATALOG[0]
    if (!first) {
      throw new Error('se esperaba al menos un producto en PRODUCT_CATALOG')
    }

    const fromCatalogView = resolveVisualResource(registry, first.id, first.category)
    const fromEquipmentView = resolveVisualResource(registry, first.id, first.category)

    expect(fromCatalogView.descriptor).toBe(fromEquipmentView.descriptor)
  })
})
