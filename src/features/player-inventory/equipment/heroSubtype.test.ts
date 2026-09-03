import { describe, expect, it } from 'vitest'

import { HERO_IDS } from '@/shared/visual-library/heroes'
import { heroIdFromReference, heroIdFromSubtype, subtypeFromHeroId } from './heroSubtype'

describe('correspondencia héroe visual <-> subtipo canónico', () => {
  it('transforma cada uno de los ocho HERO_IDS a su código de subtipo y de vuelta', () => {
    for (const id of HERO_IDS) {
      const subtype = subtypeFromHeroId(id)
      expect(subtype).toBe(id.replace(/-/g, '_').toUpperCase())
      expect(heroIdFromSubtype(subtype)).toBe(id)
    }
  })

  it('heroIdFromReference reconoce una referencia kebab que es uno de los ocho', () => {
    expect(heroIdFromReference('MAGO-FUEGO')).toBe('mago-fuego')
    expect(heroIdFromReference('chaman')).toBe('chaman')
  })

  it('devuelve null cuando no hay correspondencia demostrada', () => {
    expect(heroIdFromSubtype('GUERRERO_LICH')).toBeNull()
    expect(heroIdFromReference('espada-de-fuego')).toBeNull()
  })
})
