import { describe, expect, it } from 'vitest'

import { effectiveSearch, MIN_SEARCH_LENGTH } from './useOwnedInventory'

describe('effectiveSearch', () => {
  it('el umbral de RF-27 es 4', () => {
    expect(MIN_SEARCH_LENGTH).toBe(4)
  })

  it.each(['', 'e', 'es', 'esp'])('ignora un término de %j (menos de 4 caracteres)', (term) => {
    expect(effectiveSearch(term)).toBe('')
  })

  it.each(['espa', 'espada', '  espada larga  '])(
    'acepta un término de 4+ caracteres: %j',
    (term) => {
      expect(effectiveSearch(term)).toBe(term.trim())
    },
  )
})
