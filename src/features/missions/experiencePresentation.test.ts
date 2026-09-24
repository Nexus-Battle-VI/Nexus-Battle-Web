import { describe, expect, it } from 'vitest'

import {
  creditedText,
  currentXpText,
  defeatsText,
  describeExperience,
  experienceGainedText,
  levelText,
  levelUpText,
  lineStateText,
} from './experiencePresentation'
import type { MissionExperience } from './missionReport'

/**
 * Textos del panel de experiencia (HU-09, Task HU-09.5). El modulo es PURO: no
 * calcula experiencia, nivel ni progreso; solo elige que se dice.
 */
const experienceOf = (overrides: Partial<MissionExperience> = {}): MissionExperience => ({
  defeats: 3,
  totalXp: 0,
  credited: 0,
  pending: 3,
  failed: 0,
  level: null,
  currentXp: null,
  maxLevel: null,
  levelsGained: 0,
  leveledUp: false,
  ...overrides,
})

describe('describeExperience — los tres estados (HU-09.5)', () => {
  it('sin derrotas no hay nada que contar', () => {
    expect(describeExperience(experienceOf({ defeats: 0, pending: 0 }))).toBeNull()
  })

  it('PENDING: las derrotas estan registradas y la experiencia va en camino', () => {
    expect(describeExperience(experienceOf())).toEqual({
      state: 'PENDING',
      headline: 'Experiencia en camino',
      detail: 'Las derrotas ya están registradas: la experiencia se acreditará en breve.',
    })
  })

  it('CREDITED: acreditada del todo', () => {
    const experience = experienceOf({
      totalXp: 54,
      credited: 3,
      pending: 0,
      level: 3,
      currentXp: 657,
      maxLevel: 8,
      levelsGained: 2,
      leveledUp: true,
    })

    expect(describeExperience(experience)).toEqual({
      state: 'CREDITED',
      headline: 'Experiencia acreditada',
      detail: '+54 XP para tu héroe.',
    })
  })

  it('CREDITED parcial: avisa de lo que sigue en curso, sin decir que llego todo', () => {
    const experience = experienceOf({ totalXp: 12, credited: 1, pending: 2, level: 2 })

    expect(describeExperience(experience)).toEqual({
      state: 'CREDITED',
      headline: 'Experiencia acreditada',
      detail: 'Ya se acreditó parte; quedan 2 derrotas en curso.',
    })
  })

  it('FAILED manda sobre el resto: lo primero es decir que algo no llego', () => {
    const experience = experienceOf({ totalXp: 12, credited: 1, pending: 1, failed: 1 })

    expect(describeExperience(experience)).toEqual({
      state: 'FAILED',
      headline: 'Parte de la experiencia no se acreditó',
      detail: '1 derrota sin acreditar de 3 derrotas. El resto sigue en curso.',
    })
  })

  it('FAILED sin nada pendiente no insinua un "en curso" que ya no va a resolverse', () => {
    const experience = experienceOf({ totalXp: 0, credited: 0, pending: 0, failed: 3 })

    expect(describeExperience(experience)).toEqual({
      state: 'FAILED',
      headline: 'Parte de la experiencia no se acreditó',
      detail: '3 derrotas sin acreditar de 3 derrotas.',
    })
  })

  it('una sola derrota pendiente concuerda en singular', () => {
    const experience = experienceOf({ defeats: 1, totalXp: 12, credited: 1, pending: 1 })

    expect(describeExperience(experience)?.detail).toBe(
      'Ya se acreditó parte; queda 1 derrota en curso.',
    )
  })
})

describe('cifras del panel (HU-09.5)', () => {
  it('la experiencia acreditada se muestra con su signo y en XP', () => {
    expect(experienceGainedText(experienceOf({ totalXp: 54 }))).toBe('+54 XP')
  })

  it('las derrotas se cuentan con su plural', () => {
    expect(defeatsText(experienceOf({ defeats: 1 }))).toBe('1 derrota')
    expect(defeatsText(experienceOf({ defeats: 19 }))).toBe('19 derrotas')
  })

  it('el avance es un cociente de contadores del servicio', () => {
    expect(creditedText(experienceOf({ defeats: 19, credited: 3 }))).toBe('3/19')
  })

  it('la experiencia acumulada solo se muestra si el servicio la publica', () => {
    expect(currentXpText(experienceOf({ currentXp: 657 }))).toBe('657 XP acumulada')
    expect(currentXpText(experienceOf())).toBeNull()
  })
})

describe('nivel y subida de nivel (HU-09.5)', () => {
  it('sin ninguna acreditacion no hay nivel que mostrar (null, no 0)', () => {
    expect(levelText(experienceOf())).toBeNull()
  })

  it('el nivel se muestra tal cual lo publica Player/Inventory', () => {
    expect(levelText(experienceOf({ level: 3, maxLevel: 8 }))).toBe('Nivel 3')
  })

  it('en el nivel tope se dice que es el maximo', () => {
    expect(levelText(experienceOf({ level: 8, maxLevel: 8 }))).toBe('Nivel 8 · máximo')
  })

  it('sin tope publicado no se afirma nada del maximo', () => {
    expect(levelText(experienceOf({ level: 8, maxLevel: null }))).toBe('Nivel 8')
  })

  it.each([
    [0, null],
    [1, '¡Has subido de nivel!'],
    [2, '¡Has subido 2 niveles!'],
  ])('con %i niveles cruzados se dice %s', (levelsGained, expected) => {
    expect(levelUpText(experienceOf({ levelsGained, leveledUp: levelsGained > 0 }))).toBe(expected)
  })
})

describe('estado de una derrota (HU-09.5)', () => {
  it.each([
    ['PENDING', 'En curso'],
    ['CREDITED', 'Acreditada'],
    ['FAILED', 'Sin acreditar'],
    ['LO_QUE_SEA', 'LO_QUE_SEA'],
  ])('%s se muestra como %s', (status, expected) => {
    expect(lineStateText(status)).toBe(expected)
  })
})
