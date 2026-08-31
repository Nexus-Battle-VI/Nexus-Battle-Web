import { describe, expect, it } from 'vitest'
import { PRODUCTS } from './catalog-fixtures'
import { foldText, searchRank } from './search'

function byName(name: string) {
  const product = PRODUCTS.find((p) => p.name === name)
  if (!product) throw new Error(`Producto no encontrado: ${name}`)
  return product
}

describe('foldText', () => {
  it('ignora tildes', () => {
    expect(foldText('Báculo')).toBe(foldText('Baculo'))
    expect(foldText('Árbol de la vida')).toContain('arbol')
  })
})

describe('searchRank', () => {
  it('sin tokens todos empatan en 0', () => {
    expect(searchRank(byName('Espada de una mano'), [])).toBe(0)
  })

  it('prioriza el nombre sobre habilidades y stats al buscar vida', () => {
    const tokens = ['vida']
    const named = searchRank(byName('Árbol de la vida'), tokens)
    const ability = searchRank(byName('Escudo de dragón'), tokens)
    const statsOnly = searchRank(byName('Espada de una mano'), tokens)

    expect(named).not.toBeNull()
    expect(ability).not.toBeNull()
    expect(statsOnly).not.toBeNull()
    expect(named!).toBeLessThan(ability!)
    expect(ability!).toBeLessThan(statsOnly!)
  })

  it('encuentra Báculo sin tilde', () => {
    expect(searchRank(byName('Báculo de Permafrost'), ['baculo'])).not.toBeNull()
  })

  it('rechaza un término que no aparece', () => {
    expect(searchRank(byName('Espada de una mano'), ['xyznoexiste'])).toBeNull()
  })
})
