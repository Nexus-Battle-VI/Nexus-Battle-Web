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

  describe('campo por campo: un tipo incorrecto nunca pasa como TurnOrderEntry', () => {
    const withEntry = (overrides: Record<string, unknown>): Record<string, unknown> => {
      const view = battle()
      const broken = { ...view.turnOrder[0], ...overrides }

      return {
        ...battleStarted(),
        battle: { ...view, turnOrder: [broken, view.turnOrder[1]], currentTurn: broken },
      }
    }

    it('el ejemplo de la revision: displayName numerico y heroSubtype objeto', () => {
      expect(isBattleEventMessage(withEntry({ displayName: 12345, heroSubtype: {} }))).toBe(false)
    })

    it.each([
      ['position negativa', { position: -1 }],
      ['position fraccionaria', { position: 0.5 }],
      ['position como texto', { position: '0' }],
      ['teamLabel vacio', { teamLabel: '' }],
      ['teamLabel numerico', { teamLabel: 7 }],
      ['seat negativo', { seat: -1 }],
      ['playerId numerico', { playerId: 42 }],
      ['HUMAN sin playerId', { playerId: null }],
      ['playerId vacio', { playerId: '' }],
      ['displayName numerico', { displayName: 12345 }],
      ['displayName indefinido', { displayName: undefined }],
      ['heroId objeto', { heroId: {} }],
      ['heroSubtype objeto', { heroSubtype: {} }],
      ['heroSubtype indefinido', { heroSubtype: undefined }],
    ])('rechaza %s', (_case, overrides) => {
      expect(isBattleEventMessage(withEntry(overrides))).toBe(false)
    })

    it('un AI con playerId se rechaza; un AI con nulos se acepta', () => {
      expect(isBattleEventMessage(withEntry({ kind: 'AI', playerId: 'sujeto-x' }))).toBe(false)
      expect(
        isBattleEventMessage(
          withEntry({
            kind: 'AI',
            playerId: null,
            displayName: null,
            heroId: null,
            heroSubtype: null,
          }),
        ),
      ).toBe(true)
    })

    it('un participante correcto sigue pasando', () => {
      expect(isBattleEventMessage(withEntry({}))).toBe(true)
    })
  })

  describe('vista de batalla: forma y coherencia', () => {
    const viewWith = (overrides: Record<string, unknown>): Record<string, unknown> => ({
      ...battle(),
      ...overrides,
    })

    it.each([
      ['sin startedAt', { startedAt: undefined }],
      ['startedAt que no es fecha', { startedAt: 'ayer' }],
      ['startedAt numerico', { startedAt: 12345 }],
      ['battleId vacio', { battleId: '' }],
      ['turnsCompleted negativo', { turnsCompleted: -1 }],
      ['turnsCompleted fraccionario', { turnsCompleted: 1.5 }],
      ['round cero', { round: 0 }],
      ['round como texto', { round: '1' }],
    ])('rechaza %s', (_case, overrides) => {
      expect(isBattleView(viewWith(overrides))).toBe(false)
    })

    it('las posiciones de la cola deben ser 0, 1, 2... en orden', () => {
      const base = battle()
      const shifted = [
        { ...base.turnOrder[0], position: 1 },
        { ...base.turnOrder[1], position: 0 },
      ]

      expect(isBattleView({ ...base, turnOrder: shifted, currentTurn: shifted[0] })).toBe(false)
      expect(isBattleView({ ...base, turnOrder: [base.turnOrder[0], base.turnOrder[0]] })).toBe(
        false,
      )
    })

    it('currentTurn debe ser un participante de turnOrder', () => {
      const base = battle()

      expect(isBattleView({ ...base, currentTurn: entry(0, { playerId: 'sujeto-intruso' }) })).toBe(
        false,
      )
      expect(isBattleView({ ...base, currentTurn: entry(5) })).toBe(false)
      expect(isBattleView({ ...base, currentTurn: base.turnOrder[1] })).toBe(true)
    })

    it('una vista valida pasa', () => {
      expect(isBattleView(battle())).toBe(true)
      expect(isBattleView(battle(3))).toBe(true)
    })
  })

  describe('mensajes del servidor: campos de sobre', () => {
    it('un evento sin occurredAt o con occurredAt invalido se rechaza', () => {
      expect(isBattleEventMessage({ ...battleStarted(), occurredAt: undefined })).toBe(false)
      expect(isBattleEventMessage({ ...battleStarted(), occurredAt: 'nunca' })).toBe(false)
    })

    it('turnAdvanced exige completedPosition entero >= 0', () => {
      expect(isBattleEventMessage({ ...turnAdvanced(1, 2), completedPosition: undefined })).toBe(
        false,
      )
      expect(isBattleEventMessage({ ...turnAdvanced(1, 2), completedPosition: '0' })).toBe(false)
      expect(isBattleEventMessage({ ...turnAdvanced(1, 2), completedPosition: -1 })).toBe(false)
    })

    it('resume.ok y command.rejected exigen sus campos con el tipo correcto', () => {
      expect(isResumeOkMessage({ type: 'resume.ok', roomId: '', seq: 1 })).toBe(false)
      expect(isResumeOkMessage({ type: 'resume.ok', roomId: 'r', seq: -1 })).toBe(false)
      expect(isResumeOkMessage({ type: 'resume.ok', roomId: 'r', seq: 1.5 })).toBe(false)
      expect(isCommandRejectedMessage({ type: 'command.rejected', code: '' })).toBe(false)
      expect(isCommandRejectedMessage({ type: 'command.rejected', code: 7 })).toBe(false)
    })

    it('un snapshot con roomId vacio o status vacio se rechaza', () => {
      expect(isSnapshotMessage({ ...snapshot(0, 'PREPARING', null), roomId: '' })).toBe(false)
      expect(isSnapshotMessage({ ...snapshot(0, '', null) })).toBe(false)
    })
  })

  it('un snapshot con seq negativo o sin status se rechaza', () => {
    expect(isSnapshotMessage({ ...snapshot(0, 'PREPARING', null), seq: -1 })).toBe(false)
    expect(isSnapshotMessage({ ...snapshot(0, 'PREPARING', null), status: undefined })).toBe(false)
  })
})
