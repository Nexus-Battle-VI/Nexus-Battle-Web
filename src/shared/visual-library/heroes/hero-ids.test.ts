import { describe, expect, it } from 'vitest'

import { HERO_IDS } from './hero-ids'

const OFFICIAL_HERO_IDS = [
  'guerrero-tanque',
  'guerrero-armas',
  'mago-fuego',
  'mago-hielo',
  'picaro-veneno',
  'picaro-machete',
  'chaman',
  'medico',
]

describe('HERO_IDS', () => {
  it('contiene exactamente 8 ids', () => {
    expect(HERO_IDS).toHaveLength(8)
  })

  it('coincide exactamente con los ocho ids oficiales de EN-026.1, sin un noveno heroe', () => {
    expect([...HERO_IDS].sort()).toEqual([...OFFICIAL_HERO_IDS].sort())
  })

  it('no tiene ids duplicados', () => {
    expect(new Set(HERO_IDS).size).toBe(HERO_IDS.length)
  })
})
