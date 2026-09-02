import { describe, expect, it } from 'vitest'

import type { ShowcaseProduct } from './api'
import { applyFilters, categoriesOf, NO_FILTERS, PAGE_SIZE, paginate } from './search'

const product = (sku: string, name: string, category: string, amount: number): ShowcaseProduct => ({
  sku,
  name,
  category,
  price: { amount, currency: 'COP' },
  isPremium: false,
  realMoneyPrice: null,
  status: 'PUBLISHED',
})

const CATALOG: readonly ShowcaseProduct[] = [
  product('espada-de-hierro', 'Espada de hierro', 'armas', 15_000),
  product('arco-corto', 'Arco corto', 'armas', 12_000),
  product('pocion-de-vida', 'Poción de vida', 'consumibles', 2_000),
  product('escudo-de-roble', 'Escudo de roble', 'armaduras', 9_500),
]

const skusOf = (products: readonly ShowcaseProduct[]): readonly string[] =>
  products.map((item) => item.sku)

describe('Busqueda general (CA-06)', () => {
  it('sin termino devuelve todo', () => {
    expect(applyFilters(CATALOG, NO_FILTERS)).toHaveLength(4)
  })

  it('encuentra por nombre', () => {
    const result = applyFilters(CATALOG, { ...NO_FILTERS, term: 'espada' })

    expect(skusOf(result)).toEqual(['espada-de-hierro'])
  })

  it('encuentra por tipo de producto', () => {
    const result = applyFilters(CATALOG, { ...NO_FILTERS, term: 'armas' })

    expect(skusOf(result)).toEqual(['espada-de-hierro', 'arco-corto'])
  })

  it('ignora mayusculas', () => {
    expect(applyFilters(CATALOG, { ...NO_FILTERS, term: 'ESPADA' })).toHaveLength(1)
  })

  /** Quien teclea deprisa escribe «pocion», no «poción». */
  it('ignora los acentos', () => {
    const result = applyFilters(CATALOG, { ...NO_FILTERS, term: 'pocion' })

    expect(skusOf(result)).toEqual(['pocion-de-vida'])
  })

  it('no impone un minimo de caracteres', () => {
    expect(applyFilters(CATALOG, { ...NO_FILTERS, term: 'ar' }).length).toBeGreaterThan(0)
  })

  /** CA-12: una consulta sin coincidencias no devuelve nada que las incumpla. */
  it('devuelve vacio cuando nada coincide', () => {
    expect(applyFilters(CATALOG, { ...NO_FILTERS, term: 'dragon' })).toHaveLength(0)
  })
})

/** CA-07: el precio forma parte de la informacion sobre la que se busca. */
describe('Busqueda por precio (CA-07)', () => {
  it('encuentra por el importe en la unidad mayor', () => {
    const result = applyFilters(CATALOG, { ...NO_FILTERS, term: '150' })

    expect(skusOf(result)).toContain('espada-de-hierro')
  })

  it('encuentra por el importe en la unidad minima', () => {
    const result = applyFilters(CATALOG, { ...NO_FILTERS, term: '15000' })

    expect(skusOf(result)).toEqual(['espada-de-hierro'])
  })

  it('encuentra por la moneda', () => {
    expect(applyFilters(CATALOG, { ...NO_FILTERS, term: 'COP' })).toHaveLength(4)
  })
})

describe('Filtro por rango de precio (CA-08)', () => {
  it('respeta el limite inferior', () => {
    const result = applyFilters(CATALOG, { ...NO_FILTERS, minPrice: 10_000 })

    expect(skusOf(result)).toEqual(['espada-de-hierro', 'arco-corto'])
  })

  it('respeta el limite superior', () => {
    const result = applyFilters(CATALOG, { ...NO_FILTERS, maxPrice: 9_500 })

    expect(skusOf(result)).toEqual(['pocion-de-vida', 'escudo-de-roble'])
  })

  it('los limites son inclusivos', () => {
    const result = applyFilters(CATALOG, { ...NO_FILTERS, minPrice: 12_000, maxPrice: 15_000 })

    expect(skusOf(result)).toEqual(['espada-de-hierro', 'arco-corto'])
  })

  it('un rango imposible no devuelve nada', () => {
    expect(applyFilters(CATALOG, { ...NO_FILTERS, minPrice: 90_000 })).toHaveLength(0)
  })
})

describe('Filtro por tipo de producto (CA-09)', () => {
  it('devuelve solo el tipo seleccionado', () => {
    const result = applyFilters(CATALOG, { ...NO_FILTERS, category: 'armaduras' })

    expect(skusOf(result)).toEqual(['escudo-de-roble'])
  })

  it('un tipo inexistente no devuelve nada', () => {
    expect(applyFilters(CATALOG, { ...NO_FILTERS, category: 'monturas' })).toHaveLength(0)
  })
})

/** CA-11: cada resultado cumple el termino Y todos los filtros activos. */
describe('Combinacion de criterios (CA-11)', () => {
  it('exige que se cumplan todos a la vez', () => {
    const result = applyFilters(CATALOG, {
      term: 'ar',
      category: 'armas',
      minPrice: 13_000,
      maxPrice: null,
    })

    expect(skusOf(result)).toEqual(['espada-de-hierro'])
  })

  it('si un solo criterio excluye, el producto no aparece', () => {
    const result = applyFilters(CATALOG, {
      term: 'espada',
      category: 'consumibles',
      minPrice: null,
      maxPrice: null,
    })

    expect(result).toHaveLength(0)
  })
})

describe('Paginacion de dieciseis (CA-01)', () => {
  const many = Array.from({ length: 17 }, (_, index) =>
    product(`sku-${String(index)}`, `Producto ${String(index)}`, 'armas', 1_000 + index),
  )

  it('la primera pagina trae dieciseis elementos', () => {
    const page = paginate(many, 1)

    expect(PAGE_SIZE).toBe(16)
    expect(page.items).toHaveLength(16)
    expect(page.pageCount).toBe(2)
    expect(page.total).toBe(17)
  })

  it('el elemento restante queda en la segunda pagina', () => {
    expect(paginate(many, 2).items).toHaveLength(1)
  })

  /** Filtrar estando en una pagina alta no debe dejar un vacio enganoso. */
  it('acota la pagina pedida al rango disponible', () => {
    expect(paginate(many, 99).page).toBe(2)
    expect(paginate(many, 0).page).toBe(1)
  })

  it('una lista vacia sigue teniendo una pagina', () => {
    const page = paginate([], 1)

    expect(page.pageCount).toBe(1)
    expect(page.items).toHaveLength(0)
    expect(page.total).toBe(0)
  })
})

describe('categoriesOf', () => {
  it('devuelve los tipos presentes, sin repetir y ordenados', () => {
    expect(categoriesOf(CATALOG)).toEqual(['armaduras', 'armas', 'consumibles'])
  })

  it('un catalogo vacio no ofrece tipos', () => {
    expect(categoriesOf([])).toEqual([])
  })
})
