import { describe, expect, it } from 'vitest'

import { reportOf, lineOf } from './fixtures'
import { difficultyLabel, experienceLinesOf, outcomeLabel, readExperience } from './missionReport'
import type { MissionReportExperience } from './api'

/**
 * Lectura del informe (HU-74) y de su bloque de experiencia (HU-09, Task HU-09.5).
 *
 * Lo que se comprueba es que Web NO reconstruye el agregado: lo lee, y cuando el
 * servicio no lo trae lo dice en lugar de inventar ceros.
 */
const EXPERIENCE: MissionReportExperience = {
  defeats: 19,
  totalXp: 54,
  credited: 3,
  pending: 16,
  failed: 0,
  level: 3,
  currentXp: 657,
  maxLevel: 8,
  levelsGained: 2,
  leveledUp: true,
}

describe('readExperience — el agregado se lee, no se calcula (HU-09.5)', () => {
  it('lee el bloque tal como lo publica Missions', () => {
    expect(readExperience(reportOf({ experience: EXPERIENCE }))).toEqual(EXPERIENCE)
  })

  it('sin bloque devuelve null: un servicio anterior a HU-09.5 no lo trae', () => {
    expect(readExperience(reportOf())).toBeNull()
  })

  it('no reconstruye el agregado contando las lineas del informe', () => {
    // Tres lineas de experiencia acreditadas, y NINGUN bloque: la pantalla no
    // deduce "3 derrotas" de ellas, porque esa regla es de Missions.
    const report = reportOf({
      rewards: [
        lineOf({ status: 'CREDITED', quantity: 12 }),
        lineOf({ reference: 'sombra-corrompida#2', status: 'CREDITED', quantity: 14 }),
        lineOf({ reference: 'guardian-eterno#1', status: 'CREDITED', quantity: 25 }),
      ],
    })

    expect(readExperience(report)).toBeNull()
  })

  it('un bloque sin derrotas no vale: es el dato que da sentido al resto', () => {
    const withoutDefeats: Record<string, unknown> = { ...EXPERIENCE }
    delete withoutDefeats.defeats

    expect(
      readExperience(
        reportOf({ experience: withoutDefeats as unknown as MissionReportExperience }),
      ),
    ).toBeNull()
  })

  it('un contador que falta es cero, y un nivel que falta es null (no un nivel 0)', () => {
    const experience = readExperience(
      reportOf({ experience: { defeats: 4 } as MissionReportExperience }),
    )

    expect(experience).toEqual({
      defeats: 4,
      credited: 0,
      pending: 0,
      failed: 0,
      totalXp: 0,
      level: null,
      currentXp: null,
      maxLevel: null,
      levelsGained: 0,
      leveledUp: false,
    })
  })

  it('un nivel 0 o un decimal no son un nivel', () => {
    const experience = readExperience(
      reportOf({
        experience: { ...EXPERIENCE, level: 0, maxLevel: 8.5, currentXp: -1 },
      }),
    )

    expect(experience).toMatchObject({ level: null, maxLevel: null, currentXp: null })
  })

  it('`leveledUp` se lee del servicio, no se deduce de la cuenta', () => {
    const experience = readExperience(
      reportOf({ experience: { ...EXPERIENCE, levelsGained: 0, leveledUp: true } }),
    )

    // Contradiccion del servicio: se muestra la subida que el declara y, con
    // `levelsGained` en cero, la presentacion no anuncia ninguna.
    expect(experience).toMatchObject({ leveledUp: true, levelsGained: 0 })
  })
})

describe('experienceLinesOf — solo las lineas de experiencia (HU-09.5)', () => {
  it('deja fuera las lineas de otros origenes', () => {
    const epic = lineOf({ kind: 'EPIC', source: 'HU-73', quantity: 1 })
    const credits = lineOf({ kind: 'CREDITS', source: 'HU-10', quantity: 50 })
    const xp = lineOf()

    expect(experienceLinesOf(reportOf({ rewards: [epic, credits, xp] }))).toEqual([xp])
  })

  it('un informe sin lineas de experiencia devuelve una lista vacia, no un error', () => {
    expect(experienceLinesOf(reportOf())).toEqual([])
  })
})

describe('etiquetas del informe (HU-74)', () => {
  it.each([
    ['NORMAL', 'Normal'],
    ['HEROIC', 'Heroica'],
    ['LEGENDARY', 'Legendaria'],
    ['MYTHIC', 'Mítica'],
    ['INVENTADA', 'INVENTADA'],
  ])('la dificultad %s se muestra como %s', (difficulty, expected) => {
    expect(difficultyLabel(difficulty)).toBe(expected)
  })

  it.each([
    ['COMPLETED', 'Completada'],
    ['FAILED', 'Fallida'],
    ['ABANDONED', 'Abandonada'],
    ['VOIDED', 'VOIDED'],
  ])('el desenlace %s se muestra como %s', (outcome, expected) => {
    expect(outcomeLabel(outcome)).toBe(expected)
  })
})
