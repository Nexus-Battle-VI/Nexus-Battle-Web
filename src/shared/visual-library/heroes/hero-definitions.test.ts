import { describe, expect, it } from 'vitest'

import { HERO_IDS } from './hero-ids'
import { HERO_VISUAL_SPECS, HERO_VISUAL_SPECS_BY_ID } from './hero-definitions'

describe('HERO_VISUAL_SPECS', () => {
  it('define exactamente una especificacion por cada uno de los 8 ids oficiales', () => {
    expect(HERO_VISUAL_SPECS).toHaveLength(8)
    expect(HERO_VISUAL_SPECS.map((spec) => spec.id).sort()).toEqual([...HERO_IDS].sort())
  })

  it('no contiene ningun campo de reglas de juego', () => {
    for (const spec of HERO_VISUAL_SPECS) {
      expect(spec).not.toHaveProperty('damage')
      expect(spec).not.toHaveProperty('defense')
      expect(spec).not.toHaveProperty('health')
      expect(spec).not.toHaveProperty('rarity')
      expect(spec).not.toHaveProperty('price')
      expect(spec).not.toHaveProperty('cooldown')
      for (const detail of spec.details) {
        expect(detail).not.toHaveProperty('damage')
        expect(detail).not.toHaveProperty('cooldown')
      }
    }
  })

  it('cada heroe se distingue del resto por silueta o acento, no solo por color', () => {
    const shapeKeys = HERO_VISUAL_SPECS.map((spec) => `${spec.silhouette}:${spec.accent}`)
    expect(new Set(shapeKeys).size).toBe(shapeKeys.length)
  })

  it('cada heroe declara al menos un detalle visual distintivo (type, placement, color)', () => {
    for (const spec of HERO_VISUAL_SPECS) {
      expect(spec.details.length).toBeGreaterThanOrEqual(1)
      for (const detail of spec.details) {
        expect(detail.type.length).toBeGreaterThan(0)
        expect(detail.placement.length).toBeGreaterThan(0)
        expect(detail.color).toMatch(/^#[0-9a-f]{6}$/iu)
      }
    }
  })

  it('siete de los ocho heroes suman un simbolo adicional en el pecho, conservando su detalle original', () => {
    // Guerrero Tanque es el unico que se dejo sin cambios (un solo detalle,
    // `helmet`); los otros siete combinan su detalle previo con un simbolo
    // de pecho nuevo.
    const tanque = HERO_VISUAL_SPECS_BY_ID.get('guerrero-tanque')
    expect(tanque?.details).toHaveLength(1)
    expect(tanque?.details[0]?.type).toBe('helmet')

    const withChestSymbol = HERO_VISUAL_SPECS.filter((spec) => spec.id !== 'guerrero-tanque')
    for (const spec of withChestSymbol) {
      expect(spec.details.length).toBeGreaterThanOrEqual(1)
      expect(spec.details.some((detail) => detail.placement === 'chest')).toBe(true)
    }
  })

  it('reutiliza el mismo HeroDetailType (blade) para dos heroes sin duplicar la logica de construccion', () => {
    // Guerrero Armas y Pícaro Machete comparten `type: 'blade'` en mano,
    // diferenciado por `scale`: la reutilizacion vive en `buildHeroDetail`
    // (`create-hero-model.ts`), no en `hero-definitions.ts`.
    const bladeHeroes = HERO_VISUAL_SPECS.filter((spec) =>
      spec.details.some((detail) => detail.type === 'blade'),
    )

    expect(bladeHeroes.map((spec) => spec.id).sort()).toEqual(['guerrero-armas', 'picaro-machete'])
  })

  it('Guerrero Armas y Pícaro Machete usan simbolos de pecho distintos, no identicos entre si', () => {
    const guerreroArmas = HERO_VISUAL_SPECS_BY_ID.get('guerrero-armas')
    const picaroMachete = HERO_VISUAL_SPECS_BY_ID.get('picaro-machete')

    const chestType = (spec: typeof guerreroArmas): string | undefined =>
      spec?.details.find((detail) => detail.placement === 'chest')?.type

    expect(chestType(guerreroArmas)).toBe('chestWeaponMark')
    expect(chestType(picaroMachete)).toBe('chestMacheteMark')
    expect(chestType(guerreroArmas)).not.toBe(chestType(picaroMachete))
  })

  it('la cruz del pecho del Medico es roja', () => {
    const medico = HERO_VISUAL_SPECS_BY_ID.get('medico')
    const cross = medico?.details.find((detail) => detail.type === 'medicalCross')

    expect(cross?.color).toBe('#d64545')
  })
})

describe('HERO_VISUAL_SPECS_BY_ID', () => {
  it('resuelve los 8 ids oficiales', () => {
    for (const id of HERO_IDS) {
      expect(HERO_VISUAL_SPECS_BY_ID.get(id)?.id).toBe(id)
    }
  })

  it('devuelve undefined para un id desconocido, sin lanzar', () => {
    expect(HERO_VISUAL_SPECS_BY_ID.get('heroe-inexistente')).toBeUndefined()
  })
})
