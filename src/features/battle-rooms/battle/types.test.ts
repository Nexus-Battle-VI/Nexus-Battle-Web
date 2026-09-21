import { describe, expect, it } from 'vitest'

import { battle, battleStarted, entry, snapshot, turnAdvanced } from './fixtures'
import {
  isBattleEventMessage,
  isBattleView,
  isCommandRejectedMessage,
  isResumeOkMessage,
  isSnapshotMessage,
} from './types'

describe('guardas de tipo del contrato de batalla: un mensaje malformado nunca se pinta', () => {
  it('acepta los mensajes con la forma del contrato v1', () => {
    expect(isBattleEventMessage(battleStarted())).toBe(true)
    expect(isBattleEventMessage(turnAdvanced(1, 2))).toBe(true)
    expect(isSnapshotMessage(snapshot(3, 'IN_BATTLE', battle(2)))).toBe(true)
    expect(isSnapshotMessage(snapshot(0, 'PREPARING', null))).toBe(true)
    expect(isResumeOkMessage({ type: 'resume.ok', roomId: 'r', seq: 3 })).toBe(true)
    expect(isCommandRejectedMessage({ type: 'command.rejected', code: 'NOT_A_PARTICIPANT' })).toBe(
      true,
    )
  })

  it.each([
    ['sin battle', { ...battleStarted(), battle: undefined }],
    ['seq no entero', { ...battleStarted(), seq: 1.5 }],
    ['seq cero', { ...battleStarted(), seq: 0 }],
    ['sin roomId', { ...battleStarted(), roomId: undefined }],
    ['tipo desconocido', { ...battleStarted(), type: 'battleFinished' }],
    ['cola vacia', { ...battleStarted(), battle: { ...battle(), turnOrder: [] } }],
    ['turno actual sin forma', { ...battleStarted(), battle: { ...battle(), currentTurn: 'Ana' } }],
    [
      'participante con kind desconocido',
      { ...battleStarted(), battle: battle(0, [entry(0, { kind: 'BOT' as 'AI' }), entry(1)]) },
    ],
  ])('rechaza un evento %s', (_case, message) => {
    expect(isBattleEventMessage(message)).toBe(false)
  })

  it.each([null, undefined, 'texto', 42, [], {}])(
    'rechaza %p como evento, snapshot y vista',
    (value) => {
      expect(isBattleEventMessage(value)).toBe(false)
      expect(isSnapshotMessage(value)).toBe(false)
      expect(isBattleView(value)).toBe(false)
    },
  )

  it('un snapshot con seq negativo o sin status se rechaza', () => {
    expect(isSnapshotMessage({ ...snapshot(0, 'PREPARING', null), seq: -1 })).toBe(false)
    expect(isSnapshotMessage({ ...snapshot(0, 'PREPARING', null), status: undefined })).toBe(false)
  })
})
