import { describe, expect, it } from 'vitest'

import {
  availableWarning,
  creditAmountText,
  describeOwnStake,
  describeStakeReservation,
  describeStakeStatus,
  ownStakeOf,
  parseStakeInput,
  roomHasStakes,
} from './stakePresentation'
import type { BattleRoom, ParticipantStakeStatus } from '../types'

const roomWith = (
  participants: readonly { readonly playerId: string | null; readonly amount?: number }[],
  stakePoolTotal?: number,
): BattleRoom => ({
  id: '11111111-1111-4111-8111-111111111111',
  mode: 'PVP',
  status: 'WAITING_FOR_PLAYERS',
  teams: [
    {
      label: 'A',
      capacity: 2,
      participants: participants.map((participant) => ({
        kind: 'HUMAN' as const,
        playerId: participant.playerId,
        heroId: null,
        joinedAt: '2026-09-22T10:00:00.000Z',
        ...(participant.amount === undefined
          ? {}
          : { stake: { amount: participant.amount, status: 'ACTIVE' as const } }),
      })),
    },
    { label: 'B', capacity: 2, participants: [] },
  ],
  reward: { amount: 0 },
  createdBy: 'sujeto-ana',
  createdAt: '2026-09-22T10:00:00.000Z',
  version: 1,
  ...(stakePoolTotal === undefined ? {} : { stakePool: { total: stakePoolTotal } }),
})

describe('describeStakeStatus (HU-23)', () => {
  it.each<[ParticipantStakeStatus, string]>([
    ['PENDING_RESERVE', 'Reservando tu apuesta…'],
    ['ACTIVE', 'Apuesta reservada'],
    ['RESERVE_FAILED', 'No se pudo reservar tu apuesta'],
    ['RELEASED', 'Apuesta liberada'],
    ['CAPTURED', 'Apuesta perdida'],
    ['SETTLED_WON', 'Apuesta ganada'],
  ])('%s -> "%s"', (status, expected) => {
    expect(describeStakeStatus(status)).toBe(expected)
  })

  it('sin apuesta propia no hay nada que contar', () => {
    expect(describeOwnStake(undefined)).toBeNull()
  })

  it('la frase completa lleva el monto y el estado que publico el servidor', () => {
    expect(describeOwnStake({ amount: 10, status: 'ACTIVE' })).toBe(
      'Apuesta reservada: 10 créditos',
    )
    expect(describeOwnStake({ amount: 1, status: 'RELEASED' })).toBe(
      'Se liberó tu apuesta de 1 crédito',
    )
    expect(describeOwnStake({ amount: 10, status: 'CAPTURED' })).toBe(
      'Perdiste tu apuesta de 10 créditos',
    )
    expect(describeOwnStake({ amount: 10, status: 'SETTLED_WON' })).toBe(
      'Apuesta ganada: 10 créditos',
    )
  })
})

describe('ownStakeOf (contrato §10: solo la apuesta propia)', () => {
  it('devuelve la apuesta del sujeto autenticado', () => {
    const room = roomWith([{ playerId: 'sujeto-ana', amount: 10 }, { playerId: 'sujeto-bruno' }])

    expect(ownStakeOf(room, 'sujeto-ana')).toEqual({ amount: 10, status: 'ACTIVE' })
  })

  it('no devuelve la de un rival, y sin sesion no devuelve ninguna', () => {
    const room = roomWith([{ playerId: 'sujeto-ana', amount: 10 }])

    expect(ownStakeOf(room, 'sujeto-bruno')).toBeUndefined()
    expect(ownStakeOf(room, null)).toBeUndefined()
  })
})

describe('parseStakeInput', () => {
  it.each([
    ['', null],
    ['   ', null],
    ['0', null],
    ['1', 1],
    ['250', 250],
    ['1e3', 1000],
  ])('"%s" -> %s', (raw, expected) => {
    expect(parseStakeInput(raw).amount).toBe(expected)
    expect(parseStakeInput(raw).error).toBeNull()
  })

  it.each([['-1'], ['1.5'], ['dos']])('rechaza "%s" con un mensaje', (raw) => {
    const parsed = parseStakeInput(raw)

    expect(parsed.amount).toBeNull()
    expect(parsed.error).not.toBeNull()
  })
})

describe('textos y avisos', () => {
  it('singular y plural de creditos', () => {
    expect(creditAmountText(1)).toBe('1 crédito')
    expect(creditAmountText(10)).toBe('10 créditos')
  })

  it('avisa cuando el monto supera el disponible, sin bloquear', () => {
    expect(availableWarning(10, 5)).toBe('Tu saldo disponible es 5 créditos.')
    expect(availableWarning(5, 5)).toBeNull()
    expect(availableWarning(5, undefined)).toBeNull()
  })

  it('el paso de confirmacion dice cuanto se va a reservar', () => {
    expect(describeStakeReservation(10)).toContain('10 créditos')
    expect(describeStakeReservation(10)).toContain('se reservarán de tu saldo')
  })

  it('la sala tiene apuestas solo si el agregado del servidor lo dice', () => {
    expect(roomHasStakes(roomWith([], 0))).toBe(false)
    expect(roomHasStakes(roomWith([], 20))).toBe(true)
    expect(roomHasStakes(roomWith([]))).toBe(false)
  })
})
