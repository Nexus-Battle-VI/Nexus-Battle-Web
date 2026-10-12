import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

import { useSession } from '@/shared/session'
import type { SocketFactory, TicketProvider } from '../realtime'
import { battleReducer, initialBattleState, type BattleClientState } from './battleReducer'
import {
  ANA,
  BRUNO,
  REANIMATE,
  ROOM_ID,
  SHIELD_STRIKE,
  healSkillUsed,
  skillBattle,
  snapshot,
} from './fixtures'
import { describeLatestAction, skillAvailability } from './skillPresentation'
import {
  isBattleEventMessage,
  isSnapshotMessage,
  isUnrecognizedBattleEvent,
  type BattleView,
  type SkillView,
} from './types'
import { useBattleRealtime } from './useBattleRealtime'

/**
 * EN-031: los fallos de Jugar Online que dejaban la pantalla «vacia» hasta Ctrl+F5 y el
 * desbloqueo de habilidades por nivel.
 */

const LOCKED: SkillView = {
  ...SHIELD_STRIKE,
  abilityId: 'locked-1',
  status: 'LOCKED',
  unlockLevel: 3,
}

const after = (): BattleView =>
  skillBattle(2, [
    [30, 44],
    [44, 44],
  ])

const directDamage = (seq: number, commandId = 'cmd-1'): Record<string, unknown> => ({
  type: 'directDamageSkillUsed',
  seq,
  roomId: ROOM_ID,
  occurredAt: '2026-10-11T10:01:00.000Z',
  commandId,
  completedPosition: 1,
  actor: ANA,
  target: BRUNO,
  skill: {
    abilityId: 'agonia',
    name: 'Agonía',
    powerCost: { mode: 'FIXED', amount: 3 },
    chargeTurns: 1,
  },
  power: { before: 10, after: 7 },
  cooldown: { remainingTurns: 1 },
  damage: { calculatedDamage: 14, appliedDamage: 14 },
  targetHealth: { before: 44, after: 30 },
  battle: after(),
})

const epicUsed = (seq: number): Record<string, unknown> => ({
  type: 'epicUsed',
  seq,
  roomId: ROOM_ID,
  occurredAt: '2026-10-11T10:02:00.000Z',
  commandId: 'ai-epic-1',
  completedPosition: 0,
  actor: BRUNO,
  epic: { epicProductId: 'golpe-de-defensa', name: 'Golpe de defensa' },
  power: { before: 4, after: 4 },
  cooldown: { remainingTurns: 2 },
  appliedEffects: 2,
  battle: after(),
})

const synced = (seq: number): BattleClientState => {
  const message = snapshot(seq, 'IN_BATTLE', skillBattle(1))

  if (!isSnapshotMessage(message)) throw new Error('fixture invalida')

  return battleReducer(battleReducer(initialBattleState, { type: 'snapshot', message }), {
    type: 'synced',
  })
}

const apply = (state: BattleClientState, raw: Record<string, unknown>): BattleClientState => {
  if (isBattleEventMessage(raw)) return battleReducer(state, { type: 'event', message: raw })
  if (isUnrecognizedBattleEvent(raw)) {
    return battleReducer(state, { type: 'unrecognizedEvent', message: raw })
  }

  return state
}

describe('EN-031 — eventos que Web descartaba', () => {
  it('directDamageSkillUsed (Agonia) se acepta, avanza el seq y alimenta el ultimo resultado', () => {
    const state = apply(synced(1), directDamage(2))

    expect(isBattleEventMessage(directDamage(2))).toBe(true)
    expect(state.lastSeq).toBe(2)
    expect(state.battle?.turnsCompleted).toBe(2)
    expect(state.lastEffect).toMatchObject({
      kind: 'directDamage',
      name: 'Agonía',
      appliedDamage: 14,
    })
    expect(
      describeLatestAction(
        state.lastAttack,
        state.lastSkill,
        state.battle!,
        state.lastHealSkill,
        state.lastEffect,
      ),
    ).toMatchObject({ tone: 'damage' })
  })

  it('epicUsed sin objetivo (la epica de la IA) se acepta y no inventa un objetivo', () => {
    const state = apply(synced(1), epicUsed(2))

    expect(state.lastSeq).toBe(2)
    expect(state.lastEffect).toMatchObject({ kind: 'epic', target: null, appliedDamage: null })
  })

  it('un evento de un tipo desconocido con vista valida aplica la vista y el seq (no se congela)', () => {
    const futuro = { ...directDamage(2), type: 'evento-de-un-combat-futuro' }
    const state = apply(synced(1), futuro)

    expect(isBattleEventMessage(futuro)).toBe(false)
    expect(state.lastSeq).toBe(2)
    expect(state.battle?.turnsCompleted).toBe(2)
  })

  it('un tipo CONOCIDO mal formado sigue ignorandose, no se aplica a medias', () => {
    const roto = { ...directDamage(2), damage: { calculatedDamage: -1, appliedDamage: 0 } }
    const state = apply(synced(1), roto)

    expect(isUnrecognizedBattleEvent(roto)).toBe(false)
    expect(state.lastSeq).toBe(1)
  })
})

describe('EN-031 — habilidades bloqueadas por nivel', () => {
  const base = { connection: 'open' as const, synced: true, pending: false, target: BRUNO }

  it('una habilidad LOCKED no se ofrece y dice el nivel y la XP que falta si es el siguiente', () => {
    const availability = skillAvailability({
      ...base,
      skill: LOCKED,
      progress: { currentXp: 180, nextLevel: 3, nextLevelXp: 300 },
    })

    expect(availability.enabled).toBe(false)
    expect(availability.hint).toBe('Se desbloquea en nivel 3 · faltan 120 XP.')
  })

  it('si el desbloqueo no es el siguiente nivel, solo dice el nivel (Web no conoce la tabla de XP)', () => {
    const availability = skillAvailability({
      ...base,
      skill: { ...LOCKED, unlockLevel: 5 },
      progress: { currentXp: 180, nextLevel: 3, nextLevelXp: 300 },
    })

    expect(availability.hint).toBe('Se desbloquea en nivel 5.')
  })

  it('la vista de Combat con status LOCKED es valida (antes invalidaba la batalla entera)', () => {
    const view = skillBattle(1, undefined, [
      { power: [10, 10], skills: [SHIELD_STRIKE, LOCKED] },
      { power: [10, 10], skills: [SHIELD_STRIKE] },
    ])

    expect(isSnapshotMessage(snapshot(1, 'IN_BATTLE', view))).toBe(true)
  })
})

/** Doble minimo de `WebSocket`, como en `useBattleSkill.test.tsx`. */
class FakeSocket extends EventTarget {
  readonly sent: string[] = []

  send(data: string): void {
    this.sent.push(data)
  }

  close(): void {
    this.dispatchEvent(new Event('close'))
  }

  message(data: unknown): void {
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(data) }))
  }

  commands(): Record<string, unknown>[] {
    return this.sent.map((raw) => JSON.parse(raw) as Record<string, unknown>).slice(1)
  }
}

const inBattle = async () => {
  const sockets: FakeSocket[] = []
  const factory: SocketFactory = () => {
    const socket = new FakeSocket()
    sockets.push(socket)
    return socket as unknown as WebSocket
  }
  const tickets = vi.fn<TicketProvider>(() => Promise.resolve('ticket'))
  let ids = 0
  const hook = renderHook(() =>
    useBattleRealtime(ROOM_ID, factory, tickets, () => `cmd-${String((ids += 1))}`),
  )

  await waitFor(() => {
    expect(sockets).toHaveLength(1)
  })
  const socket = sockets[0]!
  act(() => {
    socket.dispatchEvent(new Event('open'))
    socket.message({ type: 'auth.ok' })
    socket.message(snapshot(1, 'IN_BATTLE', skillBattle(1)))
    socket.message({ type: 'resume.ok', roomId: ROOM_ID, seq: 1 })
  })

  return { ...hook, socket }
}

describe('EN-031 — la intencion de habilidad se cierra con TODO resultado', () => {
  beforeEach(() => {
    useSession.setState({
      subject: 'sujeto-ana',
      accessToken: 'token-vigente',
      expiresAt: Date.now() + 900_000,
    })
  })

  afterEach(() => {
    useSession.setState({ subject: null, accessToken: null, expiresAt: null })
  })

  it('tras una curacion (healSkillUsed) la barra vuelve a aceptar acciones', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendSkill(REANIMATE.abilityId, ANA)
    })
    expect(result.current.skill.intent?.commandId).toBe('cmd-1')

    act(() => {
      socket.message(
        healSkillUsed({
          seq: 2,
          commandId: 'cmd-1',
          actor: ANA,
          target: ANA,
          power: { before: 10, after: 6 },
          heal: 4,
          before: 40,
          after: 44,
          view: after(),
        }),
      )
    })

    expect(result.current.skill.intent).toBeNull()
  })

  it('tras Agonia (directDamageSkillUsed) la intencion se cierra', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendSkill('agonia', BRUNO)
    })
    act(() => {
      socket.message(directDamage(2, 'cmd-1'))
    })

    expect(result.current.skill.intent).toBeNull()
    expect(result.current.lastSeq).toBe(2)
  })

  it('un INTERNAL_ERROR de resume no deja la batalla inaccesible: pide la instantanea completa', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      socket.message({ type: 'command.rejected', code: 'INTERNAL_ERROR' })
    })

    expect(result.current.rejected).toBeNull()
    expect(socket.commands().at(-1)).toEqual({ type: 'resume', roomId: ROOM_ID })
  })

  it('un rechazo de habilidad se descarta al cambiar el turno', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendSkill(SHIELD_STRIKE.abilityId, BRUNO)
    })
    act(() => {
      socket.message({
        type: 'command.rejected',
        command: 'useSkill',
        commandId: 'cmd-1',
        code: 'SKILL_LOCKED',
      })
    })
    expect(result.current.skill.rejection).toBe('SKILL_LOCKED')

    act(() => {
      socket.message({
        type: 'turnAdvanced',
        seq: 2,
        roomId: ROOM_ID,
        occurredAt: '2026-10-11T10:03:00.000Z',
        completedPosition: 1,
        battle: after(),
      })
    })

    expect(result.current.skill.rejection).toBeNull()
  })
})
