import { describe, expect, it } from 'vitest'

import type { HeroProgression } from '../heroSelectionApi'
import { presentHeroProgression } from './heroProgressionPresentation'

const progression = (overrides: Partial<HeroProgression> = {}): HeroProgression => ({
  level: 1,
  currentXp: 0,
  floorForCurrentLevel: 0,
  nextLevel: { status: 'AVAILABLE', forNextLevel: 2, amount: 100 },
  maxLevel: 8,
  ...overrides,
})

describe('presentHeroProgression', () => {
  it('un heroe sin experiencia queda en 0% dentro del nivel 1', () => {
    const result = presentHeroProgression(progression())

    expect(result).toEqual({
      level: 1,
      maxLevel: 8,
      isMaxLevel: false,
      currentXp: 0,
      nextLevel: 2,
      xpIntoLevel: 0,
      xpRequiredForLevel: 100,
      percent: 0,
    })
  })

  it('calcula el progreso dentro del nivel a partir del piso y el siguiente umbral, sin reimplementar la tabla', () => {
    // Guerrero Tanque nivel 2 con 215 XP: piso 100, siguiente umbral 300 (HU-08).
    const result = presentHeroProgression(
      progression({
        level: 2,
        currentXp: 215,
        floorForCurrentLevel: 100,
        nextLevel: { status: 'AVAILABLE', forNextLevel: 3, amount: 300 },
      }),
    )

    expect(result.xpIntoLevel).toBe(115)
    expect(result.xpRequiredForLevel).toBe(200)
    expect(result.percent).toBe(58) // round(115 / 200 * 100)
    expect(result.nextLevel).toBe(3)
    expect(result.currentXp).toBe(215)
  })

  it('en nivel maximo no hay siguiente nivel y la barra queda llena', () => {
    const result = presentHeroProgression(
      progression({
        level: 8,
        currentXp: 1500,
        floorForCurrentLevel: 1300,
        nextLevel: { status: 'MAX_LEVEL', currentLevel: 8, forNextLevel: null, amount: null },
      }),
    )

    expect(result.isMaxLevel).toBe(true)
    expect(result.nextLevel).toBeNull()
    expect(result.xpRequiredForLevel).toBeNull()
    expect(result.percent).toBe(100)
    // La XP acumulada real se sigue mostrando: no se trunca en el tope.
    expect(result.currentXp).toBe(1500)
  })

  it('no produce un porcentaje fuera de 0-100 aunque el acumulado supere el umbral', () => {
    const result = presentHeroProgression(
      progression({
        level: 1,
        currentXp: 99,
        floorForCurrentLevel: 0,
        nextLevel: { status: 'AVAILABLE', forNextLevel: 2, amount: 100 },
      }),
    )

    expect(result.percent).toBeGreaterThanOrEqual(0)
    expect(result.percent).toBeLessThanOrEqual(100)
  })

  it.each([
    // 7a pasada (gate "XP no inventar matematica"): los casos explicitos
    // que compara el encargo -10% y 80% deben verse MUY distintos en
    // Chrome; 30% y 70/240≈29.17% deben verse casi iguales, porque eso es
    // lo que la formula de progreso DENTRO del nivel actual produce.
    [10, 100, 10],
    [80, 100, 80],
    [30, 100, 30],
    [70, 240, 29], // round(70/240*100) = 29
  ])('%i / %i da %i%%', (xpIntoLevel, xpRequiredForLevel, expectedPercent) => {
    const result = presentHeroProgression(
      progression({
        level: 1,
        currentXp: xpIntoLevel,
        floorForCurrentLevel: 0,
        nextLevel: { status: 'AVAILABLE', forNextLevel: 2, amount: xpRequiredForLevel },
      }),
    )

    expect(result.percent).toBe(expectedPercent)
  })

  it('con el acumulado ya por encima del umbral (dato desfasado) la barra se satura en 100', () => {
    const result = presentHeroProgression(
      progression({
        level: 1,
        currentXp: 150,
        floorForCurrentLevel: 0,
        nextLevel: { status: 'AVAILABLE', forNextLevel: 2, amount: 100 },
      }),
    )

    expect(result.percent).toBe(100)
  })
})
