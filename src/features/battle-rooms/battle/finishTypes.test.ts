import { describe, expect, it } from 'vitest'

import {
  isBattleFinishedMessage,
  isBattleResult,
  isBattleView,
  isResumeOkMessage,
  isSnapshotMessage,
  isTurnTimedOutMessage,
  type BattleResult,
} from './types'
import {
  battle,
  battleFinished,
  DEADLINES,
  noWinnerResult,
  ROOM_ID,
  turnTimedOut,
  winResult,
  withDeadlines,
} from './fixtures'

/**
 * Validadores de HU-21 (`hu-21-battle-finish-v1.md` §5 y §6): aceptan la forma
 * exacta y RECHAZAN cada incoherencia. Un mensaje mal formado se ignora, nunca
 * se pinta. Web NO recalcula la regla de vida: solo valida forma y coherencia.
 */
const disconnection = (): BattleResult => ({
  ...winResult(),
  reason: 'DISCONNECTION',
  disconnected: { teamLabel: 'B', seat: 0 },
})

const absoluteLife = (): BattleResult => ({
  ...winResult(),
  reason: 'TIME_LIMIT',
  tiebreak: 'ABSOLUTE_LIFE',
})

describe('isBattleResult — acepta los resultados validos (control)', () => {
  it.each([
    ['WIN por eliminacion', winResult()],
    ['NO_WINNER por tiempo', noWinnerResult()],
    ['DISCONNECTION con su desconectado', disconnection()],
    ['TIME_LIMIT con desempate absoluto', absoluteLife()],
  ])('%s', (_label, result) => {
    expect(isBattleResult(result)).toBe(true)
  })
})

describe('isBattleResult — rechaza cada incoherencia', () => {
  const cases: readonly [string, unknown][] = [
    ['una causa desconocida', { ...winResult(), reason: 'SURRENDER' }],
    ['un outcome desconocido', { ...winResult(), outcome: 'DRAW' }],
    ['WIN sin ganador', { ...winResult(), winnerTeamLabel: null }],
    ['WIN con un ganador que no es equipo', { ...winResult(), winnerTeamLabel: 'C' }],
    ['NO_WINNER con ganador', { ...noWinnerResult(), winnerTeamLabel: 'A' }],
    [
      'NO_WINNER con un participante ganador',
      {
        ...noWinnerResult(),
        participants: [
          { ...noWinnerResult().participants[0], result: 'WON' },
          noWinnerResult().participants[1],
        ],
      },
    ],
    ['un instante final invalido', { ...winResult(), finishedAt: 'ayer' }],
    ['solo un equipo', { ...winResult(), teams: [winResult().teams[0]] }],
    [
      'vida restante mayor que la maxima',
      {
        ...winResult(),
        teams: [
          { ...winResult().teams[0], remainingHealth: 45, maxHealth: 44 },
          winResult().teams[1],
        ],
      },
    ],
    [
      'un porcentaje fuera de rango',
      {
        ...winResult(),
        teams: [{ ...winResult().teams[0], lifePercent: 120 }, winResult().teams[1]],
      },
    ],
    ['ningun participante', { ...winResult(), participants: [] }],
    [
      'un participante de un equipo ajeno',
      {
        ...winResult(),
        participants: [
          { ...winResult().participants[0], teamLabel: 'C' },
          winResult().participants[1],
        ],
      },
    ],
    [
      'un resultado de participante desconocido',
      {
        ...winResult(),
        participants: [
          { ...winResult().participants[0], result: 'TIED' },
          winResult().participants[1],
        ],
      },
    ],
    ['DISCONNECTION sin desconectado', { ...disconnection(), disconnected: null }],
    ['ELIMINATION con desconectado', { ...winResult(), disconnected: { teamLabel: 'B', seat: 0 } }],
    ['un desempate en una eliminacion', { ...winResult(), tiebreak: 'LIFE_PERCENT' }],
    ['un desempate desconocido', { ...absoluteLife(), tiebreak: 'COIN_FLIP' }],
  ]

  it.each(cases)('rechaza %s', (_label, value) => {
    expect(isBattleResult(value)).toBe(false)
  })

  it('rechaza una entrada que no es objeto', () => {
    expect(isBattleResult('resultado')).toBe(false)
    expect(isBattleResult(null)).toBe(false)
  })
})

describe('isBattleView — deadlines (HU-21)', () => {
  it('acepta la vista con deadlines validos y sin ellos', () => {
    expect(isBattleView(withDeadlines(battle()))).toBe(true)
    expect(isBattleView(battle())).toBe(true)
  })

  it.each([
    ['un deadline no ISO', { turnEndsAt: 'luego', battleEndsAt: DEADLINES.battleEndsAt }],
    ['solo un deadline', { turnEndsAt: DEADLINES.turnEndsAt }],
    ['deadlines vacios', {}],
  ])('rechaza %s', (_label, deadlines) => {
    expect(isBattleView({ ...battle(), deadlines })).toBe(false)
  })
})

describe('isTurnTimedOutMessage / isBattleFinishedMessage (HU-21)', () => {
  it('acepta los dos eventos validos', () => {
    expect(isTurnTimedOutMessage(turnTimedOut(withDeadlines(battle(1))))).toBe(true)
    expect(isBattleFinishedMessage(battleFinished())).toBe(true)
  })

  it.each([
    ['una posicion negativa', { ...turnTimedOut(), completedPosition: -1 }],
    [
      'un `timedOut` fuera de la cola',
      { ...turnTimedOut(), timedOut: { teamLabel: 'C', seat: 0 } },
    ],
    ['sin vista', { ...turnTimedOut(), battle: null }],
  ])('rechaza `turnTimedOut` con %s', (_label, value) => {
    expect(isTurnTimedOutMessage(value)).toBe(false)
  })

  it.each([
    ['sin resultado', { ...battleFinished(), result: undefined }],
    [
      'con un resultado incoherente',
      { ...battleFinished(), result: { ...winResult(), reason: 'X' } },
    ],
    ['sin seq', { ...battleFinished(), seq: 0 }],
    ['sin vista', { ...battleFinished(), battle: null }],
  ])('rechaza `battleFinished` %s', (_label, value) => {
    expect(isBattleFinishedMessage(value)).toBe(false)
  })
})

describe('snapshot y resume.ok (HU-21)', () => {
  it('acepta el snapshot con resultado, con null y sin el campo', () => {
    expect(
      isSnapshotMessage({
        type: 'snapshot',
        roomId: ROOM_ID,
        seq: 3,
        status: 'FINISHED',
        battle: battle(),
        result: winResult(),
      }),
    ).toBe(true)
    expect(
      isSnapshotMessage({
        type: 'snapshot',
        roomId: ROOM_ID,
        seq: 3,
        status: 'IN_BATTLE',
        battle: battle(),
        result: null,
      }),
    ).toBe(true)
    expect(
      isSnapshotMessage({
        type: 'snapshot',
        roomId: ROOM_ID,
        seq: 3,
        status: 'IN_BATTLE',
        battle: battle(),
      }),
    ).toBe(true)
  })

  it('rechaza el snapshot con un resultado invalido', () => {
    expect(
      isSnapshotMessage({
        type: 'snapshot',
        roomId: ROOM_ID,
        seq: 3,
        status: 'FINISHED',
        battle: battle(),
        result: { ...winResult(), outcome: 'DRAW' },
      }),
    ).toBe(false)
  })

  it('acepta `resume.ok` con serverTime ISO y lo rechaza si no lo es', () => {
    expect(
      isResumeOkMessage({
        type: 'resume.ok',
        roomId: ROOM_ID,
        seq: 3,
        serverTime: DEADLINES.turnEndsAt,
      }),
    ).toBe(true)
    expect(
      isResumeOkMessage({ type: 'resume.ok', roomId: ROOM_ID, seq: 3, serverTime: 'luego' }),
    ).toBe(false)
  })
})
