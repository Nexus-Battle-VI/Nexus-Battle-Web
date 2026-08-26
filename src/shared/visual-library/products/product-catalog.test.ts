import { describe, expect, it } from 'vitest'

import { HERO_IDS } from '../heroes'
import { PRODUCT_CATALOG, PRODUCT_CATALOG_BY_ID } from './product-catalog'

const countByCategory = (category: (typeof PRODUCT_CATALOG)[number]['category']): number =>
  PRODUCT_CATALOG.filter((entry) => entry.category === category).length

describe('PRODUCT_CATALOG', () => {
  it('contiene exactamente 72 productos (conteo contractual de EN-026.1)', () => {
    expect(PRODUCT_CATALOG).toHaveLength(72)
  })

  it('respeta los conteos oficiales por familia: 16 armas, 16 armaduras, 8 items, 24 acciones, 8 epicas', () => {
    expect(countByCategory('weapon')).toBe(16)
    expect(countByCategory('armor')).toBe(16)
    expect(countByCategory('item')).toBe(8)
    expect(countByCategory('action')).toBe(24)
    expect(countByCategory('epic')).toBe(8)
  })

  it('no tiene ids duplicados', () => {
    const ids = PRODUCT_CATALOG.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('no tiene un recurso numero 73: el 72avo id existe y no hay un 73avo', () => {
    expect(PRODUCT_CATALOG[71]).toBeDefined()
    expect(PRODUCT_CATALOG[72]).toBeUndefined()
  })

  it('todo heroId asociado pertenece a los ocho heroes oficiales de EN-026.3, sin heroes inventados', () => {
    for (const entry of PRODUCT_CATALOG) {
      expect(HERO_IDS).toContain(entry.heroId)
    }
  })

  it('cada id sigue la convencion {heroe-slug}--{categoria}--{nombre-slug} de EN-026.1', () => {
    for (const entry of PRODUCT_CATALOG) {
      expect(entry.id.startsWith(`${entry.heroId}--`)).toBe(true)
      expect(entry.id.split('--')).toHaveLength(3)
    }
  })

  it('PRODUCT_CATALOG_BY_ID resuelve cada uno de los 72 ids al mismo objeto de PRODUCT_CATALOG', () => {
    for (const entry of PRODUCT_CATALOG) {
      expect(PRODUCT_CATALOG_BY_ID.get(entry.id)).toBe(entry)
    }
  })

  it('un id inventado no existe en el catalogo', () => {
    expect(PRODUCT_CATALOG_BY_ID.get('heroe-inexistente--arma--espada-inventada')).toBeUndefined()
  })
})
