import { describe, expect, it } from 'vitest'

import {
  ANA,
  attackRejected,
  basicAttackResolved,
  battle,
  BRUNO,
  combatBattle,
  MISS,
  RESOLUTION,
  ROOM_ID,
  withCombatants,
} from './fixtures'
import {
  isBasicAttackResolvedMessage,
  isBattleEventMessage,
  isBattleView,
  isCommandRejectedMessage,
} from './types'

/** Ataque de Bruno (B/0) a Ana (A/0): Ana pasa de 44 a 38 y el turno es de Ana. */
const valid = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  ...basicAttackResolved({
    seq: 2,
    commandId: 'cmd-1',
    attacker: BRUNO,
    target: ANA,
    before: 44,
    after: 38,
    view: combatBattle(1, [
      [44, 44],
      [38, 44],
    ]),
  }),
  ...overrides,
})

const withResolution = (patch: Record<string, unknown>): Record<string, unknown> =>
  valid({ resolution: { ...RESOLUTION, ...patch } })

describe('BattleView.combatants (HU-18) — Vida en un unico sitio, coherente con la cola', () => {
  it('acepta la Vida en el mismo orden que la cola', () => {
    expect(isBattleView(combatBattle())).toBe(true)
  })

  it('una batalla sin `combatants` (Combat anterior a HU-18) sigue siendo valida', () => {
    expect(isBattleView(battle())).toBe(true)
  })

  it('una batalla con `combatants: []` (iniciada antes de HU-18) es valida', () => {
    expect(isBattleView({ ...battle(), combatants: [] })).toBe(true)
  })

  it('un participante sin perfil (`health: null`, p. ej. IA) es valido', () => {
    expect(isBattleView(withCombatants(battle(), [null, [44, 44]]))).toBe(true)
  })

  it.each([
    [
      'Vida mayor que la maxima',
      [
        [45, 44],
        [44, 44],
      ],
    ],
    [
      'Vida negativa',
      [
        [-1, 44],
        [44, 44],
      ],
    ],
    [
      'Vida decimal',
      [
        [43.5, 44],
        [44, 44],
      ],
    ],
    [
      'maxima cero',
      [
        [0, 0],
        [44, 44],
      ],
    ],
    [
      'maxima decimal',
      [
        [10, 44.5],
        [44, 44],
      ],
    ],
  ] as const)('rechaza %s', (_name, health) => {
    expect(isBattleView(withCombatants(battle(), health))).toBe(false)
  })

  it('rechaza `combatants` que no es un arreglo o con elementos que no son participantes', () => {
    expect(isBattleView({ ...battle(), combatants: 'x' })).toBe(false)
    expect(isBattleView({ ...battle(), combatants: [null, null] })).toBe(false)
    expect(
      isBattleView({
        ...battle(),
        combatants: [
          { teamLabel: 'B', seat: 0 },
          { teamLabel: 'A', seat: 0 },
        ],
      }),
    ).toBe(false)
  })

  it('rechaza `combatants` con distinta longitud que la cola o en otro orden', () => {
    const complete = combatBattle()
    const [first] = complete.combatants ?? []

    expect(isBattleView({ ...complete, combatants: first === undefined ? [] : [first] })).toBe(
      false,
    )
    expect(
      isBattleView({ ...complete, combatants: [...(complete.combatants ?? [])].reverse() }),
    ).toBe(false)
  })
})

describe('basicAttackResolved (HU-18) — validacion estricta, campo por campo', () => {
  it('acepta la forma exacta del contrato v1', () => {
    expect(isBasicAttackResolvedMessage(valid())).toBe(true)
    expect(isBattleEventMessage(valid())).toBe(true)
  })

  it('acepta un golpe que no supero la Defensa (sin efecto, sin porcentaje)', () => {
    expect(
      isBasicAttackResolvedMessage(
        valid({ resolution: MISS, targetHealth: { before: 44, after: 44 } }),
      ),
    ).toBe(true)
  })

  it('acepta un efecto del 0 % con dano base `null` (no se tiro el dado)', () => {
    expect(
      isBasicAttackResolvedMessage(
        withResolution({
          effect: 'NO_DAMAGE',
          percent: 0,
          baseDamage: null,
          calculatedDamage: 0,
          appliedDamage: 0,
        }),
      ),
    ).toBe(true)
  })

  it('acepta el limite del 180 % y cada efecto del contrato', () => {
    for (const effect of ['DAMAGE', 'CRITICAL_DAMAGE', 'EVADE', 'RESIST', 'ESCAPE', 'NO_DAMAGE']) {
      expect(isBasicAttackResolvedMessage(withResolution({ effect, percent: 180 }))).toBe(true)
    }
  })

  it.each([
    ['sin commandId', { commandId: undefined }],
    ['commandId vacio', { commandId: '' }],
    ['commandId de mas de 100 caracteres', { commandId: 'x'.repeat(101) }],
    ['commandId que no es cadena', { commandId: 7 }],
    ['seq cero', { seq: 0 }],
    ['seq decimal', { seq: 1.5 }],
    ['roomId vacio', { roomId: '' }],
    ['occurredAt que no es fecha', { occurredAt: 'ayer' }],
    ['completedPosition negativa', { completedPosition: -1 }],
    ['atacante sin seat', { attacker: { teamLabel: 'B' } }],
    ['objetivo que no es objeto', { target: 'A#0' }],
    ['atacante fuera de la cola', { attacker: { teamLabel: 'Z', seat: 9 } }],
    ['objetivo fuera de la cola', { target: { teamLabel: 'A', seat: 3 } }],
    ['sin resolution', { resolution: undefined }],
    ['targetHealth con `after` mayor que `before`', { targetHealth: { before: 10, after: 11 } }],
    ['targetHealth negativa', { targetHealth: { before: 10, after: -1 } }],
    ['targetHealth decimal', { targetHealth: { before: 10.5, after: 9 } }],
    ['sin battle', { battle: undefined }],
    [
      'battle incoherente (currentTurn fuera de la cola)',
      { battle: { ...battle(), currentTurn: { ...battle().currentTurn, position: 9 } } },
    ],
    ['type de otro evento', { type: 'turnAdvanced' }],
  ])('rechaza %s', (_name, patch) => {
    expect(isBasicAttackResolvedMessage(valid(patch))).toBe(false)
  })

  it.each([
    ['golpe efectivo sin efecto', { effect: null }],
    ['golpe efectivo sin porcentaje', { percent: null }],
    ['efecto desconocido', { effect: 'SUPER_CRITICAL' }],
    ['porcentaje por encima de 180', { percent: 181 }],
    ['porcentaje negativo', { percent: -1 }],
    ['porcentaje decimal', { percent: 99.5 }],
    ['Ataque negativo', { attackValue: -1 }],
    ['Defensa decimal', { defenseValue: 10.5 }],
    ['effective que no es booleano', { effective: 'true' }],
    ['dano aplicado mayor que el calculado', { appliedDamage: 7, calculatedDamage: 6 }],
    ['dano aplicado decimal', { appliedDamage: 2.5, calculatedDamage: 6 }],
    ['dano base decimal', { baseDamage: 5.5 }],
  ])('rechaza una resolucion con %s', (_name, patch) => {
    expect(isBasicAttackResolvedMessage(withResolution(patch))).toBe(false)
  })

  it.each([
    ['con efecto', { effect: 'DAMAGE' }],
    ['con porcentaje', { percent: 100 }],
  ])('un golpe NO efectivo %s es incoherente y se rechaza', (_name, patch) => {
    expect(isBasicAttackResolvedMessage(valid({ resolution: { ...MISS, ...patch } }))).toBe(false)
  })

  it('un mensaje malformado no pasa por `isBattleEventMessage` (se ignora, nunca se pinta)', () => {
    expect(isBattleEventMessage(valid({ commandId: undefined }))).toBe(false)
    expect(isBattleEventMessage({ type: 'basicAttackResolved', seq: 2, roomId: ROOM_ID })).toBe(
      false,
    )
  })
})

describe('command.rejected (HU-18) — distingue el comando rechazado', () => {
  it('acepta un rechazo del ataque con `command` y `commandId`', () => {
    const message = attackRejected('NOT_YOUR_TURN', 'cmd-1')

    expect(isCommandRejectedMessage(message)).toBe(true)
    expect(message).toMatchObject({ command: 'attack', commandId: 'cmd-1', code: 'NOT_YOUR_TURN' })
  })

  it('un rechazo de `resume` (HU-17) no trae `command` y sigue siendo valido', () => {
    expect(isCommandRejectedMessage({ type: 'command.rejected', code: 'NOT_A_PARTICIPANT' })).toBe(
      true,
    )
  })

  it('rechaza `command` o `commandId` que no son cadenas', () => {
    expect(isCommandRejectedMessage({ type: 'command.rejected', code: 'X', command: 3 })).toBe(
      false,
    )
    expect(isCommandRejectedMessage({ type: 'command.rejected', code: 'X', commandId: 3 })).toBe(
      false,
    )
  })
})
