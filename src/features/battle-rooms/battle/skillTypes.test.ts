import { describe, expect, it } from 'vitest'

import {
  ALL_IN,
  ANA,
  basicAttackResolved,
  battle,
  BRUNO,
  combatBattle,
  degradedAttackResolved,
  recharging,
  RESOLUTION,
  SHIELD_STRIKE,
  skillBattle,
  skillRejected,
  skillUsed,
  STONE_HAND,
  withSkills,
} from './fixtures'
import {
  isBasicAttackResolvedMessage,
  isBattleEventMessage,
  isBattleView,
  isCommandRejectedMessage,
  isSkillUsedMessage,
  isSnapshotMessage,
} from './types'

/** Ana (A/0) usa Golpe con escudo contra Bruno (B/0): Poder 10 -> 8, Bruno 44 -> 38, turno de Bruno. */
const valid = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  ...skillUsed({
    seq: 2,
    commandId: 'cmd-1',
    actor: ANA,
    target: BRUNO,
    power: { before: 10, after: 8 },
    before: 44,
    after: 38,
    view: skillBattle(2, [
      [38, 44],
      [44, 44],
    ]),
  }),
  ...overrides,
})

const withSkill = (patch: Record<string, unknown>): Record<string, unknown> =>
  valid({
    skill: {
      abilityId: SHIELD_STRIKE.abilityId,
      name: SHIELD_STRIKE.name,
      powerCost: SHIELD_STRIKE.powerCost,
      chargeTurns: SHIELD_STRIKE.chargeTurns,
      ...patch,
    },
  })

describe('BattleView.combatants (HU-19) — Poder y habilidades, opcionales y coherentes', () => {
  it('acepta el Poder y las habilidades de cada participante', () => {
    expect(isBattleView(skillBattle())).toBe(true)
  })

  it('un Combat anterior a HU-19 (sin `power` ni `skills`) sigue siendo valido', () => {
    expect(isBattleView(combatBattle())).toBe(true)
  })

  it('un participante sin perfil (`power: null`, `skills: []`) es valido', () => {
    expect(isBattleView(withSkills(combatBattle(), [null, null]))).toBe(true)
  })

  it('las tres formas de estado y los dos modos de costo son validos', () => {
    const view = withSkills(combatBattle(), [
      { power: [10, 10], skills: [SHIELD_STRIKE, ALL_IN] },
      { power: [0, 0], skills: [recharging(SHIELD_STRIKE, 1), STONE_HAND] },
    ])

    expect(isBattleView(view)).toBe(true)
  })

  it('un maximo de Poder 0 con 0 actual es valido (heroe sin Poder)', () => {
    expect(isBattleView(withSkills(combatBattle(), [{ power: [0, 0], skills: [] }, null]))).toBe(
      true,
    )
  })

  const withPower = (power: unknown): unknown => {
    const view = skillBattle()

    return {
      ...view,
      combatants: view.combatants?.map((combatant, index) =>
        index === 0 ? { ...combatant, power } : combatant,
      ),
    }
  }

  const withSkillsOf = (skills: unknown): unknown => {
    const view = skillBattle()

    return {
      ...view,
      combatants: view.combatants?.map((combatant, index) =>
        index === 0 ? { ...combatant, skills } : combatant,
      ),
    }
  }

  it.each([
    ['Poder actual mayor que el maximo', { current: 11, max: 10 }],
    ['Poder negativo', { current: -1, max: 10 }],
    ['Poder fraccionario', { current: 1.5, max: 10 }],
    ['Poder como cadena', { current: '5', max: 10 }],
    ['Poder sin maximo', { current: 5 }],
    ['Poder que no es un objeto', 5],
  ])('rechaza %s', (_name, power) => {
    expect(isBattleView(withPower(power))).toBe(false)
  })

  it.each([
    ['habilidades que no son un arreglo', 'todas'],
    ['una habilidad nula', [null]],
    ['una habilidad sin nombre', [{ ...SHIELD_STRIKE, name: '' }]],
    ['una habilidad sin abilityId', [{ ...SHIELD_STRIKE, abilityId: '' }]],
    ['un estado desconocido', [{ ...SHIELD_STRIKE, status: 'BROKEN' }]],
    ['costo fijo de 0', [{ ...SHIELD_STRIKE, powerCost: { mode: 'FIXED', amount: 0 } }]],
    ['costo fijo fraccionario', [{ ...SHIELD_STRIKE, powerCost: { mode: 'FIXED', amount: 1.5 } }]],
    ['costo fijo sin monto', [{ ...SHIELD_STRIKE, powerCost: { mode: 'FIXED' } }]],
    ['un modo de costo desconocido', [{ ...SHIELD_STRIKE, powerCost: { mode: 'HALF' } }]],
    [
      'costo de todo el Poder con monto',
      [{ ...ALL_IN, powerCost: { mode: 'ALL_AVAILABLE', amount: 3 } }],
    ],
    ['recarga de 0 turnos', [{ ...SHIELD_STRIKE, chargeTurns: 0 }]],
    ['recarga restante negativa', [{ ...SHIELD_STRIKE, cooldownRemaining: -1 }]],
    ['disponible con recarga pendiente', [{ ...SHIELD_STRIKE, cooldownRemaining: 1 }]],
    ['en recarga sin turnos pendientes', [{ ...SHIELD_STRIKE, status: 'RECHARGING' }]],
    [
      'dos habilidades con el mismo abilityId',
      [SHIELD_STRIKE, { ...STONE_HAND, abilityId: SHIELD_STRIKE.abilityId }],
    ],
  ])('rechaza %s', (_name, skills) => {
    expect(isBattleView(withSkillsOf(skills))).toBe(false)
  })

  it('CONTROL: la misma vista con habilidades validas SI se acepta (los rechazos no son por otra causa)', () => {
    expect(isBattleView(withSkillsOf([SHIELD_STRIKE, STONE_HAND]))).toBe(true)
  })
})

describe('skillUsed (HU-19) — validacion estricta del evento', () => {
  it('acepta un evento con la forma del contrato v1', () => {
    expect(isSkillUsedMessage(valid())).toBe(true)
    expect(isBattleEventMessage(valid())).toBe(true)
  })

  it('acepta un golpe que no supera la Defensa, un bono de Dano nulo y un bono de Ataque de 0', () => {
    expect(
      isSkillUsedMessage(
        valid({
          resolution: {
            attackValue: 11,
            defenseValue: 11,
            effective: false,
            effect: null,
            percent: null,
            baseDamage: null,
            calculatedDamage: 0,
            appliedDamage: 0,
          },
          bonus: { attack: 0, damage: null },
        }),
      ),
    ).toBe(true)
  })

  it('acepta un costo de todo el Poder y el Poder que baja a 0', () => {
    expect(
      isSkillUsedMessage(
        valid({
          skill: {
            abilityId: ALL_IN.abilityId,
            name: ALL_IN.name,
            powerCost: ALL_IN.powerCost,
            chargeTurns: ALL_IN.chargeTurns,
          },
          power: { before: 10, after: 0 },
        }),
      ),
    ).toBe(true)
  })

  it.each([
    ['sin seq', { seq: undefined }],
    ['seq 0', { seq: 0 }],
    ['sin commandId', { commandId: undefined }],
    ['commandId vacio', { commandId: '' }],
    ['sin actor', { actor: undefined }],
    ['actor con asiento negativo', { actor: { teamLabel: 'A', seat: -1 } }],
    ['sin objetivo', { target: undefined }],
    ['sin skill', { skill: undefined }],
    ['skill que no es un objeto', { skill: 'golpe' }],
    ['sin power', { power: undefined }],
    ['Poder que SUBE al pagar', { power: { before: 8, after: 10 } }],
    ['Poder fraccionario', { power: { before: 10, after: 7.5 } }],
    ['sin cooldown', { cooldown: undefined }],
    ['recarga negativa', { cooldown: { remainingTurns: -1 } }],
    ['recarga fraccionaria', { cooldown: { remainingTurns: 0.5 } }],
    ['sin bonus', { bonus: undefined }],
    ['bono de Ataque negativo', { bonus: { attack: -1, damage: null } }],
    ['bono de Dano fraccionario', { bonus: { attack: 0, damage: 1.5 } }],
    ['bono de Dano indefinido', { bonus: { attack: 0 } }],
    ['sin resolution', { resolution: undefined }],
    ['sin targetHealth', { targetHealth: undefined }],
    ['sin battle', { battle: undefined }],
    ['un actor que no esta en la cola', { actor: { teamLabel: 'Z', seat: 0 } }],
    ['un objetivo que no esta en la cola', { target: { teamLabel: 'Z', seat: 0 } }],
  ])('rechaza un evento %s', (_name, patch) => {
    expect(isSkillUsedMessage(valid(patch))).toBe(false)
    expect(isBattleEventMessage(valid(patch))).toBe(false)
  })

  it.each([
    ['sin abilityId', { abilityId: '' }],
    ['sin nombre', { name: '' }],
    ['costo fijo de 0', { powerCost: { mode: 'FIXED', amount: 0 } }],
    ['costo desconocido', { powerCost: { mode: 'GRATIS' } }],
    ['recarga de 0', { chargeTurns: 0 }],
  ])('rechaza una skill %s', (_name, patch) => {
    expect(isSkillUsedMessage(withSkill(patch))).toBe(false)
  })

  it('rechaza una resolucion incoherente (la misma guarda que el ataque basico)', () => {
    expect(isSkillUsedMessage(valid({ resolution: { ...RESOLUTION, appliedDamage: -1 } }))).toBe(
      false,
    )
    expect(isSkillUsedMessage(valid({ resolution: { ...RESOLUTION, effect: 'TELEPORT' } }))).toBe(
      false,
    )
  })

  it('rechaza un `battle` cuyo estado de habilidades es invalido', () => {
    const view = skillBattle(2)
    const broken = {
      ...view,
      combatants: view.combatants?.map((combatant) => ({
        ...combatant,
        power: { current: 99, max: 10 },
      })),
    }

    expect(isSkillUsedMessage(valid({ battle: broken }))).toBe(false)
  })

  it('CONTROL: el evento valido de base sigue aceptandose', () => {
    expect(isSkillUsedMessage(valid())).toBe(true)
  })

  it('un basicAttackResolved NO es un skillUsed, ni al reves', () => {
    const attack = basicAttackResolved({
      seq: 2,
      commandId: 'cmd-1',
      attacker: BRUNO,
      target: ANA,
      before: 44,
      after: 38,
      view: combatBattle(1),
    })

    expect(isSkillUsedMessage(attack)).toBe(false)
    expect(isBasicAttackResolvedMessage(valid())).toBe(false)
  })

  it('el snapshot con Poder y habilidades es valido y sin ellos tambien', () => {
    expect(
      isSnapshotMessage({
        type: 'snapshot',
        roomId: valid().roomId,
        seq: 4,
        status: 'IN_BATTLE',
        battle: skillBattle(),
      }),
    ).toBe(true)
    expect(
      isSnapshotMessage({
        type: 'snapshot',
        roomId: valid().roomId,
        seq: 4,
        status: 'IN_BATTLE',
        battle: battle(),
      }),
    ).toBe(true)
  })
})

describe('basicAttackResolved.degradedFrom (HU-19, HU-11) — Poder insuficiente', () => {
  const degraded = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    ...degradedAttackResolved({
      seq: 3,
      commandId: 'cmd-1',
      abilityId: SHIELD_STRIKE.abilityId,
      attacker: BRUNO,
      target: ANA,
      before: 44,
      after: 38,
      view: skillBattle(1, [
        [44, 44],
        [38, 44],
      ]),
    }),
    ...overrides,
  })

  it('un ataque degradado con `degradedFrom` exacto es valido', () => {
    expect(isBasicAttackResolvedMessage(degraded())).toBe(true)
    expect(isBattleEventMessage(degraded())).toBe(true)
  })

  it('un ataque normal (sin `degradedFrom`) sigue siendo valido', () => {
    expect(isBasicAttackResolvedMessage(degraded({ degradedFrom: undefined }))).toBe(true)
  })

  it.each([
    ['otro comando', { command: 'attack', abilityId: 'x', reason: 'INSUFFICIENT_POWER' }],
    ['otra razon', { command: 'useSkill', abilityId: 'x', reason: 'ON_COOLDOWN' }],
    ['sin abilityId', { command: 'useSkill', reason: 'INSUFFICIENT_POWER' }],
    ['abilityId vacio', { command: 'useSkill', abilityId: '', reason: 'INSUFFICIENT_POWER' }],
    [
      'claves de mas',
      { command: 'useSkill', abilityId: 'x', reason: 'INSUFFICIENT_POWER', power: 0 },
    ],
    ['un texto', 'INSUFFICIENT_POWER'],
    ['nulo', null],
  ])('rechaza `degradedFrom` con %s', (_name, degradedFrom) => {
    expect(isBasicAttackResolvedMessage(degraded({ degradedFrom }))).toBe(false)
  })
})

describe('command.rejected de useSkill (HU-19)', () => {
  it('lleva `command: useSkill`, el commandId y un codigo estable', () => {
    const message = skillRejected('SKILL_ON_COOLDOWN', 'cmd-9')

    expect(isCommandRejectedMessage(message)).toBe(true)
    expect(message).toEqual({
      type: 'command.rejected',
      command: 'useSkill',
      commandId: 'cmd-9',
      code: 'SKILL_ON_COOLDOWN',
    })
  })
})
