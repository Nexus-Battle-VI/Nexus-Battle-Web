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
  MISS,
  snapshot,
  turnAdvanced,
} from './fixtures'
import type { BattleEventMessage, SnapshotMessage } from './types'

const event = (raw: Record<string, unknown>): BattleAction => ({
  type: 'event',
  message: raw as unknown as BattleEventMessage,
})
const snap = (raw: Record<string, unknown>): BattleAction => ({
  type: 'snapshot',
  message: raw as unknown as SnapshotMessage,
})
const run = (
  actions: readonly BattleAction[],
  from: BattleClientState = initialBattleState,
): BattleClientState => actions.reduce(battleReducer, from)

/** Bruno ataca a Ana: 44 -> 38, y el turno pasa a Ana (posicion 1). */
const hit = (seq: number, commandId = 'cmd-1'): Record<string, unknown> =>
  basicAttackResolved({
    seq,
    commandId,
    attacker: BRUNO,
    target: ANA,
    before: 44,
    after: 38,
    view: combatBattle(1, [
      [44, 44],
      [38, 44],
    ]),
  })

/** Estado con la batalla iniciada (seq 1): el punto de partida de cada ataque. */
const started = (): BattleClientState => run([snap(snapshot(1, 'IN_BATTLE', combatBattle(0)))])

describe('battleReducer — basicAttackResolved (HU-18)', () => {
  it('con seq exacto (lastSeq + 1) aplica la Vida y el turno que publica el servidor, sin calcularlos', () => {
    const state = run([event(hit(2))], started())
    const combatants = state.battle?.combatants ?? []

    expect(state.lastSeq).toBe(2)
    expect(state.battle?.turnsCompleted).toBe(1)
    expect(state.battle?.currentTurn.displayName).toBe('Ana')
    expect(combatants.find((entry) => entry.teamLabel === 'A')?.health).toEqual({
      current: 38,
      max: 44,
    })
    expect(combatants.find((entry) => entry.teamLabel === 'B')?.health).toEqual({
      current: 44,
      max: 44,
    })
  })

  it('guarda el ultimo ataque tal como llego (resultado y Vida antes/despues)', () => {
    const state = run([event(hit(2))], started())

    expect(state.lastAttack).toMatchObject({
      seq: 2,
      commandId: 'cmd-1',
      attacker: BRUNO,
      target: ANA,
      targetHealth: { before: 44, after: 38 },
      resolution: { effective: true, effect: 'CRITICAL_DAMAGE', percent: 137, appliedDamage: 6 },
    })
  })

  it('un golpe que no supero la Defensa deja la Vida como el servidor la publica', () => {
    const view = combatBattle(1)
    const state = run(
      [
        event(
          basicAttackResolved({
            seq: 2,
            commandId: 'cmd-1',
            attacker: BRUNO,
            target: ANA,
            resolution: MISS,
            before: 44,
            after: 44,
            view,
          }),
        ),
      ],
      started(),
    )

    expect(state.battle?.combatants?.[1]?.health).toEqual({ current: 44, max: 44 })
    expect(state.lastAttack?.resolution.effective).toBe(false)
    expect(state.battle?.turnsCompleted).toBe(1)
  })

  it('un evento DUPLICADO (mismo seq) se ignora: la Vida no se resta dos veces ni se repite el resultado', () => {
    const once = run([event(hit(2))], started())
    const twice = run([event(hit(2))], once)

    expect(twice).toBe(once)
    expect(twice.battle?.combatants?.[1]?.health?.current).toBe(38)
    expect(twice.battle?.turnsCompleted).toBe(1)
  })

  it('un evento VIEJO (seq anterior) se ignora y no retrocede la Vida ni el turno', () => {
    const state = run([event(hit(2)), event(turnAdvanced(2, 3))], started())
    const stale = run([event(hit(2, 'cmd-viejo'))], state)

    expect(stale).toBe(state)
    expect(stale.lastSeq).toBe(3)
    expect(stale.lastAttack?.commandId).toBe('cmd-1')
  })

  it('un SALTO de seq NO se aplica (ni Vida, ni turno, ni resultado): marca needsResync', () => {
    const before = started()
    const state = run([event(hit(4))], before)

    expect(state.needsResync).toBe(true)
    expect(state.lastSeq).toBe(1)
    expect(state.battle).toBe(before.battle)
    expect(state.lastAttack).toBeNull()
  })

  it('un snapshot reemplaza la Vida y descarta el ultimo ataque (una instantanea no trae acciones)', () => {
    const attacked = run([event(hit(2))], started())
    const after = run(
      [
        snap(
          snapshot(
            5,
            'IN_BATTLE',
            combatBattle(4, [
              [10, 44],
              [12, 44],
            ]),
          ),
        ),
      ],
      attacked,
    )

    expect(after.lastSeq).toBe(5)
    expect(after.lastAttack).toBeNull()
    expect(after.battle?.combatants?.map((entry) => entry.health?.current)).toEqual([10, 12])
  })

  it('un turnAdvanced posterior conserva el ultimo ataque (el resultado sigue siendo el ultimo)', () => {
    const state = run([event(hit(2)), event(turnAdvanced(2, 3))], started())

    expect(state.lastSeq).toBe(3)
    expect(state.lastAttack?.commandId).toBe('cmd-1')
  })

  it('dos ataques consecutivos: el segundo reemplaza al primero y la Vida sigue lo que publica el servidor', () => {
    const second = basicAttackResolved({
      seq: 3,
      commandId: 'cmd-2',
      attacker: ANA,
      target: BRUNO,
      before: 44,
      after: 30,
      view: combatBattle(2, [
        [30, 44],
        [38, 44],
      ]),
      resolution: {
        ...MISS,
        effective: true,
        effect: 'DAMAGE',
        percent: 100,
        baseDamage: 14,
        calculatedDamage: 14,
        appliedDamage: 14,
        attackValue: 15,
      },
      completedPosition: 1,
    })
    const state = run([event(hit(2)), event(second)], started())

    expect(state.lastAttack?.commandId).toBe('cmd-2')
    expect(state.battle?.combatants?.map((entry) => entry.health?.current)).toEqual([30, 38])
    expect(state.battle?.currentTurn.displayName).toBe('Bruno')
  })
})
