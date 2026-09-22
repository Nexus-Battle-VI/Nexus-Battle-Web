import { describe, expect, it } from 'vitest'

import {
  battleReducer,
  initialBattleState,
  type BattleAction,
  type BattleClientState,
} from './battleReducer'
import { battle, battleStarted, snapshot, turnAdvanced } from './fixtures'
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

describe('battleReducer — el cliente solo aplica lo que el servidor publica, en orden de seq', () => {
  it('estado inicial: sin batalla, sin secuencia y sin sincronizar', () => {
    expect(initialBattleState).toEqual({
      roomStatus: null,
      battle: null,
      lastSeq: 0,
      synced: false,
      needsResync: false,
      lastAttack: null,
      lastSkill: null,
      result: null,
      lastTurnTimeout: null,
    })
  })

  it('un snapshot reemplaza el estado por el visible del servidor', () => {
    const state = run([snap(snapshot(4, 'IN_BATTLE', battle(3)))])

    expect(state).toMatchObject({ roomStatus: 'IN_BATTLE', lastSeq: 4, needsResync: false })
    expect(state.battle?.turnsCompleted).toBe(3)
  })

  it('un snapshot de una sala PREPARING no tiene batalla (seq 0)', () => {
    const state = run([snap(snapshot(0, 'PREPARING', null))])

    expect(state).toMatchObject({ roomStatus: 'PREPARING', battle: null, lastSeq: 0 })
  })

  it('battleStarted (seq 1) tras un snapshot PREPARING (seq 0) inicia la batalla', () => {
    const state = run([snap(snapshot(0, 'PREPARING', null)), event(battleStarted())])

    expect(state.roomStatus).toBe('IN_BATTLE')
    expect(state.battle?.currentTurn.displayName).toBe('Bruno')
    expect(state.lastSeq).toBe(1)
  })

  it('los eventos consecutivos avanzan el turno con lo que publica el servidor (no calcula turno + 1)', () => {
    const state = run([
      event(battleStarted()),
      event(turnAdvanced(1, 2)),
      event(turnAdvanced(2, 3)),
    ])

    expect(state.lastSeq).toBe(3)
    expect(state.battle?.turnsCompleted).toBe(2)
    expect(state.battle?.currentTurn.position).toBe(0)
    expect(state.battle?.round).toBe(2)
  })

  it('un seq REPETIDO se ignora: no duplica efectos ni cambia el estado', () => {
    const once = run([event(battleStarted()), event(turnAdvanced(1, 2))])
    const twice = battleReducer(once, event(turnAdvanced(1, 2)))

    expect(twice).toBe(once)
  })

  it('un evento VIEJO (seq anterior) no retrocede el turno', () => {
    const current = run([
      event(battleStarted()),
      event(turnAdvanced(1, 2)),
      event(turnAdvanced(2, 3)),
    ])
    const stale = battleReducer(current, event(turnAdvanced(1, 2)))

    expect(stale).toBe(current)
    expect(stale.battle?.turnsCompleted).toBe(2)
  })

  it('un salto de seq NO se aplica: marca needsResync sin inventar los mensajes perdidos', () => {
    const before = run([event(battleStarted())])
    const after = battleReducer(before, event(turnAdvanced(4, 5)))

    expect(after.battle).toEqual(before.battle)
    expect(after.lastSeq).toBe(1)
    expect(after.needsResync).toBe(true)
  })

  it('un evento fuera de orden llega y tras el resume se aplica el faltante y luego el siguiente', () => {
    const state = run([
      event(battleStarted()),
      event(turnAdvanced(3, 4)), // llega antes que el 2 y el 3: salto
      { type: 'resyncRequested' },
      event(turnAdvanced(1, 2)),
      event(turnAdvanced(2, 3)),
      event(turnAdvanced(3, 4)),
    ])

    expect(state.lastSeq).toBe(4)
    expect(state.battle?.turnsCompleted).toBe(3)
    expect(state.needsResync).toBe(false)
  })

  it('un segundo salto no repite la marca (idempotente)', () => {
    const first = run([event(battleStarted()), event(turnAdvanced(5, 6))])

    expect(battleReducer(first, event(turnAdvanced(6, 7)))).toBe(first)
  })

  it('resyncRequested limpia la marca y deja de estar sincronizado hasta el resume.ok', () => {
    const gap = run([{ type: 'synced' }, event(battleStarted()), event(turnAdvanced(4, 5))])
    const requested = battleReducer(gap, { type: 'resyncRequested' })

    expect(requested).toMatchObject({ needsResync: false, synced: false })
    expect(battleReducer(requested, { type: 'synced' }).synced).toBe(true)
  })

  it('perder la conexion conserva lo ultimo que dijo el servidor y deja de estar sincronizado', () => {
    const live = run([{ type: 'synced' }, event(battleStarted()), event(turnAdvanced(1, 2))])
    const lost = battleReducer(live, { type: 'connectionLost' })

    expect(lost.synced).toBe(false)
    expect(lost.battle).toEqual(live.battle)
    expect(lost.lastSeq).toBe(2)
  })

  it('perder la conexion sin haber sincronizado no cambia nada', () => {
    expect(battleReducer(initialBattleState, { type: 'connectionLost' })).toBe(initialBattleState)
  })

  it('un snapshot posterior (p. ej. tras un refresh) reemplaza el estado y anula un salto pendiente', () => {
    const gap = run([event(battleStarted()), event(turnAdvanced(4, 5))])
    const recovered = battleReducer(gap, snap(snapshot(6, 'IN_BATTLE', battle(5))))

    expect(recovered).toMatchObject({ lastSeq: 6, needsResync: false })
    expect(recovered.battle?.turnsCompleted).toBe(5)
  })

  it('el reductor es puro: no muta el estado de entrada', () => {
    const before = run([event(battleStarted())])
    const frozen = Object.freeze({ ...before })

    expect(() => battleReducer(frozen, event(turnAdvanced(1, 2)))).not.toThrow()
    expect(frozen.lastSeq).toBe(1)
  })
})
