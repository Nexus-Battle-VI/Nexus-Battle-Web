import { describe, expect, it } from 'vitest'

import type { ProgressEntry } from '../missionPlayApi'
import { enemySpriteFor, roleSprites } from '../missionsRemasterAssets'
import { advanceStage, initialStage, stageAt } from './stage'

const LOG: readonly ProgressEntry[] = [
  { seq: 1, turn: 0, kind: 'ENCOUNTER_STARTED', encounter: 1, boss: false },
  {
    seq: 2,
    turn: 0,
    kind: 'ENEMY_APPEARED',
    enemy: 'Sombras Corrompidas',
    role: 'ENEMY',
    maxHealth: 8,
    enemyHealth: 8,
  },
  {
    seq: 3,
    turn: 1,
    kind: 'HERO_ACTION',
    enemy: 'Sombras Corrompidas',
    role: 'ENEMY',
    ability: null,
    hit: true,
    damage: 5,
    critical: true,
    enemyHealth: 3,
  },
  {
    seq: 4,
    turn: 1,
    kind: 'ENEMY_ACTION',
    enemy: 'Sombras Corrompidas',
    role: 'ENEMY',
    hit: true,
    damage: 2,
    enraged: true,
    heroHealth: 38,
  },
  { seq: 5, turn: 2, kind: 'DEFEATED', enemy: 'Sombras Corrompidas', role: 'ENEMY' },
  { seq: 6, turn: 2, kind: 'MISSION_FINISHED', victory: true },
]

describe('estado del diorama (remaster EN-031)', () => {
  it('copia cada cifra de la bitacora: no calcula dano ni vida', () => {
    const afterStrike = stageAt(LOG, 3, 40)

    expect(afterStrike.encounter).toBe(1)
    expect(afterStrike.enemy).toMatchObject({
      name: 'Sombras Corrompidas',
      maxHealth: 8,
      health: 3,
    })
    expect(afterStrike.heroHealth).toBe(40)
    expect(afterStrike.beat).toMatchObject({
      seq: 3,
      kind: 'heroStrike',
      damage: 5,
      critical: true,
    })

    const afterHit = stageAt(LOG, 4, 40)
    expect(afterHit.heroHealth).toBe(38)
    expect(afterHit.enemy?.enraged).toBe(true)
    expect(afterHit.beat?.kind).toBe('enemyStrike')
  })

  it('marca la derrota y el desenlace tal como los publica Missions', () => {
    const finished = stageAt(LOG, LOG.length, 40)

    expect(finished.enemy?.defeated).toBe(true)
    expect(finished.outcome).toBe('victory')
    expect(finished.beat?.kind).toBe('finish')
    expect(
      advanceStage(initialStage(10), { seq: 9, turn: 9, kind: 'MISSION_FINISHED', victory: false })
        .outcome,
    ).toBe('defeat')
  })

  it('un golpe fallido, un escudo y una habilidad sin ataque son momentos distintos', () => {
    const base = stageAt(LOG, 2, 40)

    expect(
      advanceStage(base, { seq: 7, turn: 3, kind: 'HERO_ACTION', hit: false }).beat?.kind,
    ).toBe('heroMiss')
    expect(
      advanceStage(base, { seq: 8, turn: 3, kind: 'HERO_ACTION', attacked: false, ability: 'Rezo' })
        .beat?.kind,
    ).toBe('heroAbility')
    expect(advanceStage(base, { seq: 9, turn: 3, kind: 'ENEMY_GUARDED' }).beat?.kind).toBe('guard')
  })

  it('si la entrada nombra a otro enemigo, lo pone en escena', () => {
    const next = advanceStage(stageAt(LOG, 2, 40), {
      seq: 10,
      turn: 4,
      kind: 'ENEMY_ACTION',
      enemy: 'Sombra del Olvido',
      role: 'MASTER',
      hit: false,
    })

    expect(next.enemy).toMatchObject({ name: 'Sombra del Olvido', role: 'MASTER' })
  })
})

describe('sprites de los enemigos', () => {
  it('un nombre conocido tiene su propio arte', () => {
    expect(enemySpriteFor('Guardianes de Piedra', 'ENEMY').idle).toMatch(/guardianes-de-piedra/u)
  })

  it('un enemigo nuevo creado desde el editor usa el arte de su rol', () => {
    expect(enemySpriteFor('Criatura inventada', 'BOSS')).toBe(roleSprites.BOSS)
    expect(enemySpriteFor(undefined, undefined)).toBe(roleSprites.ENEMY)
  })
})
