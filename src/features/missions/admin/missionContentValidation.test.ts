import { describe, expect, it } from 'vitest'

import { missionContentFixture } from '@/test/mission-content-fixture'

import type { MissionContent } from './missionContent'
import {
  errorsBySection,
  fieldOfServerPath,
  pathOfServerMessage,
  sectionOf,
  validateMissionContent,
  type FieldErrors,
} from './missionContentValidation'

const saved = { isNew: false, takenIds: new Set(['msn_templo_olvidado']) } as const

const errorsOf = (change: (content: MissionContent) => MissionContent): FieldErrors =>
  validateMissionContent(change(missionContentFixture()), saved)

describe('validación del editor (las reglas de Missions, antes de enviar)', () => {
  it('una misión completa no tiene errores', () => {
    expect(validateMissionContent(missionContentFixture(), saved)).toEqual({})
  })

  it('el identificador de una misión nueva tiene formato y no se repite', () => {
    const fixture = missionContentFixture()

    expect(
      validateMissionContent({ ...fixture, missionId: 'Mi Misión' }, { ...saved, isNew: true })
        .missionId,
    ).toMatch(/minúsculas/u)
    expect(validateMissionContent(fixture, { ...saved, isNew: true }).missionId).toBe(
      'Ya existe una misión con ese identificador.',
    )
  })

  it('pide los textos, una duración válida y un poder entero', () => {
    const errors = errorsOf((content) => ({
      ...content,
      name: '  ',
      summary: '',
      narrative: '',
      estimatedDurationMinutes: 0,
      recommendedPower: 1.5,
    }))

    expect(Object.keys(errors).sort()).toEqual([
      'estimatedDurationMinutes',
      'name',
      'narrative',
      'recommendedPower',
      'summary',
    ])
  })

  it('un enemigo que no aparece en ningún encuentro no se puede guardar', () => {
    const errors = errorsOf((content) => ({
      ...content,
      encounters: content.encounters.filter((encounter) => encounter.index !== 2),
    }))

    expect(errors['enemies.1.count']).toMatch(/no aparece/u)
  })

  it('cada encuentro necesita enemigos conocidos y un refuerzo de 0 % a 200 %', () => {
    const errors = errorsOf((content) => ({
      ...content,
      encounters: [
        { index: 1, kind: 'REGULAR', powerStep: 3, enemies: [{ enemyRef: 'nadie', count: 1 }] },
        { index: 2, kind: 'REGULAR', powerStep: null, enemies: [] },
        ...content.encounters.slice(2),
      ],
    }))

    expect(errors['encounters.0.enemies.0']).toBe('Elige un enemigo de la lista.')
    expect(errors['encounters.0.powerStep']).toMatch(/200 %/u)
    expect(errors['encounters.1.enemies']).toMatch(/al menos un grupo/u)
  })

  it('el objetivo de botín nombra un botín del jefe', () => {
    const errors = errorsOf((content) => ({
      ...content,
      finalBoss: { ...content.finalBoss, drops: [] },
    }))

    expect(errors['objectives.1.rule']).toBe('Elige un botín del jefe final.')
  })

  it('revisa el perfil de combate, el botín y el refuerzo del jefe', () => {
    const errors = errorsOf((content) => ({
      ...content,
      finalBoss: {
        ...content.finalBoss,
        profile: {
          ...content.finalBoss.profile,
          maxHealth: 0,
          damage: { mode: 'DICE', count: 0, sides: 6 },
          enrageBelowPercent: 0,
        },
        drops: [{ label: 'Reliquia', probability: 2, rolls: 0, productId: 'no-es-uuid' }],
      },
      encounters: content.encounters.map((encounter) =>
        encounter.kind === 'BOSS' ? { ...encounter, powerStep: 5 } : encounter,
      ),
    }))

    expect(Object.keys(errors).sort()).toEqual([
      'finalBoss.drops.0.probability',
      'finalBoss.drops.0.productId',
      'finalBoss.drops.0.rolls',
      'finalBoss.powerStep',
      'finalBoss.profile.damage',
      'finalBoss.profile.enrageBelowPercent',
      'finalBoss.profile.maxHealth',
    ])
  })

  it('el Máster necesita candidatos, momentos que existan y probabilidades de 0 a 1', () => {
    const empty = errorsOf((content) => ({
      ...content,
      masterEncounter: { evaluationPoints: [], candidates: [] },
    }))
    const broken = errorsOf((content) => {
      const candidate = content.masterEncounter?.candidates[0]
      if (candidate === undefined) throw new Error('El fixture trae un Máster.')
      return {
        ...content,
        masterEncounter: {
          evaluationPoints: [{ afterEncounter: 9 }],
          maxAppearances: 0,
          candidates: [
            { ...candidate, probabilityByHeroType: { '*': 1.5 }, levelOffset: -1 },
            candidate,
          ],
        },
      }
    })

    expect(empty['masterEncounter.candidates']).toMatch(/al menos un Máster/u)
    expect(empty['masterEncounter.evaluationPoints']).toMatch(/al menos un momento/u)
    expect(broken).toMatchObject({
      'masterEncounter.evaluationPoints': 'Un momento elegido ya no existe: revísalos.',
      'masterEncounter.maxAppearances': 'Las apariciones van de 1 en adelante.',
      'masterEncounter.candidates.0.probability': 'La probabilidad va de 0 % a 100 %.',
      'masterEncounter.candidates.0.levelOffset':
        'Los niveles de más deben ser un entero de 0 o más.',
      'masterEncounter.candidates.1.masterRef': 'El identificador falta o está repetido.',
    })
  })

  it('las reglas de combate respetan los límites de Missions', () => {
    const errors = errorsOf((content) => ({
      ...content,
      combatRules: {
        ...content.combatRules,
        criticalMultiplier: 2,
        criticalChance: Number.NaN,
        difficultyMultipliers: { NORMAL: 0, HEROIC: 1.5, LEGENDARY: 2, MYTHIC: 2.5 },
        supportRegen: 101,
      },
    }))

    expect(Object.keys(errors).sort()).toEqual([
      'combatRules.criticalChance',
      'combatRules.criticalMultiplier',
      'combatRules.difficultyMultipliers.NORMAL',
      'combatRules.supportRegen',
    ])
  })

  it('una recompensa escrita no puede quedar vacía', () => {
    const errors = errorsOf((content) => ({
      ...content,
      rewards: { ...content.rewards, firstTime: [{ label: ' ' }] },
    }))

    expect(errors['rewards.firstTime.0']).toBe('Escribe la recompensa.')
  })
})

describe('pestañas y errores del servidor', () => {
  it('cada campo cae en su pestaña y se cuentan por pestaña', () => {
    expect(sectionOf('missionId')).toBe('general')
    expect(sectionOf('objectives.0.text')).toBe('objetivos')
    expect(sectionOf('encounters.1.enemies')).toBe('encuentros')
    expect(sectionOf('finalBoss.drops.0.label')).toBe('jefe')
    expect(sectionOf('masterEncounter')).toBe('master')
    expect(sectionOf('rewards.guaranteed.0')).toBe('recompensas')
    expect(sectionOf('combatRules.recoveryPercent')).toBe('reglas')
    expect(
      errorsBySection({ name: 'a', 'enemies.0.name': 'b', 'encounters.0.enemies': 'c' }),
    ).toEqual(
      new Map([
        ['general', 1],
        ['encuentros', 2],
      ]),
    )
  })

  it('lee la ruta del mensaje de Missions', () => {
    expect(
      pathOfServerMessage('El contenido de la mision no es valido: objectives[0].rule.count.'),
    ).toBe('objectives.0.rule.count')
    expect(
      pathOfServerMessage(
        'La configuracion del Master de msn_x no es valida: EVALUATION_POINT_OUT_OF_RANGE.',
      ),
    ).toBe('masterEncounter')
    expect(pathOfServerMessage('Error interno.')).toBeNull()
  })

  it('traduce la ruta de Missions al campo del formulario', () => {
    const content = missionContentFixture()

    expect(fieldOfServerPath('objectives.0.rule.count', content)).toBe('objectives.0.rule')
    expect(fieldOfServerPath('objectives.1', content)).toBe('objectives.1.text')
    expect(fieldOfServerPath('enemies.guardian.count', content)).toBe('enemies.1.count')
    expect(fieldOfServerPath('enemies.fantasma.count', content)).toBe('enemies')
    expect(fieldOfServerPath('encounters.1.kind', content)).toBe('encounters.1.enemies')
    expect(fieldOfServerPath('finalBoss.drops.0', content)).toBe('finalBoss.drops.0.label')
    expect(fieldOfServerPath('masterEncounter.candidates.0', content)).toBe(
      'masterEncounter.candidates.0.name',
    )
    expect(fieldOfServerPath('combatRules.recoveryPercent', content)).toBe(
      'combatRules.recoveryPercent',
    )
  })
})
