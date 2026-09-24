import { describe, expect, it } from 'vitest'

import { missionContentFixture } from '@/test/mission-content-fixture'

import {
  appearancesOf,
  bossStatsOf,
  damageOf,
  duplicateMission,
  masterChanceOf,
  newMission,
  prepareForSave,
  slugify,
  uniqueRef,
  withRegularEncounters,
  type ContentMaster,
  type MissionContent,
} from './missionContent'
import { validateMissionContent } from './missionContentValidation'

const master = (
  probabilities: readonly (number | undefined)[],
  points: readonly number[],
): ContentMaster => {
  const base = missionContentFixture().masterEncounter
  const candidate = base?.candidates[0]
  if (base === null || candidate === undefined) throw new Error('El fixture trae un Máster.')
  return {
    evaluationPoints: points.map((afterEncounter) => ({ afterEncounter })),
    candidates: probabilities.map((probability, index) => ({
      ...candidate,
      masterRef: `master-${String(index)}`,
      probabilityByHeroType: probability === undefined ? {} : { '*': probability },
    })),
  }
}

describe('prepareForSave: lo que el formulario calcula antes de enviar', () => {
  it('el total de cada enemigo sale de sus apariciones en los encuentros', () => {
    const content: MissionContent = {
      ...missionContentFixture(),
      enemies: missionContentFixture().enemies.map((enemy) => ({ ...enemy, count: 99 })),
    }

    const prepared = prepareForSave(content)

    expect(prepared.enemies.map((enemy) => [enemy.enemyRef, enemy.count])).toEqual([
      ['sombra', 4],
      ['guardian', 2],
    ])
  })

  it('el encuentro del jefe va el último, con el jefe solo y su refuerzo', () => {
    const fixture = missionContentFixture()
    const [first, second, boss] = fixture.encounters
    if (first === undefined || second === undefined || boss === undefined) throw new Error()

    const prepared = prepareForSave({ ...fixture, encounters: [boss, second, first] })

    expect(prepared.encounters).toEqual([
      { ...second, index: 1 },
      { ...first, index: 2 },
      {
        index: 3,
        kind: 'BOSS',
        powerStep: 0.2,
        enemies: [{ enemyRef: 'guardian-eterno', count: 1 }],
      },
    ])
  })

  it('sin encuentro del jefe, lo crea sin refuerzo', () => {
    const fixture = missionContentFixture()
    const regular = fixture.encounters.slice(0, 1)

    const structured = withRegularEncounters({ ...fixture, encounters: regular }, regular)

    expect(structured.encounters[structured.encounters.length - 1]).toEqual({
      index: 2,
      kind: 'BOSS',
      powerStep: 0,
      enemies: [{ enemyRef: 'guardian-eterno', count: 1 }],
    })
  })

  it('las estadísticas visibles del jefe salen de su perfil; el daño, solo si es fijo', () => {
    const fixture = missionContentFixture()
    const dice = {
      ...fixture,
      finalBoss: {
        ...fixture.finalBoss,
        stats: {},
        profile: {
          ...fixture.finalBoss.profile,
          maxHealth: 70,
          damage: { mode: 'DICE', count: 2, sides: 6 },
        },
      },
    } satisfies MissionContent

    expect(prepareForSave(fixture).finalBoss.stats).toEqual({
      health: 60,
      attack: 8,
      defense: 7,
      damage: 3,
    })
    expect(prepareForSave(dice).finalBoss.stats).toEqual({ health: 70, attack: 8, defense: 7 })
    expect(
      bossStatsOf({ ...fixture.finalBoss.profile, damage: { mode: 'FIXED', amount: 4 } }),
    ).toMatchObject({ damage: 4 })
  })

  it('el botín potencial repite el del jefe, sin producto, y los textos se recortan', () => {
    const fixture = missionContentFixture()
    const content: MissionContent = {
      ...fixture,
      name: '  El templo olvidado  ',
      enemies: fixture.enemies.map((enemy) => ({ ...enemy, description: '   ' })),
      finalBoss: {
        ...fixture.finalBoss,
        drops: [
          { label: ' Reliquia ', probability: 0.5, rolls: 2 },
          {
            label: 'Gema',
            probability: 1,
            rolls: 1,
            productId: '5b0c2c5e-8f4a-4c1e-9d2b-3a4b5c6d7e8f',
          },
        ],
      },
    }

    const prepared = prepareForSave(content)

    expect(prepared.name).toBe('El templo olvidado')
    expect(prepared.enemies.map((enemy) => enemy.description)).toEqual([null, null])
    expect(prepared.finalBoss.drops).toEqual([
      { label: 'Reliquia', probability: 0.5, rolls: 2, productId: null },
      {
        label: 'Gema',
        probability: 1,
        rolls: 1,
        productId: '5b0c2c5e-8f4a-4c1e-9d2b-3a4b5c6d7e8f',
      },
    ])
    expect(prepared.rewards.potential).toEqual([
      { label: 'Reliquia', probability: 0.5, rolls: 2 },
      { label: 'Gema', probability: 1, rolls: 1 },
    ])
  })

  it('los momentos del Máster quedan sin repetir y en orden', () => {
    const fixture = missionContentFixture()

    const prepared = prepareForSave({ ...fixture, masterEncounter: master([0.1], [3, 1, 3]) })

    expect(prepared.masterEncounter?.evaluationPoints).toEqual([
      { afterEncounter: 1 },
      { afterEncounter: 3 },
    ])
  })

  it('conserva los campos que el editor no conoce', () => {
    const content = { ...missionContentFixture(), version: 7 }

    expect(prepareForSave(content).version).toBe(7)
  })
})

describe('probabilidad de que aparezca un Máster en una partida', () => {
  it('con un Máster y un momento es su probabilidad', () => {
    expect(masterChanceOf(master([0.15], [2]))).toBeCloseTo(0.15)
  })

  it('cada momento es otra oportunidad', () => {
    expect(masterChanceOf(master([0.15], [1, 2]))).toBeCloseTo(0.2775)
  })

  it('con varios Máster sale como mucho uno por momento', () => {
    expect(masterChanceOf(master([0.1, 0.2], [2]))).toBeCloseTo(0.28)
  })

  it('un Máster sin probabilidad general no cuenta', () => {
    expect(masterChanceOf(master([undefined], [2]))).toBe(0)
  })
})

describe('identificadores y plantillas', () => {
  it('uniqueRef añade un número cuando el identificador está ocupado', () => {
    expect(uniqueRef('lobo', new Set())).toBe('lobo')
    expect(uniqueRef('lobo', new Set(['lobo']))).toBe('lobo-2')
    expect(uniqueRef('lobo', new Set(['lobo', 'lobo-2']))).toBe('lobo-3')
    expect(uniqueRef('', new Set())).toBe('elemento')
  })

  it('slugify quita tildes y espacios', () => {
    expect(slugify('  Guardián de Piedra!  ')).toBe('guardian-de-piedra')
  })

  it('damageOf lee el daño numérico como fijo', () => {
    expect(damageOf(3)).toEqual({ mode: 'FIXED', amount: 3 })
    expect(damageOf({ mode: 'DICE', count: 1, sides: 6 })).toEqual({
      mode: 'DICE',
      count: 1,
      sides: 6,
    })
  })

  it('una misión nueva es válida, está sin publicar y no pisa un identificador', () => {
    const taken = new Set(['msn_nueva_mision'])

    const mission = newMission(taken)

    expect(mission.missionId).toBe('msn_nueva_mision-2')
    expect(mission.active).toBe(false)
    expect(validateMissionContent(mission, { isNew: true, takenIds: taken })).toEqual({})
    expect(appearancesOf(mission).get('esbirro')).toBe(3)
  })

  it('duplicar copia la misión sin publicar, con otro identificador y otro nombre', () => {
    const source = missionContentFixture()

    const copy = duplicateMission(source, new Set([source.missionId]))

    expect(copy).toMatchObject({
      missionId: 'msn_templo_olvidado_copia',
      name: 'El templo olvidado (copia)',
      active: false,
    })
    expect(copy.enemies).toEqual(source.enemies)
    expect(copy.enemies).not.toBe(source.enemies)
  })
})
