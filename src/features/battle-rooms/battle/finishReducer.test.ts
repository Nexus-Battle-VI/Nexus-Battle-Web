import { describe, expect, it } from 'vitest'

import { battleReducer, initialBattleState, type BattleClientState } from './battleReducer'
import {
  basicAttackResolved,
  battle,
  battleFinished,
  BRUNO,
  noWinnerResult,
  RESOLUTION,
  turnTimedOut,
  winResult,
  withCombatants,
} from './fixtures'
import type { BattleEventMessage, BattleFinishedMessage, TurnTimedOutMessage } from './types'

/**
 * HU-21 en el reductor: el resultado y el turno perdido entran por `seq` como
 * cualquier evento; tras `FINISHED` no se aplica nada mas. Web no calcula el
 * resultado: lo copia del mensaje.
 */
const started = (lastSeq = 1): BattleClientState => ({
  ...initialBattleState,
  roomStatus: 'IN_BATTLE',
  battle: battle(),
  lastSeq,
  synced: true,
})

const finishedMessage = (seq = 3): BattleFinishedMessage =>
  battleFinished(winResult(), battle(), seq) as unknown as BattleFinishedMessage

const timeoutMessage = (seq = 2): TurnTimedOutMessage =>
  turnTimedOut(battle(1), seq) as unknown as TurnTimedOutMessage

describe('battleReducer — battleFinished (HU-21)', () => {
  it('aplica el resultado, deja la sala FINISHED y avanza el seq', () => {
    const state = battleReducer(started(2), { type: 'event', message: finishedMessage(3) })

    expect(state.roomStatus).toBe('FINISHED')
    expect(state.result).toEqual(winResult())
    expect(state.lastSeq).toBe(3)
    expect(state.battle).toEqual(battle())
  })

  it('un duplicado (mismo seq) se ignora', () => {
    const once = battleReducer(started(2), { type: 'event', message: finishedMessage(3) })
    const twice = battleReducer(once, { type: 'event', message: finishedMessage(3) })

    expect(twice).toBe(once)
  })

  it('un salto de seq pide resync en lugar de aplicar el final', () => {
    const state = battleReducer(started(1), { type: 'event', message: finishedMessage(5) })

    expect(state.needsResync).toBe(true)
    expect(state.result).toBeNull()
    expect(state.roomStatus).toBe('IN_BATTLE')
  })

  it('NINGUN evento posterior al final se aplica', () => {
    const finished = battleReducer(started(2), { type: 'event', message: finishedMessage(3) })
    const later = battleReducer(finished, {
      type: 'event',
      message: timeoutMessage(4),
    })

    expect(later).toBe(finished)
  })

  it('un NO_WINNER tambien cierra con su resultado tal cual', () => {
    const state = battleReducer(started(2), {
      type: 'event',
      message: battleFinished(noWinnerResult(), battle(), 3) as unknown as BattleFinishedMessage,
    })

    expect(state.result?.outcome).toBe('NO_WINNER')
  })
})

describe('battleReducer — turnTimedOut (HU-21)', () => {
  it('reemplaza la vista, guarda el turno perdido y NO finaliza', () => {
    const state = battleReducer(started(1), { type: 'event', message: timeoutMessage(2) })

    expect(state.roomStatus).toBe('IN_BATTLE')
    expect(state.battle).toEqual(battle(1))
    expect(state.lastTurnTimeout).toEqual({
      seq: 2,
      timedOut: BRUNO,
      occurredAt: '2026-09-21T10:00:30.000Z',
    })
    expect(state.result).toBeNull()
  })

  it('un duplicado se ignora y un salto pide resync', () => {
    const once = battleReducer(started(1), { type: 'event', message: timeoutMessage(2) })

    expect(battleReducer(once, { type: 'event', message: timeoutMessage(2) })).toBe(once)
    expect(
      battleReducer(started(1), { type: 'event', message: timeoutMessage(4) }).needsResync,
    ).toBe(true)
  })
})

describe('battleReducer — secuencia letal y snapshot (HU-21)', () => {
  it('accion letal (seq n) + battleFinished (n + 1): el ultimo golpe y el resultado quedan coherentes', () => {
    const hit = basicAttackResolved({
      seq: 2,
      view: withCombatants(battle(1), [
        [40, 40],
        [0, 44],
      ]),
      commandId: 'cmd-letal',
      attacker: BRUNO,
      target: { teamLabel: 'A', seat: 0 },
      before: 5,
      after: 0,
      resolution: RESOLUTION,
    }) as unknown as BattleEventMessage

    const afterHit = battleReducer(started(1), { type: 'event', message: hit })
    const finished = battleReducer(afterHit, { type: 'event', message: finishedMessage(3) })

    expect(finished.lastAttack?.commandId).toBe('cmd-letal')
    expect(finished.result).toEqual(winResult())
    expect(finished.roomStatus).toBe('FINISHED')
  })

  it('el snapshot fija el resultado y limpia acciones y turno perdido', () => {
    const withAction = battleReducer(started(1), { type: 'event', message: timeoutMessage(2) })
    const snapshot = battleReducer(withAction, {
      type: 'snapshot',
      message: {
        type: 'snapshot',
        roomId: 'sala',
        seq: 5,
        status: 'FINISHED',
        battle: battle(),
        result: winResult(),
      },
    })

    expect(snapshot.result).toEqual(winResult())
    expect(snapshot.roomStatus).toBe('FINISHED')
    expect(snapshot.lastAttack).toBeNull()
    expect(snapshot.lastSkill).toBeNull()
    expect(snapshot.lastTurnTimeout).toBeNull()
    expect(snapshot.lastSeq).toBe(5)
  })

  it('el snapshot de una sala en curso deja el resultado en null', () => {
    const snapshot = battleReducer(initialBattleState, {
      type: 'snapshot',
      message: {
        type: 'snapshot',
        roomId: 'sala',
        seq: 2,
        status: 'IN_BATTLE',
        battle: battle(),
        result: null,
      },
    })

    expect(snapshot.result).toBeNull()
  })
})
