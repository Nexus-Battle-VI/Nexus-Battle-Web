import { describe, expect, it } from 'vitest'
import { PRODUCTS, finalPrice, formatMoney, isPremium } from './catalog-fixtures'

function fixture(name: string) {
  const product = PRODUCTS.find((p) => p.name === name)
  if (!product) throw new Error(`Fixture no encontrada: ${name}`)
  return product
}

describe('formatMoney', () => {
  it('usa solo COP, sin USD ni créditos', () => {
    const label = formatMoney(20000)
    expect(label).toContain('COP')
    expect(label).not.toMatch(/USD|EUR|créditos|creditos/i)
    expect(label).toMatch(/20/)
  })
})

describe('finalPrice', () => {
  it('deja el precio si no hay descuento', () => {
    expect(finalPrice({ ...fixture('Espada de una mano'), discountPct: 0, price: 20000 })).toBe(
      20000,
    )
  })

  it('aplica el porcentaje de promoción', () => {
    expect(finalPrice({ ...fixture('Escudo de dragón'), price: 40000, discountPct: 20 })).toBe(
      32000,
    )
  })
})

describe('isPremium', () => {
  it('marca el Amuleto de vacío y el Árbol de la vida como premium', () => {
    expect(isPremium(fixture('Amuleto de vacío'))).toBe(true)
    expect(isPremium(fixture('Árbol de la vida'))).toBe(true)
  })

  it('no marca la Espada de una mano como premium', () => {
    expect(isPremium(fixture('Espada de una mano'))).toBe(false)
  })
})
