import { describe, expect, it } from 'vitest'

import {
  battleReducer,
  initialBattleState,
  type BattleAction,
  type BattleClientState,
} from './battleReducer'
import {
  ANA,
  basicAttackResolved,
  BRUNO,
  combatBattle,
  degradedAttackResolved,
  MISS,
  recharging,
  SHIELD_STRIKE,
  skillBattle,
  skillUsed,
  snapshot,
  withSkills,
} from './fixtures'
import { isBattleEventMessage, isSnapshotMessage, type BattleEventMessage } from './types'

const asEvent = (raw: Record<string, unknown>): BattleAction => {
  if (!isBattleEventMessage(raw)) {
    throw new Error('el fixture no es un evento valido')
  }

  return { type: 'event', message: raw as BattleEventMessage }
}

const asSnapshot = (raw: Record<string, unknown>): BattleAction => {
  if (!isSnapshotMessage(raw)) {
    throw new Error('el fixture no es una instantanea valida')
  }

  return { type: 'snapshot', message: raw }
}

const run = (actions: readonly BattleAction[], from: BattleClientState = initialBattleState) =>
  actions.reduce(battleReducer, from)

/** Ana (A/0, posicion 1) usa Golpe con escudo contra Bruno: Poder 10 -> 8, Bruno 44 -> 38. */
const anaUsesShield = (seq: number, commandId = 'cmd-1'): Record<string, unknown> =>
  skillUsed({
    seq,
    commandId,
    actor: ANA,
    target: BRUNO,
    power: { before: 10, after: 8 },
    bonus: { attack: 2, damage: 3 },
    before: 44,
    after: 38,
    view: skillBattle(
      2,
      [
        [38, 44],
        [44, 44],
      ],
      [
        { power: [10, 10], skills: [SHIELD_STRIKE] },
        { power: [8, 10], skills: [recharging(SHIELD_STRIKE)] },
      ],
    ),
  })

const inBattle = (): BattleClientState =>
  run([asSnapshot(snapshot(1, 'IN_BATTLE', skillBattle(1))), { type: 'synced' }])

describe('battleReducer — habilidades (HU-19): el cliente solo aplica lo que publica Combat', () => {
  it('skillUsed en seq + 1: reemplaza la vista, avanza el seq y guarda la ultima habilidad TAL CUAL llego', () => {
    const raw = anaUsesShield(2)
    const state = run([asEvent(raw)], inBattle())

    expect(state.lastSeq).toBe(2)
    expect(state.battle).toEqual(raw.battle)
    expect(state.lastSkill).toEqual({
      seq: 2,
      commandId: 'cmd-1',
      actor: ANA,
      target: BRUNO,
      skill: raw.skill,
      power: { before: 10, after: 8 },
      cooldown: { remainingTurns: 1 },
      bonus: { attack: 2, damage: 3 },
      resolution: raw.resolution,
      targetHealth: { before: 44, after: 38 },
    })
    expect(state.lastAttack).toBeNull()
  })

  it('el Poder y la recarga visibles son los del `battle` posterior, sin calcular nada', () => {
    const state = run([asEvent(anaUsesShield(2))], inBattle())
    const ana = state.battle?.combatants?.find((c) => c.teamLabel === 'A')

    expect(ana?.power).toEqual({ current: 8, max: 10 })
    expect(ana?.skills?.[0]).toMatchObject({ status: 'RECHARGING', cooldownRemaining: 1 })
  })

  it('un skillUsed repetido (mismo seq) se IGNORA: no duplica ni cambia lo guardado', () => {
    const once = run([asEvent(anaUsesShield(2))], inBattle())
    const twice = run([asEvent(anaUsesShield(2))], once)

    expect(twice).toBe(once)
  })

  it('un skillUsed anterior al seq actual se IGNORA', () => {
    const state = run([asEvent(anaUsesShield(2))], inBattle())

    expect(run([asEvent(anaUsesShield(1, 'viejo'))], state)).toBe(state)
  })

  it('un salto de seq NO se aplica y pide recuperar con resume', () => {
    const state = run([asEvent(anaUsesShield(3))], inBattle())

    expect(state.needsResync).toBe(true)
    expect(state.lastSeq).toBe(1)
    expect(state.lastSkill).toBeNull()
  })

  it('una instantanea descarta la ultima habilidad y el ultimo ataque (quedarian viejos)', () => {
    const before = run([asEvent(anaUsesShield(2)), asEvent(attackByBruno(3))], inBattle())

    expect(before.lastSkill).not.toBeNull()
    expect(before.lastAttack).not.toBeNull()

    const after = run([asSnapshot(snapshot(3, 'IN_BATTLE', skillBattle(3)))], before)

    expect(after.lastSkill).toBeNull()
    expect(after.lastAttack).toBeNull()
  })

  it('un ataque basico posterior conserva la ultima habilidad (la mas reciente se decide por seq al pintar)', () => {
    const state = run([asEvent(anaUsesShield(2)), asEvent(attackByBruno(3))], inBattle())

    expect(state.lastSkill?.seq).toBe(2)
    expect(state.lastAttack?.seq).toBe(3)
  })

  it('un ataque basico que sustituye a una habilidad conserva `degradedFrom` en lastAttack', () => {
    const state = run(
      [
        asEvent(
          degradedAttackResolved({
            seq: 2,
            commandId: 'cmd-1',
            abilityId: SHIELD_STRIKE.abilityId,
            attacker: ANA,
            target: BRUNO,
            resolution: MISS,
            before: 44,
            after: 44,
            view: skillBattle(2),
          }),
        ),
      ],
      inBattle(),
    )

    expect(state.lastAttack?.degradedFrom).toEqual({
      command: 'useSkill',
      abilityId: SHIELD_STRIKE.abilityId,
      reason: 'INSUFFICIENT_POWER',
    })
    expect(state.lastSkill).toBeNull()
  })

  it('un ataque normal NO arrastra `degradedFrom` de un ataque anterior', () => {
    const degraded = run(
      [
        asEvent(
          degradedAttackResolved({
            seq: 2,
            commandId: 'cmd-1',
            abilityId: SHIELD_STRIKE.abilityId,
            attacker: ANA,
            target: BRUNO,
            before: 44,
            after: 38,
            view: skillBattle(2),
          }),
        ),
      ],
      inBattle(),
    )
    const normal = run([asEvent(attackByBruno(3))], degraded)

    expect(normal.lastAttack).not.toHaveProperty('degradedFrom')
  })

  it('CONTROL: una vista sin `power` ni `skills` (Combat anterior a HU-19) sigue reduciendose', () => {
    const state = run([
      asSnapshot(snapshot(1, 'IN_BATTLE', combatBattle(1))),
      asEvent(
        basicAttackResolved({
          seq: 2,
          commandId: 'cmd-1',
          attacker: ANA,
          target: BRUNO,
          before: 44,
          after: 38,
          view: combatBattle(2),
        }),
      ),
    ])

    expect(state.lastSeq).toBe(2)
    expect(state.lastSkill).toBeNull()
  })

  it('withSkills: el mismo participante conserva Vida y agrega Poder/habilidades (fixture coherente)', () => {
    const view = withSkills(combatBattle(1), [{ power: [3, 10], skills: [SHIELD_STRIKE] }, null])

    expect(view.combatants?.[0]).toMatchObject({
      health: { current: 44, max: 44 },
      power: { current: 3, max: 10 },
    })
    expect(view.combatants?.[1]).toMatchObject({ power: null, skills: [] })
  })
})

/** Bruno ataca a Ana: Ana 44 -> 38. */
function attackByBruno(seq: number): Record<string, unknown> {
  return basicAttackResolved({
    seq,
    commandId: 'cmd-rival',
    attacker: BRUNO,
    target: ANA,
    before: 44,
    after: 38,
    completedPosition: 0,
    view: skillBattle(3, [
      [38, 44],
      [38, 44],
    ]),
  })
}
