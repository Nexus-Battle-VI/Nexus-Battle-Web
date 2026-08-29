import { describe, expect, it } from 'vitest'

import { HERO_VISUAL_SPECS_BY_ID } from '../heroes'
import { PRODUCT_CATALOG } from './product-catalog'
import {
  PRODUCT_VISUAL_SPECS,
  PRODUCT_VISUAL_SPECS_BY_ID,
  buildProductVisualSpec,
} from './product-visual-definitions'

describe('PRODUCT_VISUAL_SPECS', () => {
  it('deriva exactamente 72 specs, una por cada fila de PRODUCT_CATALOG', () => {
    expect(PRODUCT_VISUAL_SPECS).toHaveLength(72)
  })

  it('conserva id, nombre, categoria y heroId del catalogo, sin inventar datos', () => {
    for (const entry of PRODUCT_CATALOG) {
      const spec = PRODUCT_VISUAL_SPECS_BY_ID.get(entry.id)
      expect(spec).toBeDefined()
      expect(spec?.displayName).toBe(entry.name)
      expect(spec?.category).toBe(entry.category)
      expect(spec?.heroId).toBe(entry.heroId)
    }
  })

  it('reutiliza el color de identidad (bodyColor/accentColor) del heroe asociado de EN-026.3', () => {
    for (const entry of PRODUCT_CATALOG) {
      const spec = PRODUCT_VISUAL_SPECS_BY_ID.get(entry.id)
      const heroSpec = HERO_VISUAL_SPECS_BY_ID.get(entry.heroId)
      expect(spec?.primaryColor).toBe(heroSpec?.bodyColor)
      expect(spec?.accentColor).toBe(heroSpec?.accentColor)
    }
  })

  it('el seed decorativo es deterministico: la misma entrada produce siempre el mismo seed', () => {
    const entry = PRODUCT_CATALOG[0]
    if (!entry) {
      throw new Error('se esperaba al menos un producto en PRODUCT_CATALOG')
    }

    const first = buildProductVisualSpec(entry)
    const second = buildProductVisualSpec(entry)

    expect(first.seed).toBe(second.seed)
  })

  it('no contiene ningun campo de reglas de juego (dano, vida, rareza, precio, cooldown)', () => {
    const spec = PRODUCT_VISUAL_SPECS[0]
    if (!spec) {
      throw new Error('se esperaba al menos una ProductVisualSpec')
    }

    expect(Object.keys(spec).sort()).toEqual(
      ['accentColor', 'category', 'displayName', 'heroId', 'id', 'primaryColor', 'seed'].sort(),
    )
  })
})
