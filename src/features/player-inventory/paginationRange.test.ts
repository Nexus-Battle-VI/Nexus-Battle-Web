import { describe, expect, it } from 'vitest'

import { MAX_VISIBLE_PAGES, visiblePages } from './paginationRange'

describe('visiblePages', () => {
  it('muestra todas las páginas cuando hay 10 o menos', () => {
    expect(visiblePages(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('nunca muestra más de 10 números (RF-27)', () => {
    expect(visiblePages(50, 200)).toHaveLength(MAX_VISIBLE_PAGES)
  })

  it('centra la ventana en la página actual', () => {
    expect(visiblePages(50, 200)).toEqual([45, 46, 47, 48, 49, 50, 51, 52, 53, 54])
  })

  it('ancla la ventana al inicio', () => {
    expect(visiblePages(1, 200)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('ancla la ventana al final', () => {
    expect(visiblePages(200, 200)).toEqual([191, 192, 193, 194, 195, 196, 197, 198, 199, 200])
  })

  it('devuelve vacío sin páginas', () => {
    expect(visiblePages(1, 0)).toEqual([])
  })
})
